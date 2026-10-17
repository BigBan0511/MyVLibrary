using Playnite.SDK;
using Playnite.SDK.Data;
using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace MyVLibrary
{
    /// <summary>A message from the page. Every field is optional; "fields" says which ones an update carries.</summary>
    public class PageMessage
    {
        public string type { get; set; }
        public string id { get; set; }
        public string status { get; set; }
        public List<string> cats { get; set; }
        public int? score { get; set; }
        public string notes { get; set; }
        public string url { get; set; }
        public List<string> fields { get; set; }
    }

    public class MediaFile
    {
        public byte[] Bytes;
        public string ContentType;
    }

    /// <summary>
    /// Everything between Playnite and the shelf: the library as JSON, edits coming back,
    /// game launches, and resized covers.
    /// </summary>
    public class LibraryBridge
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private readonly MyVLibraryPlugin plugin;
        private readonly IPlayniteAPI api;
        private readonly List<ShelfHost> hosts = new List<ShelfHost>();
        private readonly HashSet<Guid> changed = new HashSet<Guid>();
        private readonly HashSet<Guid> removed = new HashSet<Guid>();
        private readonly DispatcherTimer flushTimer;
        private bool subscribed;
        private string cacheDir;

        public LibraryBridge(MyVLibraryPlugin plugin)
        {
            this.plugin = plugin;
            api = plugin.PlayniteApi;
            flushTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(400) };
            flushTimer.Tick += (s, e) => Flush();
        }

        private IGameDatabaseAPI Db => api.Database;

        // ---------- hosts ----------

        public void Attach(ShelfHost host)
        {
            if (!hosts.Contains(host)) hosts.Add(host);
            Subscribe();
        }

        public void Detach(ShelfHost host) => hosts.Remove(host);

        private void Broadcast(object message)
        {
            foreach (var h in hosts.ToList()) h.Post(message);
        }

        public void Focus(Guid id) => Broadcast(new Dictionary<string, object> { ["type"] = "focus", ["id"] = id.ToString() });

        public void ControllerInput(string button, string state)
        {
            foreach (var h in hosts.Where(h => h.Kind == ShelfHost.HostKind.Fullscreen).ToList())
            {
                h.Post(new Dictionary<string, object> { ["type"] = "pad", ["button"] = button, ["state"] = state });
            }
        }

        // ---------- database events ----------

        public void Subscribe()
        {
            if (subscribed || Db == null || !Db.IsOpen) return;
            Db.Games.ItemUpdated += OnGamesUpdated;
            Db.Games.ItemCollectionChanged += OnGamesChanged;
            Db.CompletionStatuses.ItemCollectionChanged += OnListsChanged;
            Db.Categories.ItemCollectionChanged += OnListsChanged;
            subscribed = true;
        }

        public void Unsubscribe()
        {
            if (!subscribed) return;
            Db.Games.ItemUpdated -= OnGamesUpdated;
            Db.Games.ItemCollectionChanged -= OnGamesChanged;
            Db.CompletionStatuses.ItemCollectionChanged -= OnListsChanged;
            Db.Categories.ItemCollectionChanged -= OnListsChanged;
            subscribed = false;
        }

        private readonly object gate = new object();

        private void OnGamesUpdated(object sender, ItemUpdatedEventArgs<Game> e)
        {
            lock (gate) foreach (var u in e.UpdatedItems) changed.Add(u.NewData.Id);
            Schedule();
        }

        private void OnGamesChanged(object sender, ItemCollectionChangedEventArgs<Game> e)
        {
            lock (gate)
            {
                foreach (var g in e.AddedItems) changed.Add(g.Id);
                foreach (var g in e.RemovedItems) removed.Add(g.Id);
            }

            Schedule();
        }

        private void OnListsChanged(object sender, EventArgs e)
        {
            api.MainView.UIDispatcher.BeginInvoke(new Action(() => Broadcast(Lists("lists"))));
        }

        private void Schedule()
        {
            api.MainView.UIDispatcher.BeginInvoke(new Action(() =>
            {
                flushTimer.Stop();
                flushTimer.Start();
            }));
        }

        private void Flush()
        {
            flushTimer.Stop();
            List<Guid> upd, rem;
            lock (gate)
            {
                upd = changed.ToList();
                rem = removed.ToList();
                changed.Clear();
                removed.Clear();
            }

            if (hosts.Count == 0) return;
            var showHidden = plugin.Settings.ShowHidden;
            var games = new List<object>();
            foreach (var id in upd)
            {
                var g = Db.Games.Get(id);
                if (g == null) continue;
                if (g.Hidden && !showHidden) rem.Add(id); else games.Add(Record(g));
            }

            if (games.Count > 0) Broadcast(new Dictionary<string, object> { ["type"] = "games", ["games"] = games });
            if (rem.Count > 0) Broadcast(new Dictionary<string, object> { ["type"] = "removed", ["ids"] = rem.Select(i => i.ToString()).ToList() });
        }

        public void LibraryChanged()
        {
            foreach (var h in hosts.ToList()) h.Post(Library(h));
        }

        // ---------- game events ----------

        public void GameStarted(Game g) => Broadcast(new Dictionary<string, object> { ["type"] = "started", ["id"] = g.Id.ToString() });

        public void GameStopped(Game g, ulong seconds) => Broadcast(new Dictionary<string, object> { ["type"] = "stopped", ["id"] = g.Id.ToString(), ["seconds"] = seconds });

        public void GameCancelled(Game g) => Broadcast(new Dictionary<string, object> { ["type"] = "cancelled", ["id"] = g.Id.ToString() });

        // ---------- the library, as the page wants it ----------

        private static List<string> Names<T>(IEnumerable<T> items, Func<T, string> name) =>
            items == null ? new List<string>() : items.Where(i => i != null).Select(name).Where(n => !string.IsNullOrWhiteSpace(n)).ToList();

        private static string Iso(DateTime? d) => d.HasValue ? d.Value.ToUniversalTime().ToString("o") : null;

        private static string Release(ReleaseDate? r)
        {
            if (!r.HasValue || r.Value.Year <= 0) return null;
            var d = r.Value;
            if (d.Day.HasValue && d.Month.HasValue) return $"{d.Day:00}/{d.Month:00}/{d.Year}";
            if (d.Month.HasValue) return $"{d.Month:00}/{d.Year}";
            return d.Year.ToString();
        }

        private static readonly Regex Tags = new Regex("<[^>]+>", RegexOptions.Compiled);
        private static readonly Regex Spaces = new Regex(@"\s+", RegexOptions.Compiled);

        /// <summary>Plain text of the start of a description, for the back of the case.</summary>
        private static string Summary(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return null;
            var text = WebUtility.HtmlDecode(Tags.Replace(html, " "));
            text = Spaces.Replace(text, " ").Trim();
            if (text.Length <= 360) return text;
            var cut = text.LastIndexOf(' ', 360);
            return text.Substring(0, cut > 200 ? cut : 360).TrimEnd(',', ';', ':', '.') + "…";
        }

        /// <summary>FNV-1a: stable between runs, unlike string.GetHashCode on newer runtimes.</summary>
        private static string Hash(string text)
        {
            uint h = 2166136261;
            foreach (var b in Encoding.UTF8.GetBytes(text ?? ""))
            {
                h ^= b;
                h *= 16777619;
            }

            return h.ToString("x8");
        }

        private static string Version(Game g) => Hash((g.CoverImage ?? "") + "|" + (g.BackgroundImage ?? ""));

        private Dictionary<string, object> Record(Game g)
        {
            return new Dictionary<string, object>
            {
                ["id"] = g.Id.ToString(),
                ["name"] = g.Name,
                ["sort"] = string.IsNullOrWhiteSpace(g.SortingName) ? g.Name : g.SortingName,
                ["status"] = g.CompletionStatus?.Name,
                ["cats"] = Names(g.Categories, c => c.Name),
                ["plats"] = Names(g.Platforms, p => p.Name),
                ["genres"] = Names(g.Genres, x => x.Name),
                ["devs"] = Names(g.Developers, x => x.Name),
                ["pubs"] = Names(g.Publishers, x => x.Name),
                ["features"] = Names(g.Features, x => x.Name),
                ["series"] = Names(g.Series, x => x.Name),
                ["age"] = Names(g.AgeRatings, x => x.Name),
                ["src"] = g.Source?.Name,
                ["year"] = g.ReleaseYear,
                ["release"] = Release(g.ReleaseDate),
                ["playtime"] = g.Playtime,
                ["playCount"] = g.PlayCount,
                ["lastActivity"] = Iso(g.LastActivity),
                ["added"] = Iso(g.Added),
                ["installed"] = g.IsInstalled,
                ["favorite"] = g.Favorite,
                ["score"] = g.UserScore,
                ["critic"] = g.CriticScore,
                ["community"] = g.CommunityScore,
                ["hasCover"] = !string.IsNullOrEmpty(g.CoverImage),
                ["hasBg"] = !string.IsNullOrEmpty(g.BackgroundImage),
                ["ver"] = Version(g),
                ["sum"] = Summary(g.Description)
            };
        }

        private Dictionary<string, object> Lists(string type)
        {
            return new Dictionary<string, object>
            {
                ["type"] = type,
                ["statuses"] = Db.CompletionStatuses.Select(s => new Dictionary<string, object> { ["id"] = s.Id.ToString(), ["name"] = s.Name }).ToList(),
                ["categories"] = Db.Categories.Select(c => new Dictionary<string, object> { ["id"] = c.Id.ToString(), ["name"] = c.Name }).ToList()
            };
        }

        private Dictionary<string, object> Library(ShelfHost host)
        {
            var showHidden = plugin.Settings.ShowHidden;
            var message = Lists("library");
            message["mode"] = host.ModeName;
            message["hostPad"] = host.Kind == ShelfHost.HostKind.Fullscreen;
            message["games"] = Db.Games.Where(g => showHidden || !g.Hidden).Select(Record).ToList();
            if (host.FocusGame.HasValue)
            {
                message["focusId"] = host.FocusGame.Value.ToString();
                host.FocusGame = null;
            }

            return message;
        }

        // ---------- messages from the page ----------

        public void Handle(ShelfHost host, string json)
        {
            PageMessage m;
            try
            {
                m = Serialization.FromJson<PageMessage>(json);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: mensaje no válido");
                return;
            }

            if (m == null || string.IsNullOrEmpty(m.type)) return;

            try
            {
                switch (m.type)
                {
                    case "ready":
                        host.Post(Library(host));
                        break;
                    case "detail":
                        SendDetail(host, m.id);
                        break;
                    case "start":
                        Start(host, m.id);
                        break;
                    case "update":
                        Update(m);
                        break;
                    case "openUrl":
                        OpenUrl(m.url);
                        break;
                    case "close":
                        plugin.CloseHost(host);
                        break;
                }
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: error con el mensaje " + m.type);
            }
        }

        private Game Find(string id) => Guid.TryParse(id, out var guid) ? Db.Games.Get(guid) : null;

        private void SendDetail(ShelfHost host, string id)
        {
            var g = Find(id);
            if (g == null) return;
            host.Post(new Dictionary<string, object>
            {
                ["type"] = "detail",
                ["id"] = id,
                ["desc"] = g.Description,
                ["notes"] = g.Notes,
                ["links"] = (g.Links?.ToList() ?? new List<Link>()).Where(l => l != null).Select(l => new Dictionary<string, object> { ["name"] = l.Name, ["url"] = l.Url }).ToList()
            });
        }

        private void Start(ShelfHost host, string id)
        {
            var g = Find(id);
            Func<string, string, Dictionary<string, object>> msg = (type, reason) => new Dictionary<string, object> { ["type"] = type, ["id"] = id, ["reason"] = reason };
            if (g == null)
            {
                host.Post(msg("failed", "Ese juego ya no está en tu biblioteca."));
                return;
            }

            if (g.IsRunning || g.IsLaunching)
            {
                host.Post(msg("failed", "Ese juego ya está en marcha."));
                return;
            }

            if (!g.IsInstalled)
            {
                host.Post(msg("notInstalled", null));
                api.InstallGame(g.Id);
                return;
            }

            api.StartGame(g.Id);
        }

        private void Update(PageMessage m)
        {
            var g = Find(m.id);
            if (g == null || m.fields == null) return;

            if (m.fields.Contains("status"))
            {
                var st = string.IsNullOrEmpty(m.status) ? null : Db.CompletionStatuses.FirstOrDefault(s => s.Name == m.status);
                g.CompletionStatusId = st?.Id ?? Guid.Empty;
            }

            if (m.fields.Contains("cats"))
            {
                var ids = new List<Guid>();
                foreach (var name in (m.cats ?? new List<string>()).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct())
                {
                    var cat = Db.Categories.FirstOrDefault(c => string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase)) ?? Db.Categories.Add(name.Trim());
                    ids.Add(cat.Id);
                }

                g.CategoryIds = ids;
            }

            if (m.fields.Contains("rating"))
            {
                g.UserScore = m.score.HasValue && m.score.Value > 0 ? Math.Min(100, m.score.Value) : (int?)null;
            }

            if (m.fields.Contains("notes"))
            {
                g.Notes = m.notes;
            }

            Db.Games.Update(g);
        }

        private static void OpenUrl(string url)
        {
            if (Uri.TryCreate(url, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            }
        }

        // ---------- covers and backgrounds ----------

        /// <summary>https://media.myvlibrary/{cover|bg|icon}/{gameId}?w=512 → a JPEG no wider than w, cached on disk.</summary>
        public MediaFile LoadMedia(string url)
        {
            try
            {
                var uri = new Uri(url);
                var parts = uri.AbsolutePath.Trim('/').Split('/');
                if (parts.Length != 2 || !Guid.TryParse(parts[1], out var id)) return null;
                var kind = parts[0];
                var width = 512;
                foreach (var pair in uri.Query.TrimStart('?').Split('&'))
                {
                    var kv = pair.Split('=');
                    if (kv.Length == 2 && kv[0] == "w" && int.TryParse(kv[1], out var w)) width = Math.Max(32, Math.Min(2048, w));
                }

                var g = Db.Games.Get(id);
                if (g == null) return null;
                var file = kind == "cover" ? g.CoverImage : kind == "bg" ? g.BackgroundImage : kind == "icon" ? g.Icon : null;
                var path = ResolveFile(file);
                if (path == null) return null;

                if (cacheDir == null)
                {
                    cacheDir = Path.Combine(plugin.GetPluginUserDataPath(), "cache");
                    Directory.CreateDirectory(cacheDir);
                }

                var info = new FileInfo(path);
                var stamp = Hash(path + "|" + info.Length + "|" + info.LastWriteTimeUtc.Ticks);
                var cached = Path.Combine(cacheDir, $"{kind}-{id:N}-{width}-{stamp}.jpg");
                if (File.Exists(cached))
                {
                    return new MediaFile { Bytes = File.ReadAllBytes(cached), ContentType = "image/jpeg" };
                }

                var bytes = Resize(path, width);
                if (bytes != null)
                {
                    try { File.WriteAllBytes(cached, bytes); } catch { }
                    return new MediaFile { Bytes = bytes, ContentType = "image/jpeg" };
                }

                // a format WPF cannot decode (webp, avif...): the browser can, send it as it is
                var ext = Path.GetExtension(path).ToLowerInvariant();
                var type = ext == ".webp" ? "image/webp" : ext == ".png" ? "image/png" : ext == ".gif" ? "image/gif" : ext == ".avif" ? "image/avif" : ext == ".bmp" ? "image/bmp" : "image/jpeg";
                return new MediaFile { Bytes = File.ReadAllBytes(path), ContentType = type };
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido leer la imagen " + url);
                return null;
            }
        }

        private string ResolveFile(string file)
        {
            if (string.IsNullOrWhiteSpace(file)) return null;
            if (file.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return null;
            var path = Path.IsPathRooted(file) ? file : Db.GetFullFilePath(file);
            return path != null && File.Exists(path) ? path : null;
        }

        private static byte[] Resize(string path, int width)
        {
            try
            {
                var probe = BitmapDecoder.Create(new Uri(path), BitmapCreateOptions.DelayCreation, BitmapCacheOption.None);
                var srcW = probe.Frames[0].PixelWidth;
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                img.CreateOptions = BitmapCreateOptions.IgnoreColorProfile;
                img.UriSource = new Uri(path);
                if (srcW > width) img.DecodePixelWidth = width;
                img.EndInit();
                img.Freeze();

                // JPEG has no alpha: convert every source to plain 24-bit colour first
                var src = new FormatConvertedBitmap(img, System.Windows.Media.PixelFormats.Bgr24, null, 0);
                src.Freeze();

                var enc = new JpegBitmapEncoder { QualityLevel = 88 };
                enc.Frames.Add(BitmapFrame.Create(src));
                using (var ms = new MemoryStream())
                {
                    enc.Save(ms);
                    return ms.ToArray();
                }
            }
            catch
            {
                return null;
            }
        }
    }
}
