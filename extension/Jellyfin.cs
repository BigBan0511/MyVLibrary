using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MyVLibrary
{
    // ---------- what Jellyfin answers (only the fields the shelf uses) ----------

    public class JfUser { public string Id { get; set; } public string Name { get; set; } }
    public class JfAuth { public string AccessToken { get; set; } public JfUser User { get; set; } }
    public class JfStudio { public string Name { get; set; } }
    public class JfUserData
    {
        public bool Played { get; set; }
        public long PlaybackPositionTicks { get; set; }
        public DateTime? LastPlayedDate { get; set; }
        public int? UnplayedItemCount { get; set; }
    }
    public class JfItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string SortName { get; set; }
        public string Type { get; set; }
        public string CollectionType { get; set; }
        public int? ProductionYear { get; set; }
        public DateTime? PremiereDate { get; set; }
        public DateTime? DateCreated { get; set; }
        public string Overview { get; set; }
        public List<string> Genres { get; set; }
        public long? RunTimeTicks { get; set; }
        public string OfficialRating { get; set; }
        public double? CommunityRating { get; set; }
        public JfUserData UserData { get; set; }
        public Dictionary<string, string> ImageTags { get; set; }
        public List<string> BackdropImageTags { get; set; }
        public List<JfStudio> Studios { get; set; }
        public int? IndexNumber { get; set; }
        public int? ParentIndexNumber { get; set; }
        public int? ChildCount { get; set; }
        public int? RecursiveItemCount { get; set; }
    }
    public class JfItems { public List<JfItem> Items { get; set; } }
    public class JfPlayState { public long? PositionTicks { get; set; } public bool IsPaused { get; set; } }
    public class JfSession
    {
        public string Id { get; set; }
        public string Client { get; set; }
        public string DeviceName { get; set; }
        public string DeviceId { get; set; }
        public string UserId { get; set; }
        public bool SupportsRemoteControl { get; set; }
        public DateTime? LastActivityDate { get; set; }
        public JfItem NowPlayingItem { get; set; }
        public JfPlayState PlayState { get; set; }
    }

    /// <summary>
    /// Talks to the user's Jellyfin server: logging in, the video libraries, a series' seasons and episodes,
    /// pictures, and what is being played. Only the access token is kept (in the extension's settings), never the password.
    /// </summary>
    internal class JellyfinClient
    {
        private static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        private static readonly string[] VideoKinds = { "movies", "tvshows", "homevideos", "mixed", "musicvideos" };
        private readonly ShelfSettings settings;

        public JellyfinClient(ShelfSettings settings)
        {
            this.settings = settings;
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        }

        public bool Linked => !string.IsNullOrWhiteSpace(settings.JellyfinUrl) && !string.IsNullOrEmpty(settings.JellyfinToken) && !string.IsNullOrEmpty(settings.JellyfinUserId);
        private string Base => (settings.JellyfinUrl ?? "").Trim().TrimEnd('/');
        private string Uid => settings.JellyfinUserId;
        internal static string Version => typeof(JellyfinClient).Assembly.GetName().Version.ToString(3);

        private static string Auth(string deviceId, string token) =>
            $"MediaBrowser Client=\"MyVLibrary\", Device=\"Playnite\", DeviceId=\"{deviceId}\", Version=\"{Version}\"" + (string.IsNullOrEmpty(token) ? "" : $", Token=\"{token}\"");

        private HttpRequestMessage Request(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, Base + path);
            var auth = Auth(settings.JellyfinDeviceId, settings.JellyfinToken);
            req.Headers.TryAddWithoutValidation("Authorization", auth);
            req.Headers.TryAddWithoutValidation("X-Emby-Authorization", auth);
            return req;
        }

        private async Task<T> Get<T>(string path) where T : class
        {
            using (var res = await http.SendAsync(Request(HttpMethod.Get, path)).ConfigureAwait(false))
            {
                res.EnsureSuccessStatusCode();
                return Serialization.FromJson<T>(await res.Content.ReadAsStringAsync().ConfigureAwait(false));
            }
        }

        private async Task Post(string path, object body = null)
        {
            var req = Request(HttpMethod.Post, path);
            req.Content = new StringContent(body == null ? "" : Serialization.ToJson(body), Encoding.UTF8, "application/json");
            using (var res = await http.SendAsync(req).ConfigureAwait(false))
            {
                res.EnsureSuccessStatusCode();
            }
        }

        /// <summary>Logs in with the user's name and password and returns the token and user id.</summary>
        public static async Task<JfAuth> Login(string url, string user, string password, string deviceId)
        {
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            var req = new HttpRequestMessage(HttpMethod.Post, url.Trim().TrimEnd('/') + "/Users/AuthenticateByName");
            req.Headers.TryAddWithoutValidation("Authorization", Auth(deviceId, null));
            req.Headers.TryAddWithoutValidation("X-Emby-Authorization", Auth(deviceId, null));
            req.Content = new StringContent(Serialization.ToJson(new Dictionary<string, string> { ["Username"] = user, ["Pw"] = password ?? "" }), Encoding.UTF8, "application/json");
            using (var res = await http.SendAsync(req).ConfigureAwait(false))
            {
                if (res.StatusCode == HttpStatusCode.Unauthorized) throw new UnauthorizedAccessException();
                res.EnsureSuccessStatusCode();
                return Serialization.FromJson<JfAuth>(await res.Content.ReadAsStringAsync().ConfigureAwait(false));
            }
        }

        /// <summary>The user's libraries that hold films or series.</summary>
        public async Task<List<JfItem>> VideoLibraries()
        {
            var views = await Get<JfItems>($"/Users/{Uid}/Views").ConfigureAwait(false);
            return (views?.Items ?? new List<JfItem>()).Where(v => string.IsNullOrEmpty(v.CollectionType) || VideoKinds.Contains(v.CollectionType)).ToList();
        }

        private const string ItemFields = "SortName,Genres,Overview,ProductionYear,PremiereDate,DateCreated,Studios,OfficialRating,CommunityRating,RecursiveItemCount,ChildCount";

        /// <summary>The films and series of one library.</summary>
        public async Task<List<JfItem>> LibraryItems(string libraryId)
        {
            var res = await Get<JfItems>($"/Users/{Uid}/Items?ParentId={libraryId}&Recursive=true&IncludeItemTypes=Movie,Series&Fields={ItemFields}&EnableImageTypes=Primary,Backdrop,Logo&ImageTypeLimit=1&SortBy=SortName").ConfigureAwait(false);
            return res?.Items ?? new List<JfItem>();
        }

        public async Task<List<JfItem>> Seasons(string seriesId)
        {
            var res = await Get<JfItems>($"/Shows/{seriesId}/Seasons?userId={Uid}&Fields=ProductionYear,PremiereDate,ChildCount").ConfigureAwait(false);
            return res?.Items ?? new List<JfItem>();
        }

        public async Task<List<JfItem>> Episodes(string seriesId, string seasonId)
        {
            var res = await Get<JfItems>($"/Shows/{seriesId}/Episodes?userId={Uid}&seasonId={seasonId}&Fields=Overview").ConfigureAwait(false);
            return res?.Items ?? new List<JfItem>();
        }

        public Task<JfItem> Item(string id) => Get<JfItem>($"/Users/{Uid}/Items/{id}");

        /// <summary>A picture of an item (Primary, Backdrop, Logo), as JPEG no wider than width.</summary>
        public async Task<byte[]> Image(string id, string type, int width)
        {
            using (var res = await http.SendAsync(Request(HttpMethod.Get, $"/Items/{id}/Images/{type}?maxWidth={width}&quality=88&format=Jpg")).ConfigureAwait(false))
            {
                if (!res.IsSuccessStatusCode) return null;
                return await res.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
            }
        }

        // ---------- playing ----------

        public string StreamUrl(string itemId) => $"{Base}/Videos/{itemId}/stream?static=true&api_key={settings.JellyfinToken}&DeviceId={settings.JellyfinDeviceId}";

        /// <summary>The sessions this user can control (Jellyfin Desktop, Jellyfin Media Player, the web...).</summary>
        public async Task<List<JfSession>> Sessions()
        {
            var json = await GetString($"/Sessions?controllableByUserId={Uid}").ConfigureAwait(false);
            return Serialization.FromJson<List<JfSession>>(json) ?? new List<JfSession>();
        }

        private async Task<string> GetString(string path)
        {
            using (var res = await http.SendAsync(Request(HttpMethod.Get, path)).ConfigureAwait(false))
            {
                res.EnsureSuccessStatusCode();
                return await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            }
        }

        public Task PlayOn(string sessionId, string itemId, long startTicks) =>
            Post($"/Sessions/{sessionId}/Playing?playCommand=PlayNow&itemIds={itemId}&startPositionTicks={startTicks}");

        public Task StopOn(string sessionId) => Post($"/Sessions/{sessionId}/Playing/Stop");

        /// <summary>For a player that cannot tell Jellyfin itself (VLC): started, how far, stopped.</summary>
        public Task Report(string what, string itemId, long positionTicks, bool paused, string playSessionId)
        {
            var path = what == "start" ? "/Sessions/Playing" : what == "progress" ? "/Sessions/Playing/Progress" : "/Sessions/Playing/Stopped";
            return Post(path, new Dictionary<string, object>
            {
                ["ItemId"] = itemId,
                ["PositionTicks"] = positionTicks,
                ["IsPaused"] = paused,
                ["CanSeek"] = true,
                ["PlayMethod"] = "DirectPlay",
                ["PlaySessionId"] = playSessionId
            });
        }
    }
}
