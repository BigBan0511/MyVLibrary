using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyVLibrary
{
    /// <summary>
    /// The video room: films and series from Jellyfin. The last list is kept on disk so the bookcases appear
    /// at once; Jellyfin is asked again in the background and the page gets the new list if it changed.
    /// </summary>
    public partial class LibraryBridge
    {
        private VideoPlayer player;
        private string videoJson;
        private DateTime videoAsked = DateTime.MinValue;
        private bool videoAsking;

        private JellyfinClient Jf => new JellyfinClient(plugin.Settings);
        private string VideoCacheFile => Path.Combine(plugin.GetPluginUserDataPath(), "jellyfin-library.json");

        private void OnUi(Action a) => api.MainView.UIDispatcher.BeginInvoke(a);

        /// <summary>What the library message carries for the video room: the kept list, or nothing when not linked.</summary>
        private Dictionary<string, object> CachedVideo()
        {
            if (!Jf.Linked) return null;
            try
            {
                if (videoJson == null && File.Exists(VideoCacheFile)) videoJson = File.ReadAllText(VideoCacheFile, Encoding.UTF8);
                var items = videoJson == null ? new List<Dictionary<string, object>>() : Serialization.FromJson<List<Dictionary<string, object>>>(videoJson);
                return new Dictionary<string, object> { ["player"] = plugin.Settings.JellyfinPlayer, ["items"] = items };
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: la lista de Jellyfin guardada no se puede leer");
                return new Dictionary<string, object> { ["player"] = plugin.Settings.JellyfinPlayer, ["items"] = new List<object>() };
            }
        }

        /// <summary>Asks Jellyfin for the films and series again (at most once a minute unless forced).</summary>
        public void RefreshVideo(bool force = true)
        {
            if (videoAsking || (!force && DateTime.Now - videoAsked < TimeSpan.FromMinutes(1))) return;
            var jf = Jf;
            if (!jf.Linked)
            {
                /* unlinked: the video room goes away */
                if (videoJson != null) { videoJson = null; try { File.Delete(VideoCacheFile); } catch { } OnUi(() => Broadcast(new Dictionary<string, object> { ["type"] = "video", ["items"] = new List<object>() })); }
                return;
            }
            videoAsking = true; videoAsked = DateTime.Now;
            var wanted = plugin.Settings.JellyfinLibraries ?? new List<string>();
            Task.Run(async () =>
            {
                try
                {
                    var libs = (await jf.VideoLibraries().ConfigureAwait(false)).Where(l => wanted.Count == 0 || wanted.Contains(l.Id)).ToList();
                    var items = new List<Dictionary<string, object>>();
                    for (var i = 0; i < libs.Count; i++)
                    {
                        foreach (var it in await jf.LibraryItems(libs[i].Id).ConfigureAwait(false)) items.Add(VideoRecord(it, libs[i].Name, i));
                    }
                    var json = Serialization.ToJson(items);
                    if (json == videoJson) return;
                    videoJson = json;
                    try { File.WriteAllText(VideoCacheFile, json, Encoding.UTF8); } catch { }
                    OnUi(() => Broadcast(new Dictionary<string, object> { ["type"] = "video", ["player"] = plugin.Settings.JellyfinPlayer, ["items"] = items }));
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: Jellyfin no ha devuelto la biblioteca");
                }
                finally { videoAsking = false; }
            });
        }

        private static string IsoOf(DateTime? d) => d.HasValue ? d.Value.ToUniversalTime().ToString("o") : null;

        private static Dictionary<string, object> VideoRecord(JfItem it, string lib, int libOrder)
        {
            var tags = it.ImageTags ?? new Dictionary<string, string>();
            var ud = it.UserData ?? new JfUserData();
            var series = it.Type == "Series";
            var overview = it.Overview ?? "";
            if (overview.Length > 700) overview = overview.Substring(0, 700).TrimEnd() + "…";
            return new Dictionary<string, object>
            {
                ["id"] = it.Id,
                ["type"] = it.Type,
                ["name"] = it.Name,
                ["sort"] = string.IsNullOrEmpty(it.SortName) ? it.Name : it.SortName,
                ["year"] = it.ProductionYear ?? it.PremiereDate?.Year,
                ["lib"] = lib,
                ["libOrder"] = libOrder,
                ["genres"] = it.Genres ?? new List<string>(),
                ["overview"] = overview,
                ["runtime"] = it.RunTimeTicks.HasValue ? (int)Math.Round(it.RunTimeTicks.Value / 600000000.0) : 0,
                ["rating"] = it.OfficialRating,
                ["community"] = it.CommunityRating,
                ["played"] = ud.Played,
                ["pos"] = ud.PlaybackPositionTicks,
                ["lastPlayed"] = IsoOf(ud.LastPlayedDate),
                ["added"] = IsoOf(it.DateCreated),
                ["studios"] = (it.Studios ?? new List<JfStudio>()).Select(s => s.Name).Take(2).ToList(),
                ["episodes"] = series ? it.RecursiveItemCount : null,
                ["unplayed"] = series ? ud.UnplayedItemCount : null,
                ["hasCover"] = tags.ContainsKey("Primary"),
                ["hasBg"] = (it.BackdropImageTags?.Count ?? 0) > 0,
                ["hasLogo"] = tags.ContainsKey("Logo"),
                ["ver"] = Hash(string.Join("|", tags.Values) + "|" + string.Join("|", it.BackdropImageTags ?? new List<string>()))
            };
        }

        // ---------- the page asks ----------

        private void VideoSeasons(ShelfHost host, string seriesId)
        {
            var jf = Jf;
            Task.Run(async () =>
            {
                List<Dictionary<string, object>> list;
                try
                {
                    list = (await jf.Seasons(seriesId).ConfigureAwait(false)).Select(s => new Dictionary<string, object>
                    {
                        ["id"] = s.Id, ["idx"] = s.IndexNumber, ["name"] = s.Name, ["year"] = s.ProductionYear ?? s.PremiereDate?.Year, ["count"] = s.ChildCount
                    }).ToList();
                }
                catch (Exception e) { logger.Warn(e, "MyVLibrary: temporadas de " + seriesId); list = new List<Dictionary<string, object>>(); }
                OnUi(() => host.Post(new Dictionary<string, object> { ["type"] = "jfSeasons", ["id"] = seriesId, ["seasons"] = list }));
            });
        }

        private void VideoEpisodes(ShelfHost host, string seriesId, string seasonId)
        {
            var jf = Jf;
            Task.Run(async () =>
            {
                List<Dictionary<string, object>> list;
                try
                {
                    list = (await jf.Episodes(seriesId, seasonId).ConfigureAwait(false)).Select(e => new Dictionary<string, object>
                    {
                        ["id"] = e.Id, ["n"] = e.IndexNumber, ["season"] = e.ParentIndexNumber, ["name"] = e.Name,
                        ["runtime"] = e.RunTimeTicks.HasValue ? (int)Math.Round(e.RunTimeTicks.Value / 600000000.0) : 0,
                        ["played"] = e.UserData?.Played ?? false, ["pos"] = e.UserData?.PlaybackPositionTicks ?? 0
                    }).ToList();
                }
                catch (Exception e) { logger.Warn(e, "MyVLibrary: episodios de " + seriesId); list = new List<Dictionary<string, object>>(); }
                OnUi(() => host.Post(new Dictionary<string, object> { ["type"] = "jfEpisodes", ["id"] = seriesId, ["season"] = seasonId, ["episodes"] = list }));
            });
        }

        /// <summary>The tape or disc went in: the film plays in the chosen program; the shelf hears when it ends.</summary>
        private void VideoPlay(string itemId, long start)
        {
            if (string.IsNullOrEmpty(itemId)) return;
            player?.Stop();
            player = new VideoPlayer(Jf, plugin.Settings);
            Action<object> say = m => OnUi(() => Broadcast(m));
            player.Play(itemId, Math.Max(0, start),
                () => say(new Dictionary<string, object> { ["type"] = "videoStarted", ["id"] = itemId }),
                (pos, played) =>
                {
                    say(new Dictionary<string, object> { ["type"] = "videoStopped", ["id"] = itemId, ["pos"] = pos, ["played"] = played, ["active"] = hosts.Any(h => h.IsOnScreen) });
                    RefreshVideo(false);
                },
                reason => say(new Dictionary<string, object> { ["type"] = "videoFailed", ["id"] = itemId, ["reason"] = reason }));
        }

        private void VideoStop() => player?.Stop();

        /// <summary>https://media.myvlibrary/jf/{itemId}/{Primary|Backdrop|Logo}?w=512 → a JPEG from Jellyfin, cached on disk.</summary>
        private MediaFile LoadJellyfinImage(string itemId, string type, int width, string ver)
        {
            if (!Jf.Linked || !(type == "Primary" || type == "Backdrop" || type == "Logo")) return null;
            if (cacheDir == null) { cacheDir = Path.Combine(plugin.GetPluginUserDataPath(), "cache"); Directory.CreateDirectory(cacheDir); }
            var file = Path.Combine(cacheDir, $"jf-{Hash(itemId)}{Hash(itemId + "#")}-{type}-{width}-{Hash(ver ?? "")}.jpg");
            if (File.Exists(file)) return new MediaFile { Bytes = File.ReadAllBytes(file), ContentType = "image/jpeg" };
            var bytes = Jf.Image(itemId, type, width).GetAwaiter().GetResult();
            if (bytes == null || bytes.Length == 0) return null;
            try { File.WriteAllBytes(file, bytes); } catch { }
            return new MediaFile { Bytes = bytes, ContentType = "image/jpeg" };
        }
    }
}
