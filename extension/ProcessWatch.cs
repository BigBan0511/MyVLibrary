using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

namespace MyVLibrary
{
    /// <summary>
    /// Finds the programs running from a game's folder. Some games hand over to another program
    /// and Playnite then thinks they have closed; this is how the shelf notices they are still open.
    /// </summary>
    internal static class ProcessWatch
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint access, bool inherit, int pid);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool QueryFullProcessImageName(IntPtr handle, int flags, StringBuilder name, ref int size);

        private const uint QueryLimitedInformation = 0x1000;

        /// <summary>Launchers and stores never count as the game, even when installed inside its folder.</summary>
        private static readonly HashSet<string> Launchers = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "steam", "steamwebhelper", "steamservice", "epicgameslauncher", "epicwebhelper", "galaxyclient", "galaxyclient helper",
            "gogalaxy", "upc", "ubisoftconnect", "ubisoftgamelauncher", "eadesktop", "eabackgroundservice", "origin", "originwebhelperservice",
            "battle.net", "agent", "riotclientservices", "riotclientux", "itch", "amazon games", "playnite.desktopapp", "playnite.fullscreenapp"
        };

        /// <summary>
        /// The folder to watch, ending in a separator, or null when there is none or it is too broad to mean one game
        /// (a drive root, or a folder right below it such as «C:\Games»).
        /// </summary>
        public static string Folder(string dir)
        {
            if (string.IsNullOrWhiteSpace(dir)) return null;
            try
            {
                var full = Path.GetFullPath(dir.Trim()).TrimEnd('\\', '/');
                if (!Directory.Exists(full)) return null;
                var root = (Path.GetPathRoot(full) ?? "").TrimEnd('\\', '/');
                var parts = full.Substring(root.Length).Split(new[] { '\\', '/' }, StringSplitOptions.RemoveEmptyEntries);
                return parts.Length < 2 ? null : full + "\\";
            }
            catch
            {
                return null;
            }
        }

        private static string ImagePath(int pid)
        {
            var handle = OpenProcess(QueryLimitedInformation, false, pid);
            if (handle == IntPtr.Zero) return null;
            try
            {
                var size = 1024;
                var name = new StringBuilder(size);
                return QueryFullProcessImageName(handle, 0, name, ref size) ? name.ToString(0, size) : null;
            }
            finally
            {
                CloseHandle(handle);
            }
        }

        /// <summary>The ids of the processes whose program lives inside <paramref name="folder"/>.</summary>
        public static HashSet<int> In(string folder)
        {
            var found = new HashSet<int>();
            if (folder == null) return found;
            int self;
            using (var me = Process.GetCurrentProcess()) self = me.Id;
            foreach (var p in Process.GetProcesses())
            {
                try
                {
                    if (p.Id <= 4 || p.Id == self) continue;
                    var name = p.ProcessName;
                    if (Launchers.Contains(name) || name.IndexOf("crash", StringComparison.OrdinalIgnoreCase) >= 0 || name.StartsWith("unins", StringComparison.OrdinalIgnoreCase)) continue;
                    var path = ImagePath(p.Id);
                    if (path != null && path.StartsWith(folder, StringComparison.OrdinalIgnoreCase)) found.Add(p.Id);
                }
                catch
                {
                    // the process ended while we looked, or it is protected
                }
                finally
                {
                    p.Dispose();
                }
            }

            return found;
        }
    }
}
