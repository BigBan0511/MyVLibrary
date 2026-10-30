using Playnite.SDK.Data;
using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace MyVLibrary
{
    /// <summary>How the player framed one face of the case: what the page sends, checked before it is kept.</summary>
    public class ScanFit
    {
        /* the picture it was made for: when that picture changes, the framing no longer applies */
        public string s { get; set; }
        /* quarter turns, clockwise */
        public int r { get; set; }
        /* the part of the turned picture that goes on the face: left, top, right, bottom, as fractions of it */
        public List<double> c { get; set; }
        /* a full scan: where the spine starts and ends, as fractions of the picture's width */
        public List<double> k { get; set; }
        /* the shape of the face (width / height) it was made for, and whether its proportions were kept */
        public double? a { get; set; }
        public int? l { get; set; }
    }

    /// <summary>
    /// Real pictures for the parts of a case: the back, the spine, the disc (or the cartridge label) and the
    /// manual's cover, which Playnite keeps no image for, a front of its own, or a full wraparound scan with
    /// back, spine and front. They live in the game's
    /// ExtraMetadata folder, next to Extra Metadata Loader's logo and trailer, under the names
    /// LaunchBox and other tools use; the card can also save a picture there.
    /// </summary>
    public partial class LibraryBridge
    {
        /* the first name of each list is the one the card saves under */
        private static readonly Dictionary<string, string[]> ArtNames = new Dictionary<string, string[]>
        {
            ["full"] = new[] { "Full", "BoxFull", "Box - Full", "FullCover", "Full Cover", "Wrap", "CoverFull" },
            ["front"] = new[] { "Front", "BoxFront", "Box - Front", "FrontCover", "Front Cover", "Box - Front - Reconstructed" },
            ["back"] = new[] { "Back", "BoxBack", "Box - Back", "BackCover", "Back Cover", "Box - Back - Reconstructed" },
            ["spine"] = new[] { "Spine", "BoxSpine", "Box - Spine" },
            ["disc"] = new[] { "Disc", "CD", "DVD", "Media", "Cart", "Cartridge", "Cart - Front" },
            ["manual"] = new[] { "Manual", "ManualCover", "Manual Cover", "Manual - Front", "Booklet" }
        };

        private static readonly string[] ArtExt = { ".png", ".jpg", ".jpeg", ".webp" };

        /* how each face is framed lives next to the pictures, so it goes wherever they go */
        private const string FitFile = "MyVLibrary.json";
        private static readonly string[] FitKinds = { "front", "full", "back", "spine", "disc", "manual" };

        public class FitDoc
        {
            public Dictionary<string, ScanFit> fit { get; set; }
        }

        /// <summary>Which of those pictures the game has, as file names the page can ask extra.myvlibrary for.</summary>
        private Dictionary<string, string> ArtOf(Guid id)
        {
            var found = new Dictionary<string, string>();
            try
            {
                var dir = Path.Combine(ExtraRoot, id.ToString());
                if (!Directory.Exists(dir)) return found;
                var files = Directory.GetFiles(dir).Where(p => ArtExt.Contains(Path.GetExtension(p).ToLowerInvariant())).ToList();
                if (files.Count == 0) return found;
                foreach (var kind in ArtNames)
                {
                    foreach (var name in kind.Value)
                    {
                        var f = files.FirstOrDefault(p => string.Equals(Path.GetFileNameWithoutExtension(p), name, StringComparison.OrdinalIgnoreCase));
                        if (f == null) continue;
                        // the date in the address makes a replaced picture load again instead of coming from the cache
                        found[kind.Key] = Uri.EscapeDataString(Path.GetFileName(f)) + "?v=" + File.GetLastWriteTimeUtc(f).Ticks.ToString("x");
                        break;
                    }
                }
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido mirar la carpeta de metadatos de " + id);
            }

            return found;
        }

        /// <summary>How the player framed the game's faces (nothing, for most games).</summary>
        private Dictionary<string, ScanFit> FitOf(Guid id)
        {
            try
            {
                var file = Path.Combine(ExtraRoot, id.ToString(), FitFile);
                if (!File.Exists(file)) return new Dictionary<string, ScanFit>();
                var doc = Serialization.FromJson<FitDoc>(File.ReadAllText(file));
                if (doc?.fit != null) return doc.fit.Where(p => p.Value != null && FitKinds.Contains(p.Key)).ToDictionary(p => p.Key, p => p.Value);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido leer el encuadre de " + id);
            }

            return new Dictionary<string, ScanFit>();
        }

        private void SaveFit(Guid id, Dictionary<string, ScanFit> fit)
        {
            var dir = Path.Combine(ExtraRoot, id.ToString());
            var file = Path.Combine(dir, FitFile);
            if (fit.Count == 0)
            {
                if (File.Exists(file)) File.Delete(file);
                return;
            }

            Directory.CreateDirectory(dir);
            File.WriteAllText(file, Serialization.ToJson(new FitDoc { fit = fit }));
        }

        private static bool Sane(ScanFit f, string kind)
        {
            bool ok(double v) => !double.IsNaN(v) && !double.IsInfinity(v) && v > -5 && v < 6;
            if (f == null || string.IsNullOrEmpty(f.s) || f.s.Length > 512 || f.r < 0 || f.r > 3) return false;
            if (f.c == null || f.c.Count != 4 || !f.c.All(ok) || f.c[2] <= f.c[0] || f.c[3] <= f.c[1]) return false;
            if (kind == "full") return f.k != null && f.k.Count == 2 && f.k.All(ok) && f.c[0] < f.k[0] && f.k[0] < f.k[1] && f.k[1] < f.c[2];
            return f.a == null || (f.a > 0.01 && f.a < 100);
        }

        /// <summary>
        /// The framing window's Save: keeps how a face is framed (or, with nothing, forgets it)
        /// and sends the game again so every copy of the case is repainted.
        /// </summary>
        private void SetFit(ShelfHost host, PageMessage m)
        {
            var g = Find(m.id);
            if (g == null || m.kind == null || !FitKinds.Contains(m.kind) || (m.data != null && m.data.Length > 4096)) return;
            try
            {
                var fit = FitOf(g.Id);
                if (string.IsNullOrEmpty(m.data)) fit.Remove(m.kind);
                else
                {
                    var f = Serialization.FromJson<ScanFit>(m.data);
                    if (!Sane(f, m.kind)) return;
                    if (m.kind != "full") f.k = null;
                    fit[m.kind] = f;
                }

                SaveFit(g.Id, fit);
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: no se ha podido guardar el encuadre");
                Notice(host, Loc.S("No se ha podido guardar el encuadre: ", "Could not save the framing: ") + e.Message);
                return;
            }

            Broadcast(new Dictionary<string, object> { ["type"] = "games", ["games"] = new List<object> { Record(g) } });
        }

        /// <summary>
        /// The card's picture buttons: saves the picture under the kind's own name (or, with no picture, removes the
        /// one it saved before) and sends the game again so every shelf repaints it.
        /// </summary>
        private void SetArt(ShelfHost host, PageMessage m)
        {
            var g = Find(m.id);
            if (g == null || m.kind == null || !ArtNames.ContainsKey(m.kind)) return;
            var dir = Path.Combine(ExtraRoot, g.Id.ToString());
            var own = ArtNames[m.kind][0];
            try
            {
                foreach (var ext in ArtExt)
                {
                    var old = Path.Combine(dir, own + ext);
                    if (File.Exists(old)) File.Delete(old);
                }

                if (!string.IsNullOrEmpty(m.data))
                {
                    var comma = m.data.IndexOf(',');
                    var head = comma >= 0 ? m.data.Substring(0, comma) : "";
                    var bytes = Convert.FromBase64String(comma >= 0 ? m.data.Substring(comma + 1) : m.data);
                    if (bytes.Length > 40 * 1024 * 1024)
                    {
                        Notice(host, Loc.S("Esa imagen es demasiado grande.", "That picture is too big."));
                        return;
                    }

                    var type = head.IndexOf("image/png", StringComparison.OrdinalIgnoreCase) >= 0 ? ".png" : head.IndexOf("image/webp", StringComparison.OrdinalIgnoreCase) >= 0 ? ".webp" : ".jpg";
                    Directory.CreateDirectory(dir);
                    File.WriteAllBytes(Path.Combine(dir, own + type), bytes);
                }
                else if (ArtOf(g.Id).ContainsKey(m.kind))
                {
                    // the picture showing is one another tool put there under another name: that one is not ours to delete
                    Notice(host, Loc.S("Queda otra imagen de ese tipo en la carpeta de metadatos del juego; esa no la toco.",
                                       "There is another picture of that kind in the game's metadata folder; that one is left alone."));
                }

                /* the framing was for the picture that was there */
                var fit = FitOf(g.Id);
                if (fit.Remove(m.kind)) SaveFit(g.Id, fit);
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: no se ha podido guardar la imagen");
                Notice(host, Loc.S("No se ha podido guardar la imagen: ", "Could not save the picture: ") + e.Message);
                return;
            }

            Broadcast(new Dictionary<string, object> { ["type"] = "games", ["games"] = new List<object> { Record(g) } });
        }
    }
}
