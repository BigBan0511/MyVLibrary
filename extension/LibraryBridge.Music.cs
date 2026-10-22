using Playnite.SDK.Data;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyVLibrary
{
    /// <summary>
    /// The record shop: albums, artists, songs and playlists from Navidrome. The last list is kept on disk so
    /// the shop appears at once; Navidrome is asked again in the background. The songs play inside the shelf:
    /// each one is downloaded once into a small cache and served from there, in pieces, as the page asks.
    /// </summary>
    public partial class LibraryBridge
    {
        private string musicJson;
        private DateTime musicAsked = DateTime.MinValue;
        private bool musicAsking;
        private readonly ConcurrentDictionary<string, Task<string>> downloads = new ConcurrentDictionary<string, Task<string>>();

        private NavidromeClient Nd => new NavidromeClient(plugin.Settings);
        private string MusicCacheFile => Path.Combine(plugin.GetPluginUserDataPath(), "navidrome-library.json");
        private string AudioDir { get { var d = Path.Combine(plugin.GetPluginUserDataPath(), "cache", "audio"); Directory.CreateDirectory(d); return d; } }

        /// <summary>What the library message carries for the record shop: the kept list, or nothing when not linked.</summary>
        private object CachedMusic()
        {
            if (!Nd.Linked) return null;
            try
            {
                if (musicJson == null && File.Exists(MusicCacheFile)) musicJson = File.ReadAllText(MusicCacheFile, Encoding.UTF8);
                return musicJson == null ? (object)new Dictionary<string, object>() : Serialization.FromJson<Dictionary<string, object>>(musicJson);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: la lista de Navidrome guardada no se puede leer");
                return new Dictionary<string, object>();
            }
        }

        /// <summary>Asks Navidrome for everything again (at most once a minute unless forced).</summary>
        public void RefreshMusic(bool force = true)
        {
            if (musicAsking || (!force && DateTime.Now - musicAsked < TimeSpan.FromMinutes(1))) return;
            var nd = Nd;
            if (!nd.Linked)
            {
                /* unlinked: the record shop goes away */
                if (musicJson != null) { musicJson = null; try { File.Delete(MusicCacheFile); } catch { } OnUi(() => Broadcast(new Dictionary<string, object> { ["type"] = "music", ["music"] = new Dictionary<string, object>() })); }
                return;
            }
            musicAsking = true; musicAsked = DateTime.Now;
            Task.Run(async () =>
            {
                try
                {
                    var albums = await nd.Albums().ConfigureAwait(false);
                    var songs = await nd.Songs(albums).ConfigureAwait(false);
                    var artists = await nd.Artists().ConfigureAwait(false);
                    var lists = await nd.Playlists().ConfigureAwait(false);
                    var music = new Dictionary<string, object>
                    {
                        ["albums"] = albums.Select(a => new Dictionary<string, object> { ["id"] = a.id, ["name"] = a.name, ["artist"] = a.artist, ["artistId"] = a.artistId, ["year"] = a.year, ["genre"] = a.genre, ["coverArt"] = a.coverArt, ["duration"] = a.duration }).ToList(),
                        ["songs"] = songs.Select(s => new Dictionary<string, object> { ["id"] = s.id, ["title"] = s.title, ["album"] = s.album, ["albumId"] = s.albumId, ["artist"] = s.artist, ["artistId"] = s.artistId, ["track"] = s.track, ["disc"] = s.discNumber, ["year"] = s.year, ["genre"] = s.genre, ["coverArt"] = s.coverArt, ["duration"] = s.duration, ["suffix"] = s.suffix }).ToList(),
                        ["artists"] = artists.Select(a => new Dictionary<string, object> { ["id"] = a.id, ["name"] = a.name, ["coverArt"] = a.coverArt }).ToList(),
                        ["playlists"] = lists.Select(p => new Dictionary<string, object> { ["id"] = p.id, ["name"] = p.name, ["owner"] = p.owner, ["duration"] = p.duration, ["coverArt"] = p.coverArt, ["entries"] = (p.entry ?? new List<NdSong>()).Select(e => e.id).ToList() }).ToList()
                    };
                    var json = Serialization.ToJson(music);
                    if (json == musicJson) return;
                    musicJson = json;
                    try { File.WriteAllText(MusicCacheFile, json, Encoding.UTF8); } catch { }
                    OnUi(() => Broadcast(new Dictionary<string, object> { ["type"] = "music", ["music"] = music }));
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: Navidrome no ha devuelto la biblioteca");
                }
                finally { musicAsking = false; }
            });
        }

        private void MusicScrobble(string id)
        {
            if (string.IsNullOrEmpty(id) || !Nd.Linked) return;
            var nd = Nd;
            Task.Run(async () => { try { await nd.Scrobble(id).ConfigureAwait(false); } catch (Exception e) { logger.Warn(e, "MyVLibrary: Navidrome no ha apuntado " + id); } });
        }

        /// <summary>https://media.myvlibrary/nd/cover/{id}?w=512 → a JPEG from Navidrome, cached on disk.</summary>
        private MediaFile LoadNavidromeCover(string id, int width)
        {
            if (!Nd.Linked || string.IsNullOrEmpty(id)) return null;
            if (cacheDir == null) { cacheDir = Path.Combine(plugin.GetPluginUserDataPath(), "cache"); Directory.CreateDirectory(cacheDir); }
            var file = Path.Combine(cacheDir, $"nd-{Hash(id)}{Hash(id + "#")}-{width}.img");
            if (File.Exists(file)) return new MediaFile { Bytes = File.ReadAllBytes(file), ContentType = "image/jpeg" };
            var bytes = Nd.Cover(id, width).GetAwaiter().GetResult();
            if (bytes == null || bytes.Length == 0) return null;
            try { File.WriteAllBytes(file, bytes); } catch { }
            return new MediaFile { Bytes = bytes, ContentType = "image/jpeg" };
        }

        /* what the shelf (Chromium) plays as it comes; anything else is converted to MP3 by Navidrome */
        private static readonly Dictionary<string, string> AudioTypes = new Dictionary<string, string>
        {
            ["mp3"] = "audio/mpeg", ["flac"] = "audio/flac", ["ogg"] = "audio/ogg", ["oga"] = "audio/ogg", ["opus"] = "audio/ogg", ["wav"] = "audio/wav", ["aac"] = "audio/aac"
        };

        /// <summary>
        /// https://media.myvlibrary/nd/stream/{id}?f=flac → the song, from the cache (downloaded the first time).
        /// The page's player asks for it in pieces (Range), so it can start at once and jump around.
        /// </summary>
        private MediaFile LoadNavidromeAudio(string id, string suffix, string range)
        {
            if (!Nd.Linked || string.IsNullOrEmpty(id)) return null;
            suffix = (suffix ?? "").ToLowerInvariant();
            var raw = AudioTypes.ContainsKey(suffix);
            var ext = raw ? suffix : "mp3";
            var file = Path.Combine(AudioDir, $"{Hash(id)}{Hash(id + "#")}.{ext}");
            if (!File.Exists(file))
            {
                var nd = Nd;
                var job = downloads.GetOrAdd(file, f => Task.Run(async () => { await nd.Download(id, !raw, f).ConfigureAwait(false); TrimAudioCache(f); return f; }));
                try { job.GetAwaiter().GetResult(); }
                catch (Exception e) { logger.Warn(e, "MyVLibrary: no se ha podido bajar la canción " + id); return null; }
                finally { downloads.TryRemove(file, out _); }
            }
            try { File.SetLastWriteTimeUtc(file, DateTime.UtcNow); } catch { }
            var total = new FileInfo(file).Length;
            var type = AudioTypes.TryGetValue(ext, out var t) ? t : "audio/mpeg";
            long start = 0, end = total - 1;
            var partial = false;
            if (!string.IsNullOrEmpty(range) && range.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
            {
                var p = range.Substring(6).Split(',')[0].Split('-');
                if (long.TryParse(p[0], out var a)) { start = Math.Min(a, total - 1); partial = true; }
                if (p.Length > 1 && long.TryParse(p[1], out var b)) end = Math.Min(b, total - 1);
            }
            /* a piece of at most 4 MB: the player asks for the next one when it needs it */
            end = Math.Min(end, start + 4 * 1024 * 1024 - 1);
            var len = (int)(end - start + 1);
            var buf = new byte[len];
            using (var fs = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            {
                fs.Seek(start, SeekOrigin.Begin);
                var read = 0; while (read < len) { var n = fs.Read(buf, read, len - read); if (n <= 0) break; read += n; }
            }
            partial = partial || end < total - 1;
            return new MediaFile
            {
                Bytes = buf, ContentType = type, Status = partial ? 206 : 200,
                Headers = $"Content-Type: {type}\r\nAccept-Ranges: bytes\r\nContent-Length: {len}\r\nAccess-Control-Allow-Origin: *" + (partial ? $"\r\nContent-Range: bytes {start}-{end}/{total}" : "")
            };
        }

        /// <summary>The cache keeps the songs heard most recently, about a gigabyte.</summary>
        private void TrimAudioCache(string keep)
        {
            try
            {
                var files = new DirectoryInfo(AudioDir).GetFiles().Where(f => f.Extension != ".part").OrderByDescending(f => f.LastWriteTimeUtc).ToList();
                long sum = 0;
                foreach (var f in files) { sum += f.Length; if (sum > 1024L * 1024 * 1024 && !string.Equals(f.FullName, keep, StringComparison.OrdinalIgnoreCase)) { try { f.Delete(); } catch { } } }
            }
            catch { }
        }
    }
}
