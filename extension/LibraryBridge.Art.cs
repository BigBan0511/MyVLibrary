using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace MyVLibrary
{
    /// <summary>
    /// Real pictures for the parts of a case Playnite keeps no image for: the back, the spine, the disc
    /// (or the cartridge label), or a full wraparound scan with all three. They live in the game's
    /// ExtraMetadata folder, next to Extra Metadata Loader's logo and trailer, under the names
    /// LaunchBox and other tools use; the card can also save a picture there.
    /// </summary>
    public partial class LibraryBridge
    {
        /* the first name of each list is the one the card saves under */
        private static readonly Dictionary<string, string[]> ArtNames = new Dictionary<string, string[]>
        {
            ["full"] = new[] { "Full", "BoxFull", "Box - Full", "FullCover", "Full Cover", "Wrap", "CoverFull" },
            ["back"] = new[] { "Back", "BoxBack", "Box - Back", "BackCover", "Back Cover", "Box - Back - Reconstructed" },
            ["spine"] = new[] { "Spine", "BoxSpine", "Box - Spine" },
            ["disc"] = new[] { "Disc", "CD", "DVD", "Media", "Cart", "Cartridge", "Cart - Front" }
        };

        private static readonly string[] ArtExt = { ".png", ".jpg", ".jpeg", ".webp" };

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
