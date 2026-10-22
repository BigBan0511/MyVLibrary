using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace MyVLibrary
{
    // ---------- what Navidrome answers (the Subsonic API, in JSON) ----------
    public class NdEnvelope { [SerializationPropertyName("subsonic-response")] public NdResponse Response { get; set; } }
    public class NdResponse
    {
        public string status { get; set; }
        public NdError error { get; set; }
        public NdAlbumList albumList2 { get; set; }
        public NdArtists artists { get; set; }
        public NdSearch searchResult3 { get; set; }
        public NdPlaylists playlists { get; set; }
        public NdPlaylist playlist { get; set; }
        public NdAlbum album { get; set; }
    }
    public class NdError { public int code { get; set; } public string message { get; set; } }
    public class NdAlbumList { public List<NdAlbum> album { get; set; } }
    public class NdAlbum
    {
        public string id { get; set; }
        public string name { get; set; }
        public string artist { get; set; }
        public string artistId { get; set; }
        public int? year { get; set; }
        public string genre { get; set; }
        public string coverArt { get; set; }
        public int? duration { get; set; }
        public int? songCount { get; set; }
        public List<NdSong> song { get; set; }
    }
    public class NdArtists { public List<NdIndex> index { get; set; } }
    public class NdIndex { public List<NdArtist> artist { get; set; } }
    public class NdArtist { public string id { get; set; } public string name { get; set; } public string coverArt { get; set; } }
    public class NdSearch { public List<NdSong> song { get; set; } }
    public class NdSong
    {
        public string id { get; set; }
        public string title { get; set; }
        public string album { get; set; }
        public string albumId { get; set; }
        public string artist { get; set; }
        public string artistId { get; set; }
        public int? track { get; set; }
        public int? discNumber { get; set; }
        public int? year { get; set; }
        public string genre { get; set; }
        public string coverArt { get; set; }
        public int? duration { get; set; }
        public string suffix { get; set; }
    }
    public class NdPlaylists { public List<NdPlaylist> playlist { get; set; } }
    public class NdPlaylist
    {
        public string id { get; set; }
        public string name { get; set; }
        public string owner { get; set; }
        public int? duration { get; set; }
        public string coverArt { get; set; }
        public List<NdSong> entry { get; set; }
    }

    /// <summary>The password, kept encrypted for this Windows user (it is needed for every request to Navidrome).</summary>
    internal static class Secret
    {
        public static string Protect(string plain)
        {
            if (string.IsNullOrEmpty(plain)) return "";
            return Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(plain), Encoding.UTF8.GetBytes("MyVLibrary"), DataProtectionScope.CurrentUser));
        }

        public static string Unprotect(string kept)
        {
            if (string.IsNullOrEmpty(kept)) return "";
            try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(kept), Encoding.UTF8.GetBytes("MyVLibrary"), DataProtectionScope.CurrentUser)); }
            catch { return ""; }
        }
    }

    /// <summary>
    /// Talks to the user's Navidrome server through its Subsonic API: the albums, artists, songs and playlists,
    /// the covers, the sound of each song, and which songs have been played.
    /// </summary>
    internal class NavidromeClient
    {
        private static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
        private readonly string url, user, password;

        public NavidromeClient(ShelfSettings s) : this(s.NavidromeUrl, s.NavidromeUser, Secret.Unprotect(s.NavidromePassword)) { }

        public NavidromeClient(string url, string user, string password)
        {
            this.url = (url ?? "").Trim().TrimEnd('/');
            this.user = user ?? "";
            this.password = password ?? "";
        }

        public bool Linked => url.Length > 0 && user.Length > 0 && password.Length > 0;

        /// <summary>Every request carries the user, a fresh salt and the password hashed with it.</summary>
        private string Url(string method, string query = "")
        {
            var salt = Guid.NewGuid().ToString("N").Substring(0, 10);
            string token;
            using (var md5 = MD5.Create()) token = string.Concat(md5.ComputeHash(Encoding.UTF8.GetBytes(password + salt)).Select(b => b.ToString("x2")));
            return $"{url}/rest/{method}?u={Uri.EscapeDataString(user)}&t={token}&s={salt}&v=1.16.1&c=MyVLibrary&f=json" + (query.Length > 0 ? "&" + query : "");
        }

        private async Task<NdResponse> Get(string method, string query = "")
        {
            using (var res = await http.GetAsync(Url(method, query)).ConfigureAwait(false))
            {
                res.EnsureSuccessStatusCode();
                var r = Serialization.FromJson<NdEnvelope>(await res.Content.ReadAsStringAsync().ConfigureAwait(false))?.Response;
                if (r == null) throw new InvalidOperationException(Loc.S("Navidrome no ha contestado bien.", "Navidrome gave an odd answer."));
                if (r.status != "ok")
                {
                    if (r.error?.code == 40) throw new UnauthorizedAccessException(r.error.message);
                    throw new InvalidOperationException(r.error?.message ?? "Navidrome");
                }
                return r;
            }
        }

        public async Task Ping() => await Get("ping").ConfigureAwait(false);

        public async Task<List<NdAlbum>> Albums()
        {
            var all = new List<NdAlbum>();
            for (var offset = 0; ; offset += 500)
            {
                var page = (await Get("getAlbumList2", $"type=alphabeticalByName&size=500&offset={offset}").ConfigureAwait(false)).albumList2?.album ?? new List<NdAlbum>();
                all.AddRange(page);
                if (page.Count < 500) break;
            }
            return all;
        }

        public async Task<List<NdArtist>> Artists() =>
            ((await Get("getArtists").ConfigureAwait(false)).artists?.index ?? new List<NdIndex>()).SelectMany(i => i.artist ?? new List<NdArtist>()).ToList();

        /// <summary>Every song: Navidrome lists them all for an empty search; album by album if it does not.</summary>
        public async Task<List<NdSong>> Songs(List<NdAlbum> albums)
        {
            var all = new List<NdSong>();
            for (var offset = 0; ; offset += 500)
            {
                var page = (await Get("search3", $"query=&artistCount=0&albumCount=0&songCount=500&songOffset={offset}").ConfigureAwait(false)).searchResult3?.song ?? new List<NdSong>();
                all.AddRange(page);
                if (page.Count < 500) break;
            }
            if (all.Count > 0 || albums.Count == 0) return all;
            foreach (var a in albums) all.AddRange((await Get("getAlbum", "id=" + Uri.EscapeDataString(a.id)).ConfigureAwait(false)).album?.song ?? new List<NdSong>());
            return all;
        }

        public async Task<List<NdPlaylist>> Playlists()
        {
            var list = (await Get("getPlaylists").ConfigureAwait(false)).playlists?.playlist ?? new List<NdPlaylist>();
            var full = new List<NdPlaylist>();
            foreach (var p in list)
            {
                try { full.Add((await Get("getPlaylist", "id=" + Uri.EscapeDataString(p.id)).ConfigureAwait(false)).playlist ?? p); }
                catch { full.Add(p); }
            }
            return full;
        }

        public async Task<byte[]> Cover(string id, int size)
        {
            using (var res = await http.GetAsync(Url("getCoverArt", $"id={Uri.EscapeDataString(id)}&size={size}")).ConfigureAwait(false))
            {
                if (!res.IsSuccessStatusCode) return null;
                if ((res.Content.Headers.ContentType?.MediaType ?? "").Contains("json")) return null;
                return await res.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
            }
        }

        /// <summary>A song's sound, as it is when the shelf can play it, converted to MP3 when it cannot.</summary>
        public async Task Download(string id, bool asMp3, string file)
        {
            var q = "id=" + Uri.EscapeDataString(id) + (asMp3 ? "&format=mp3&maxBitRate=320" : "&format=raw");
            using (var res = await http.GetAsync(Url("stream", q), HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false))
            {
                res.EnsureSuccessStatusCode();
                var tmp = file + ".part";
                using (var src = await res.Content.ReadAsStreamAsync().ConfigureAwait(false))
                using (var dst = File.Create(tmp)) await src.CopyToAsync(dst).ConfigureAwait(false);
                if (File.Exists(file)) File.Delete(file);
                File.Move(tmp, file);
            }
        }

        /// <summary>Played: Navidrome counts it like any other player's.</summary>
        public Task Scrobble(string id) => Get("scrobble", "id=" + Uri.EscapeDataString(id) + "&submission=true");
    }
}
