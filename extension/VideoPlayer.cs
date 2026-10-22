using Microsoft.Win32;
using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MyVLibrary
{
    /// <summary>
    /// Plays a film or an episode from Jellyfin outside the shelf and says when it ends:
    /// - Jellyfin Desktop / Jellyfin Media Player: started (or found running), then told to play the item
    ///   through Jellyfin's remote control; it reports its own progress to Jellyfin.
    /// - VLC: started on the stream with its little web interface on; the extension reads how far it is
    ///   and tells Jellyfin, so "where you left off" works there too.
    /// </summary>
    internal class VideoPlayer
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private readonly JellyfinClient jf;
        private readonly ShelfSettings settings;
        private CancellationTokenSource run;
        private Process vlc;
        private string jmpSession;

        public VideoPlayer(JellyfinClient jf, ShelfSettings settings)
        {
            this.jf = jf;
            this.settings = settings;
        }

        public bool Busy => run != null;

        /// <summary>started(): it is playing. stopped(position, played): it has finished or been closed. failed(reason).</summary>
        public void Play(string itemId, long startTicks, Action started, Action<long?, bool> stopped, Action<string> failed)
        {
            Stop();
            var cts = run = new CancellationTokenSource();
            var useVlc = settings.JellyfinPlayer == "vlc";
            Task.Run(async () =>
            {
                try
                {
                    if (useVlc) await PlayVlc(itemId, startTicks, started, cts.Token).ConfigureAwait(false);
                    else await PlayJellyfinDesktop(itemId, startTicks, started, cts.Token).ConfigureAwait(false);
                    var final = await Final(itemId).ConfigureAwait(false);
                    stopped(final.Item1, final.Item2);
                }
                catch (OperationCanceledException)
                {
                    var final = await Final(itemId).ConfigureAwait(false);
                    stopped(final.Item1, final.Item2);
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: no se ha podido reproducir " + itemId);
                    failed(e is PlayerMissingException ? e.Message : Loc.S("No se ha podido abrir el reproductor.", "Could not start the player."));
                }
                finally
                {
                    if (run == cts) run = null;
                }
            });
        }

        /// <summary>Pulled out by hand: the player stops (VLC closes, Jellyfin Desktop stops playing).</summary>
        public void Stop()
        {
            var cts = run; run = null;
            if (cts == null) return;
            try { cts.Cancel(); } catch { }
            try { if (vlc != null && !vlc.HasExited) vlc.Kill(); } catch { }
            if (jmpSession != null) { var s = jmpSession; Task.Run(() => jf.StopOn(s)); }
        }

        /// <summary>Where the item ended up, as Jellyfin keeps it: position and whether it counts as watched.</summary>
        private async Task<Tuple<long?, bool>> Final(string itemId)
        {
            try
            {
                await Task.Delay(1200).ConfigureAwait(false);
                var it = await jf.Item(itemId).ConfigureAwait(false);
                return Tuple.Create((long?)(it?.UserData?.PlaybackPositionTicks ?? 0), it?.UserData?.Played ?? false);
            }
            catch
            {
                return Tuple.Create((long?)null, false);
            }
        }

        // ---------- Jellyfin Desktop / Jellyfin Media Player ----------

        internal static string FindJellyfinDesktop(ShelfSettings s)
        {
            var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            var pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            var candidates = new[]
            {
                s.JellyfinPlayerPath,
                Path.Combine(local, "Programs", "Jellyfin Desktop", "Jellyfin Desktop.exe"),
                Path.Combine(pf, "Jellyfin", "Jellyfin Desktop", "Jellyfin Desktop.exe"),
                Path.Combine(pf, "Jellyfin", "Jellyfin Media Player", "JellyfinMediaPlayer.exe"),
                Path.Combine(pf86, "Jellyfin", "Jellyfin Media Player", "JellyfinMediaPlayer.exe"),
                Path.Combine(local, "Programs", "Jellyfin Media Player", "JellyfinMediaPlayer.exe")
            };
            return candidates.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p) && File.Exists(p));
        }

        private static bool IsDesktopClient(JfSession s) =>
            s.SupportsRemoteControl && (s.Client ?? "").IndexOf("Jellyfin", StringComparison.OrdinalIgnoreCase) >= 0 &&
            ((s.Client ?? "").IndexOf("Desktop", StringComparison.OrdinalIgnoreCase) >= 0 || (s.Client ?? "").IndexOf("Media Player", StringComparison.OrdinalIgnoreCase) >= 0) &&
            string.Equals(s.DeviceName, Environment.MachineName, StringComparison.OrdinalIgnoreCase);

        private async Task PlayJellyfinDesktop(string itemId, long startTicks, Action started, CancellationToken ct)
        {
            jmpSession = null;
            var session = (await jf.Sessions().ConfigureAwait(false)).FirstOrDefault(IsDesktopClient);
            Process proc = null;
            if (session == null)
            {
                var exe = FindJellyfinDesktop(settings);
                if (exe == null) throw new PlayerMissingException(Loc.S("No encuentro Jellyfin Desktop. Indica dónde está en los ajustes de MyVLibrary.", "Jellyfin Desktop was not found. Set its location in MyVLibrary's settings."));
                proc = Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(exe) });
                /* it has to start and connect to the server before it can be told what to play */
                for (var i = 0; i < 60 && session == null; i++)
                {
                    await Task.Delay(1000, ct).ConfigureAwait(false);
                    session = (await jf.Sessions().ConfigureAwait(false)).FirstOrDefault(IsDesktopClient);
                }
                if (session == null) throw new PlayerMissingException(Loc.S("Jellyfin Desktop no se ha conectado a tu servidor con tu usuario.", "Jellyfin Desktop did not connect to your server with your user."));
            }
            jmpSession = session.Id;
            await jf.PlayOn(session.Id, itemId, startTicks).ConfigureAwait(false);
            /* playing until that session plays something else or nothing (or the program closes) */
            var seen = false;
            var since = DateTime.Now;
            for (var misses = 0; ; )
            {
                await Task.Delay(seen ? 3000 : 1000, ct).ConfigureAwait(false);
                JfSession now = null;
                try { now = (await jf.Sessions().ConfigureAwait(false)).FirstOrDefault(s => s.Id == session.Id); misses = 0; }
                catch { if (++misses > 5) break; continue; }
                var playing = now?.NowPlayingItem?.Id == itemId;
                if (playing && !seen) { seen = true; started(); }
                if (seen && !playing) break;
                /* it never started: the program closed, or nothing happened for a minute and a half */
                if (!seen && ((now == null && (proc == null || proc.HasExited)) || DateTime.Now - since > TimeSpan.FromSeconds(90))) break;
            }
            jmpSession = null;
        }

        // ---------- VLC ----------

        internal static string FindVlc(ShelfSettings s)
        {
            if (!string.IsNullOrWhiteSpace(s.VlcPath) && File.Exists(s.VlcPath)) return s.VlcPath;
            foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                try
                {
                    using (var key = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view).OpenSubKey(@"SOFTWARE\VideoLAN\VLC"))
                    {
                        var dir = key?.GetValue("InstallDir") as string;
                        if (!string.IsNullOrEmpty(dir) && File.Exists(Path.Combine(dir, "vlc.exe"))) return Path.Combine(dir, "vlc.exe");
                    }
                }
                catch { }
            }
            foreach (var pf in new[] { Environment.SpecialFolder.ProgramFiles, Environment.SpecialFolder.ProgramFilesX86 })
            {
                var p = Path.Combine(Environment.GetFolderPath(pf), "VideoLAN", "VLC", "vlc.exe");
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static int FreePort()
        {
            var l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            var port = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
        }

        private class VlcStatus { public string state { get; set; } public double? time { get; set; } public double? length { get; set; } }

        private async Task PlayVlc(string itemId, long startTicks, Action started, CancellationToken ct)
        {
            var exe = FindVlc(settings);
            if (exe == null) throw new PlayerMissingException(Loc.S("No encuentro VLC. Indica dónde está en los ajustes de MyVLibrary.", "VLC was not found. Set its location in MyVLibrary's settings."));
            var port = FreePort();
            var password = Guid.NewGuid().ToString("N");
            var startSec = (long)(startTicks / 10000000);
            var args = $"\"{jf.StreamUrl(itemId)}\" --start-time={startSec} --fullscreen --play-and-exit --no-video-title-show " +
                       $"--extraintf=http --http-host=127.0.0.1 --http-port={port} --http-password={password}";
            vlc = Process.Start(new ProcessStartInfo(exe, args) { UseShellExecute = false });
            var playSession = Guid.NewGuid().ToString("N");
            var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes(":" + password));
            long position = startTicks;
            var seen = false;
            var lastReport = DateTime.MinValue;
            using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) })
            {
                http.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Basic " + auth);
                while (!vlc.HasExited && !ct.IsCancellationRequested)
                {
                    try { await Task.Delay(2000, ct).ConfigureAwait(false); } catch (OperationCanceledException) { break; }
                    try
                    {
                        var st = Serialization.FromJson<VlcStatus>(await http.GetStringAsync($"http://127.0.0.1:{port}/requests/status.json").ConfigureAwait(false));
                        if (st?.time != null && st.time > 0) position = (long)(st.time.Value * 10000000);
                        if (!seen && st?.state == "playing") { seen = true; started(); await jf.Report("start", itemId, position, false, playSession).ConfigureAwait(false); }
                        if (seen && DateTime.Now - lastReport > TimeSpan.FromSeconds(10)) { lastReport = DateTime.Now; await jf.Report("progress", itemId, position, st?.state == "paused", playSession).ConfigureAwait(false); }
                    }
                    catch { /* VLC still starting, or closing */ }
                }
            }
            /* closed: Jellyfin works out from the position whether it counts as watched */
            try { await jf.Report("stopped", itemId, position, false, playSession).ConfigureAwait(false); } catch (Exception e) { logger.Warn(e, "MyVLibrary: Jellyfin no ha aceptado el final de la reproducción"); }
            vlc = null;
        }

        private class PlayerMissingException : Exception { public PlayerMissingException(string m) : base(m) { } }
    }
}
