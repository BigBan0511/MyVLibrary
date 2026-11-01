using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace MyVLibrary
{
    /// <summary>
    /// The game's real manual, read as a booklet in the shelf: a PDF picked in the card (kept in the game's
    /// ExtraMetadata folder as Manual.pdf, next to its case pictures), or else the one in Playnite's own
    /// Manual field, as a file or a web address. The page asks for it at https://media.myvlibrary/manual/{id}.
    /// </summary>
    public partial class LibraryBridge
    {
        private const string ManualFile = "Manual.pdf";
        private const long ManualMax = 400L * 1024 * 1024;

        private string OwnManual(Guid id) => Path.Combine(ExtraRoot, id.ToString(), ManualFile);

        /// <summary>What the game record says about its manual: a version to ask for it by, and whether it is the one picked here.</summary>
        private object ManualOf(Game g)
        {
            try
            {
                var own = OwnManual(g.Id);
                if (File.Exists(own)) return new Dictionary<string, object> { ["v"] = "x" + File.GetLastWriteTimeUtc(own).Ticks.ToString("x"), ["own"] = true };
                var m = g.Manual?.Trim();
                if (string.IsNullOrEmpty(m)) return null;
                var web = m.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || m.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
                /* a file has to be a PDF; a web address may just serve one */
                if (!web && !m.Split('?', '#')[0].EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)) return null;
                return new Dictionary<string, object> { ["v"] = "p" + Hash(m), ["own"] = false };
            }
            catch
            {
                return null;
            }
        }

        /// <summary>The manual's bytes for the page (on a worker thread, from LoadMedia).</summary>
        private MediaFile LoadManual(Guid id)
        {
            var g = Db.Games.Get(id);
            if (g == null) return null;
            string path = null;
            var own = OwnManual(id);
            if (File.Exists(own)) path = own;
            else if (!string.IsNullOrWhiteSpace(g.Manual))
            {
                var m = g.Manual.Trim();
                try { m = api.ExpandGameVariables(g, m); } catch { }
                if (Uri.TryCreate(m, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps)) path = DownloadManual(u);
                else
                {
                    var full = Path.IsPathRooted(m) ? m : null;
                    if (full == null) { try { full = Db.GetFullFilePath(m); } catch { } }
                    if ((full == null || !File.Exists(full)) && !string.IsNullOrEmpty(g.InstallDirectory)) full = Path.Combine(g.InstallDirectory, m);
                    if (full != null && File.Exists(full)) path = full;
                }
            }

            if (path == null || new FileInfo(path).Length > ManualMax) return null;
            return new MediaFile { Bytes = File.ReadAllBytes(path), ContentType = "application/pdf" };
        }

        /// <summary>A manual on the web is downloaded once and kept with the other downloaded files.</summary>
        private string DownloadManual(Uri uri)
        {
            var url = uri.ToString();
            var file = Path.Combine(RemoteDir, Hash(url) + Hash(url + "#") + ".pdf");
            if (File.Exists(file)) return file;
            var tmp = file + ".part";
            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                var req = (HttpWebRequest)WebRequest.Create(uri);
                req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Playnite MyVLibrary";
                req.Timeout = 30000;
                req.ReadWriteTimeout = 120000;
                using (var res = (HttpWebResponse)req.GetResponse())
                using (var input = res.GetResponseStream())
                using (var output = File.Create(tmp))
                {
                    var buffer = new byte[81920];
                    long total = 0;
                    int read;
                    while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        total += read;
                        if (total > ManualMax) throw new IOException("demasiado grande");
                        output.Write(buffer, 0, read);
                    }
                }

                /* only a PDF stays: it starts with %PDF */
                var head = new byte[5];
                using (var f = File.OpenRead(tmp)) f.Read(head, 0, 5);
                if (head[0] != '%' || head[1] != 'P' || head[2] != 'D' || head[3] != 'F') { File.Delete(tmp); return null; }
                File.Move(tmp, file);
                return file;
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido descargar el manual " + url);
                try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
                return null;
            }
        }

        /// <summary>The card's manual buttons: pick a PDF (Playnite's own file dialog) or forget the one picked before.</summary>
        private void ManualAction(ShelfHost host, PageMessage m)
        {
            var g = Find(m.id);
            if (g == null) return;
            var dest = OwnManual(g.Id);
            if (m.act == "remove")
            {
                try { if (File.Exists(dest)) File.Delete(dest); }
                catch (Exception e) { Notice(host, Loc.S("No se ha podido quitar el manual: ", "Could not remove the manual: ") + e.Message); return; }
                Broadcast(new Dictionary<string, object> { ["type"] = "games", ["games"] = new List<object> { Record(g) } });
                return;
            }

            if (m.act != "pick") return;
            string file = null;
            try { file = api.Dialogs.SelectFile("PDF|*.pdf"); }
            catch (Exception e) { logger.Warn(e, "MyVLibrary: no se ha podido abrir el diálogo del manual"); }
            if (string.IsNullOrEmpty(file)) return;
            if (new FileInfo(file).Length > ManualMax) { Notice(host, Loc.S("Ese PDF es demasiado grande.", "That PDF is too big.")); return; }

            /* a big PDF takes a moment to copy: away from Playnite's window */
            Task.Run(() =>
            {
                try
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    File.Copy(file, dest + ".part", true);
                    if (File.Exists(dest)) File.Delete(dest);
                    File.Move(dest + ".part", dest);
                    OnUi(() => Broadcast(new Dictionary<string, object> { ["type"] = "games", ["games"] = new List<object> { Record(g) } }));
                }
                catch (Exception e)
                {
                    logger.Error(e, "MyVLibrary: no se ha podido copiar el manual");
                    OnUi(() => Notice(host, Loc.S("No se ha podido copiar el manual: ", "Could not copy the manual: ") + e.Message));
                }
            });
        }
    }
}
