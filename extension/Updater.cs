using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows;

namespace MyVLibrary
{
    /// <summary>
    /// Asks GitHub for the latest release of MyVLibrary. When it is newer than the one installed, a Playnite
    /// notification offers it: clicking it downloads the .pext and hands it to Playnite, which asks to install it.
    /// </summary>
    internal static class Updater
    {
        private const string Repo = "BigBan0511/MyVLibrary";
        private const string NotificationId = "MyVLibrary.update";
        private static readonly ILogger logger = LogManager.GetLogger();
        private static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };

        public class GhAsset
        {
            [SerializationPropertyName("name")] public string Name { get; set; }
            [SerializationPropertyName("browser_download_url")] public string Url { get; set; }
        }

        public class GhRelease
        {
            [SerializationPropertyName("tag_name")] public string Tag { get; set; }
            [SerializationPropertyName("html_url")] public string Page { get; set; }
            [SerializationPropertyName("assets")] public List<GhAsset> Assets { get; set; }
        }

        /// <summary>The version this DLL was built as (it comes from extension.yaml).</summary>
        public static Version Installed => Normalize(typeof(Updater).Assembly.GetName().Version);

        private static Version Normalize(Version v) => v == null ? new Version(0, 0, 0) : new Version(v.Major, v.Minor, Math.Max(0, v.Build));

        private static Version Parse(string tag)
        {
            var s = (tag ?? "").Trim().TrimStart('v', 'V');
            var cut = s.IndexOfAny(new[] { '-', '+', ' ' });
            if (cut > 0) s = s.Substring(0, cut);
            if (s.IndexOf('.') < 0) s += ".0";
            return Version.TryParse(s, out var v) ? Normalize(v) : null;
        }

        private static async Task<GhRelease> Latest()
        {
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.github.com/repos/{Repo}/releases/latest");
            req.Headers.TryAddWithoutValidation("User-Agent", "MyVLibrary/" + Installed);
            req.Headers.TryAddWithoutValidation("Accept", "application/vnd.github+json");
            using (var res = await http.SendAsync(req).ConfigureAwait(false))
            {
                // 404: the repository has no release yet
                if (res.StatusCode == HttpStatusCode.NotFound) return null;
                res.EnsureSuccessStatusCode();
                return Serialization.FromJson<GhRelease>(await res.Content.ReadAsStringAsync().ConfigureAwait(false));
            }
        }

        /// <summary>
        /// Checks GitHub. Quietly does nothing on failure unless <paramref name="manual"/> (the menu entry), which also
        /// says when there is nothing new.
        /// </summary>
        public static async Task Check(IPlayniteAPI api, bool manual)
        {
            GhRelease rel;
            try
            {
                rel = await Latest().ConfigureAwait(false);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido buscar actualizaciones");
                if (manual) OnUi(api, () => api.Dialogs.ShowErrorMessage(Loc.S("No se ha podido consultar GitHub:\n", "Could not reach GitHub:\n") + e.Message, "MyVLibrary"));
                return;
            }
            OnUi(api, () => Offer(api, rel, manual));
        }

        private static void OnUi(IPlayniteAPI api, Action a)
        {
            try { api.MainView.UIDispatcher.Invoke(a); }
            catch (Exception e) { logger.Error(e, "MyVLibrary: aviso de actualización"); }
        }

        private static void Offer(IPlayniteAPI api, GhRelease rel, bool manual)
        {
            var latest = Parse(rel?.Tag);
            if (latest == null || latest <= Installed)
            {
                if (manual) api.Dialogs.ShowMessage(Loc.S($"Tienes la última versión ({Installed}).", $"You have the latest version ({Installed})."), "MyVLibrary");
                return;
            }

            logger.Info($"MyVLibrary: hay una versión nueva, {latest} (tienes la {Installed})");
            if (manual)
            {
                var ask = Loc.S($"MyVLibrary {latest} ya está disponible (tienes la {Installed}). ¿Descargarla e instalarla ahora?",
                                $"MyVLibrary {latest} is out (you have {Installed}). Download and install it now?");
                if (api.Dialogs.ShowMessage(ask, "MyVLibrary", MessageBoxButton.YesNo) == MessageBoxResult.Yes) Install(api, rel, latest);
                return;
            }
            api.Notifications.Remove(NotificationId);
            api.Notifications.Add(new NotificationMessage(
                NotificationId,
                Loc.S($"MyVLibrary {latest} ya está disponible (tienes la {Installed}). Haz clic aquí para instalarla.",
                      $"MyVLibrary {latest} is out (you have {Installed}). Click here to install it."),
                NotificationType.Info,
                () => Install(api, rel, latest)));
        }

        /// <summary>Downloads the release's .pext and opens it, which makes Playnite ask whether to install it.</summary>
        private static void Install(IPlayniteAPI api, GhRelease rel, Version latest)
        {
            var asset = rel.Assets?.FirstOrDefault(a => a.Name != null && a.Name.EndsWith(".pext", StringComparison.OrdinalIgnoreCase));
            if (asset == null)
            {
                // a release without the package: let the person get it from the page
                OpenUrl(rel.Page ?? $"https://github.com/{Repo}/releases/latest");
                return;
            }

            var dir = Path.Combine(Path.GetTempPath(), "MyVLibrary");
            var file = Path.Combine(dir, Path.GetFileName(asset.Name));
            Exception failed = null;
            api.Dialogs.ActivateGlobalProgress(p =>
            {
                try
                {
                    Directory.CreateDirectory(dir);
                    ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                    var req = new HttpRequestMessage(HttpMethod.Get, asset.Url);
                    req.Headers.TryAddWithoutValidation("User-Agent", "MyVLibrary/" + Installed);
                    using (var res = http.SendAsync(req).GetAwaiter().GetResult())
                    {
                        res.EnsureSuccessStatusCode();
                        var tmp = file + ".part";
                        using (var outFile = File.Create(tmp))
                        {
                            res.Content.CopyToAsync(outFile).GetAwaiter().GetResult();
                        }
                        if (File.Exists(file)) File.Delete(file);
                        File.Move(tmp, file);
                    }
                }
                catch (Exception e)
                {
                    failed = e;
                }
            }, new GlobalProgressOptions(Loc.S($"Descargando MyVLibrary {latest}…", $"Downloading MyVLibrary {latest}…"), false) { IsIndeterminate = true });

            if (failed != null)
            {
                logger.Error(failed, "MyVLibrary: no se ha podido descargar la actualización");
                api.Dialogs.ShowErrorMessage(Loc.S("No se ha podido descargar la actualización:\n", "Could not download the update:\n") + failed.Message, "MyVLibrary");
                return;
            }

            api.Notifications.Remove(NotificationId);
            try
            {
                // .pext files belong to Playnite: opening one makes it offer to install the extension
                Process.Start(new ProcessStartInfo(file) { UseShellExecute = true });
            }
            catch (Exception e)
            {
                // a portable Playnite has no file association: show the file so it can be dragged onto Playnite
                logger.Warn(e, "MyVLibrary: no se ha podido abrir el .pext");
                try { Process.Start("explorer.exe", $"/select,\"{file}\""); } catch { }
                api.Dialogs.ShowMessage(Loc.S("Arrastra el archivo .pext que se acaba de abrir a la ventana de Playnite para instalarlo.",
                                              "Drag the .pext file that just opened onto the Playnite window to install it."), "MyVLibrary");
            }
        }

        private static void OpenUrl(string url)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
            catch (Exception e) { logger.Warn(e, "MyVLibrary: no se ha podido abrir " + url); }
        }
    }
}
