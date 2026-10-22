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
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MyVLibrary
{
    /// <summary>
    /// Plays a film or an episode from Jellyfin outside the shelf and says when it ends:
    /// - The system's player: Windows opens the stream with whatever plays videos; the extension counts how
    ///   long its window stays open and tells Jellyfin.
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
        private List<Process> sysPlayers;

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
                    else await PlaySystem(itemId, startTicks, started, cts.Token).ConfigureAwait(false);
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

        /// <summary>Pulled out by hand: the player closes.</summary>
        public void Stop()
        {
            var cts = run; run = null;
            if (cts == null) return;
            try { cts.Cancel(); } catch { }
            try { if (vlc != null && !vlc.HasExited) vlc.Kill(); } catch { }
            foreach (var p in sysPlayers ?? new List<Process>()) { try { if (!p.HasExited) p.CloseMainWindow(); } catch { } }
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

        // ---------- the system's own player ----------

        [DllImport("Shlwapi.dll", CharSet = CharSet.Unicode)]
        private static extern uint AssocQueryString(uint flags, uint str, string assoc, string extra, StringBuilder outBuf, ref uint outLen);

        /// <summary>The program Windows opens a kind of file with (empty for some store apps).</summary>
        private static string AssociatedExe(string ext)
        {
            try
            {
                uint len = 1024; var sb = new StringBuilder((int)len);
                return AssocQueryString(0, 2 /* ASSOCSTR_EXECUTABLE */, ext, null, sb, ref len) == 0 ? sb.ToString() : null;
            }
            catch { return null; }
        }

        private static bool HasWindow(Process p) { try { return !p.HasExited && p.MainWindowHandle != IntPtr.Zero; } catch { return false; } }

        /// <summary>
        /// The stream goes in a small playlist that Windows opens with whatever plays videos on this computer
        /// (Media Player, or the one chosen for playlists). Such a player says nothing about where it is, so the
        /// position is the time its window stays open, counted from where it started; a pause counts as watching.
        /// It is over when the window of the player that opened it closes.
        /// </summary>
        private async Task PlaySystem(string itemId, long startTicks, Action started, CancellationToken ct)
        {
            var item = await jf.Item(itemId).ConfigureAwait(false);
            var dir = Path.Combine(Path.GetTempPath(), "MyVLibrary");
            Directory.CreateDirectory(dir);
            var list = Path.Combine(dir, "jellyfin.m3u");
            File.WriteAllText(list, "#EXTM3U\r\n#EXTINF:-1," + (item?.Name ?? "Jellyfin").Replace('\r', ' ').Replace('\n', ' ') + "\r\n" + jf.StreamUrl(itemId, startTicks) + "\r\n", Encoding.Default);
            var before = new HashSet<int>(Process.GetProcesses().Select(p => p.Id));
            var launchedAt = DateTime.Now;
            var first = Process.Start(new ProcessStartInfo(list) { UseShellExecute = true });
            /* the player's window: a program started for it, or the one that was already open and took it */
            var watch = new List<Process>();
            var self = Process.GetCurrentProcess().Id;
            for (var i = 0; i < 20 && watch.Count == 0; i++)
            {
                await Task.Delay(1000, ct).ConfigureAwait(false);
                if (first != null && HasWindow(first)) watch.Add(first);
                watch.AddRange(Process.GetProcesses().Where(p => !before.Contains(p.Id) && HasWindow(p) && p.Id != self));
            }
            if (watch.Count == 0)
            {
                var exe = AssociatedExe(".m3u");
                if (!string.IsNullOrEmpty(exe)) watch.AddRange(Process.GetProcessesByName(Path.GetFileNameWithoutExtension(exe)).Where(HasWindow));
            }
            if (watch.Count == 0) throw new PlayerMissingException(Loc.S("No se ha abierto ningún reproductor. Comprueba qué programa abre las listas .m3u en Windows o elige VLC.", "No player opened. Check which program opens .m3u playlists in Windows, or choose VLC."));
            sysPlayers = watch;
            var playSession = Guid.NewGuid().ToString("N");
            var runtime = item?.RunTimeTicks ?? long.MaxValue;
            long Position() => Math.Min(runtime, startTicks + (DateTime.Now - launchedAt).Ticks);
            launchedAt = DateTime.Now;
            started();
            try { await jf.Report("start", itemId, startTicks, false, playSession).ConfigureAwait(false); } catch { }
            var lastReport = DateTime.Now;
            while (watch.Any(HasWindow) && !ct.IsCancellationRequested)
            {
                try { await Task.Delay(2000, ct).ConfigureAwait(false); } catch (OperationCanceledException) { break; }
                if (DateTime.Now - lastReport > TimeSpan.FromSeconds(10))
                {
                    lastReport = DateTime.Now;
                    try { await jf.Report("progress", itemId, Position(), false, playSession).ConfigureAwait(false); } catch { }
                }
            }
            /* closed: Jellyfin works out from the position whether it counts as watched */
            try { await jf.Report("stopped", itemId, Position(), false, playSession).ConfigureAwait(false); } catch (Exception e) { logger.Warn(e, "MyVLibrary: Jellyfin no ha aceptado el final de la reproducción"); }
            sysPlayers = null;
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
