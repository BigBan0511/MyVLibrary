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
            IsThisComputer(s.DeviceName);

        /// <summary>The player names the computer by its full host name; Windows' own name is cut to 15 letters.</summary>
        private static bool IsThisComputer(string name)
        {
            if (string.IsNullOrEmpty(name)) return false;
            string host;
            try { host = Dns.GetHostName(); } catch { host = Environment.MachineName; }
            return string.Equals(name, host, StringComparison.OrdinalIgnoreCase) || string.Equals(name, Environment.MachineName, StringComparison.OrdinalIgnoreCase) ||
                   name.StartsWith(Environment.MachineName, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>This computer's Jellyfin Desktop, the one ready to take orders and most recently active first.</summary>
        private async Task<JfSession> DesktopSession() =>
            (await jf.Sessions().ConfigureAwait(false)).Where(IsDesktopClient)
                .OrderByDescending(s => s.SupportsMediaControl).ThenByDescending(s => s.LastActivityDate ?? DateTime.MinValue).FirstOrDefault();

        private async Task PlayJellyfinDesktop(string itemId, long startTicks, Action started, CancellationToken ct)
        {
            jmpSession = null;
            var exe = FindJellyfinDesktop(settings);
            JfSession session = null;
            try { session = await DesktopSession().ConfigureAwait(false); } catch { }
            var launched = false;
            void Launch()
            {
                if (exe == null) throw new PlayerMissingException(Loc.S("No encuentro Jellyfin Desktop. Indica dónde está en los ajustes de MyVLibrary.", "Jellyfin Desktop was not found. Set its location in MyVLibrary's settings."));
                launched = true;
                if (Process.GetProcessesByName(Path.GetFileNameWithoutExtension(exe)).Length > 0) return;
                Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(exe) });
            }
            if (session == null) Launch();
            /* The program shows up on the server before its player is listening, so an order sent too soon is lost:
               it is sent again every few seconds until the episode is playing. A session left behind by a program
               already closed does not answer either: then the program is started. */
            var since = DateTime.Now;
            var lastSend = DateTime.MinValue;
            var sends = 0;
            DateTime? appeared = null;
            var seen = false;
            for (var misses = 0; ; )
            {
                await Task.Delay(seen ? 3000 : 1000, ct).ConfigureAwait(false);
                JfSession now;
                try { now = seen ? (await jf.Sessions().ConfigureAwait(false)).FirstOrDefault(s => s.Id == session.Id) : await DesktopSession().ConfigureAwait(false); misses = 0; }
                catch { if (++misses > 5) break; continue; }
                if (seen)
                {
                    /* playing until that session plays something else or nothing (or the program closes) */
                    if (now?.NowPlayingItem?.Id != itemId) break;
                    continue;
                }
                if (now != null && now.NowPlayingItem?.Id == itemId) { session = now; jmpSession = now.Id; seen = true; started(); continue; }
                if (DateTime.Now - since > TimeSpan.FromSeconds(90))
                {
                    if (now == null) throw new PlayerMissingException(Loc.S("Jellyfin Desktop no se ha conectado a tu servidor con tu usuario.", "Jellyfin Desktop did not connect to your server with your user."));
                    break;
                }
                if (now == null) { if (!launched) Launch(); continue; }
                session = now; jmpSession = now.Id;
                /* just connected: a moment for its player to load */
                if (appeared == null) appeared = DateTime.Now;
                if (launched && sends == 0 && DateTime.Now - appeared < TimeSpan.FromSeconds(4)) continue;
                if (DateTime.Now - lastSend < TimeSpan.FromSeconds(6)) continue;
                if (sends == 2 && !launched) Launch();
                lastSend = DateTime.Now; sends++;
                try { await jf.PlayOn(now.Id, itemId, startTicks).ConfigureAwait(false); }
                catch (Exception e) { logger.Warn(e, "MyVLibrary: Jellyfin Desktop no ha aceptado la orden de reproducir"); }
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
            /* a VLC of its own: with "one instance only" on, a new VLC hands the file to the one already open and
               quits at once, and that looked as if the film had ended */
            var args = $"\"{jf.StreamUrl(itemId)}\" --no-one-instance --no-playlist-enqueue --start-time={startSec} --fullscreen --play-and-exit --no-video-title-show " +
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
                /* it is over when VLC has closed and its web interface no longer answers (or after the film,
                   when it says it has stopped) */
                var stoppedPolls = 0;
                for (var gone = 0; gone < 2 && !ct.IsCancellationRequested; )
                {
                    try { await Task.Delay(2000, ct).ConfigureAwait(false); } catch (OperationCanceledException) { break; }
                    try
                    {
                        var st = Serialization.FromJson<VlcStatus>(await http.GetStringAsync($"http://127.0.0.1:{port}/requests/status.json").ConfigureAwait(false));
                        gone = 0;
                        stoppedPolls = seen && st?.state == "stopped" ? stoppedPolls + 1 : 0;
                        if (stoppedPolls >= 3) break;
                        if (st?.time != null && st.time > 0) position = (long)(st.time.Value * 10000000);
                        if (!seen && st?.state == "playing") { seen = true; started(); await jf.Report("start", itemId, position, false, playSession).ConfigureAwait(false); }
                        if (seen && DateTime.Now - lastReport > TimeSpan.FromSeconds(10)) { lastReport = DateTime.Now; await jf.Report("progress", itemId, position, st?.state == "paused", playSession).ConfigureAwait(false); }
                    }
                    catch
                    {
                        /* VLC still starting, or closing */
                        if (vlc.HasExited) gone++;
                        else if (!seen && DateTime.Now - vlc.StartTime > TimeSpan.FromSeconds(60)) break;
                    }
                }
            }
            /* closed: Jellyfin works out from the position whether it counts as watched */
            try { await jf.Report("stopped", itemId, position, false, playSession).ConfigureAwait(false); } catch (Exception e) { logger.Warn(e, "MyVLibrary: Jellyfin no ha aceptado el final de la reproducción"); }
            vlc = null;
        }

        private class PlayerMissingException : Exception { public PlayerMissingException(string m) : base(m) { } }
    }
}
