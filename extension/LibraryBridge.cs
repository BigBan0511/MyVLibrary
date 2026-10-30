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
using System.Threading.Tasks;
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
        public string name { get; set; }
        public List<string> fields { get; set; }
        /* the video room */
        public string season { get; set; }
        public long? start { get; set; }
        /* what to do with a game from its card: install, uninstall, markOn, markOff, folder, reveal; for manual: pick, remove */
        public string act { get; set; }
        /* a picture for the case: full, back, spine or disc, and the picture itself as a data address;
           for setFit, the face (front too) and how it is framed, as JSON */
        public string kind { get; set; }
        /* update: the platform's id, to change a game's platform */
        public string platform { get; set; }
        public string data { get; set; }
    }

    public class MediaFile
    {
        public byte[] Bytes;
        public string ContentType;
        /* a song is served in pieces: 206 and its own headers */
        public int Status = 200;
        public string Headers;
    }

    /// <summary>
    /// Everything between Playnite and the shelf: the library as JSON, edits coming back,
    /// game launches, and resized covers.
    /// </summary>
    public partial class LibraryBridge
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private readonly MyVLibraryPlugin plugin;
        private readonly IPlayniteAPI api;
        private readonly List<ShelfHost> hosts = new List<ShelfHost>();
        private readonly HashSet<Guid> changed = new HashSet<Guid>();
        private readonly HashSet<Guid> removed = new HashSet<Guid>();
        private readonly DispatcherTimer flushTimer;
        private readonly Dictionary<Guid, DateTime> running = new Dictionary<Guid, DateTime>();
        private readonly HashSet<string> fetching = new HashSet<string>();
        private bool subscribed;
        private string cacheDir;

        internal string ExtraRoot => Path.Combine(api.Paths.ConfigurationPath, "ExtraMetadata", "games");
        internal string RemoteDir
        {
            get
            {
                var dir = Path.Combine(plugin.GetPluginUserDataPath(), "cache", "remote");
                Directory.CreateDirectory(dir);
                return dir;
            }
        }

        private string Extra(Guid id, string file) => Path.Combine(ExtraRoot, id.ToString(), file);

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
            Db.Platforms.ItemCollectionChanged += OnListsChanged;
            WatchPresets(true);
            subscribed = true;
        }

        public void Unsubscribe()
        {
            if (!subscribed) return;
            Db.Games.ItemUpdated -= OnGamesUpdated;
            Db.Games.ItemCollectionChanged -= OnGamesChanged;
            Db.CompletionStatuses.ItemCollectionChanged -= OnListsChanged;
            Db.Categories.ItemCollectionChanged -= OnListsChanged;
            Db.Platforms.ItemCollectionChanged -= OnListsChanged;
            WatchPresets(false);
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

        /// <summary>A game Playnite has given up on whose programs are still open: the shelf keeps it in the console.</summary>
        private class Leftover
        {
            public string Folder;
            public HashSet<int> Exclude;
            public ulong PlayniteSeconds;
            public DateTime Since;
            public DateTime LastSeen;
            public int Misses;
            public bool Checking;
        }

        private readonly Dictionary<Guid, HashSet<int>> before = new Dictionary<Guid, HashSet<int>>();
        private readonly Dictionary<Guid, Leftover> leftovers = new Dictionary<Guid, Leftover>();
        private DispatcherTimer leftoverTimer;
        private static readonly TimeSpan LeftoverTick = TimeSpan.FromSeconds(4);
        private static readonly TimeSpan LeftoverLimit = TimeSpan.FromHours(12);

        private string GameFolder(Game g)
        {
            var dir = g?.InstallDirectory;
            if (string.IsNullOrWhiteSpace(dir)) return null;
            try { dir = api.ExpandGameVariables(g, dir); } catch { }
            return ProcessWatch.Folder(dir);
        }

        /// <summary>Before launching: whatever already runs from the game's folder (a tray tool, say) never counts as the game.</summary>
        public void GameStarting(Game g)
        {
            before.Remove(g.Id);
            if (!plugin.Settings.KeepTracking) return;
            try
            {
                var folder = GameFolder(g);
                if (folder != null) before[g.Id] = ProcessWatch.In(folder);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se han podido mirar los procesos");
            }
        }

        public void GameStarted(Game g)
        {
            leftovers.Remove(g.Id);
            running[g.Id] = DateTime.Now;
            Broadcast(new Dictionary<string, object> { ["type"] = "started", ["id"] = g.Id.ToString() });
        }

        /// <summary>
        /// Playnite says the game has closed. If a program from its folder is still open (Playnite lost track of it),
        /// the disc stays in until that program closes too, and the missing time is added to Playnite afterwards.
        /// </summary>
        public void GameStopped(Game g, ulong seconds)
        {
            if (plugin.Settings.KeepTracking && running.ContainsKey(g.Id) && !leftovers.ContainsKey(g.Id))
            {
                try
                {
                    var folder = GameFolder(g);
                    if (folder != null)
                    {
                        var exclude = before.TryGetValue(g.Id, out var b) ? b : new HashSet<int>();
                        var still = ProcessWatch.In(folder);
                        still.ExceptWith(exclude);
                        if (still.Count > 0)
                        {
                            logger.Info($"MyVLibrary: Playnite ha dado por cerrado {g.Name}, pero siguen abiertos {still.Count} programas de su carpeta");
                            leftovers[g.Id] = new Leftover { Folder = folder, Exclude = exclude, PlayniteSeconds = seconds, Since = DateTime.Now, LastSeen = DateTime.Now };
                            Broadcast(new Dictionary<string, object> { ["type"] = "tracking", ["id"] = g.Id.ToString() });
                            StartLeftoverTimer();
                            return;
                        }
                    }
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: no se han podido mirar los procesos");
                }
            }

            before.Remove(g.Id);
            Stopped(g.Id, seconds);
        }

        /// <summary>Each shelf is told whether it is on screen right now, so it can wait to animate the disc coming out.</summary>
        private void Stopped(Guid id, ulong seconds)
        {
            running.Remove(id);
            foreach (var h in hosts.ToList())
            {
                h.Post(new Dictionary<string, object> { ["type"] = "stopped", ["id"] = id.ToString(), ["seconds"] = seconds, ["active"] = h.IsOnScreen });
            }
        }

        public void GameCancelled(Game g)
        {
            running.Remove(g.Id);
            before.Remove(g.Id);
            leftovers.Remove(g.Id);
            Broadcast(new Dictionary<string, object> { ["type"] = "cancelled", ["id"] = g.Id.ToString() });
        }

        private void StartLeftoverTimer()
        {
            if (leftoverTimer == null)
            {
                leftoverTimer = new DispatcherTimer(DispatcherPriority.Background, api.MainView.UIDispatcher) { Interval = LeftoverTick };
                leftoverTimer.Tick += (s, e) => CheckLeftovers();
            }

            leftoverTimer.Start();
        }

        private void CheckLeftovers()
        {
            if (leftovers.Count == 0)
            {
                leftoverTimer.Stop();
                return;
            }

            foreach (var pair in leftovers.ToList())
            {
                var id = pair.Key;
                var w = pair.Value;
                if (w.Checking) continue;
                if (DateTime.Now - w.Since > LeftoverLimit)
                {
                    FinishLeftover(id, true);
                    continue;
                }

                w.Checking = true;
                Task.Run(() =>
                {
                    var still = ProcessWatch.In(w.Folder);
                    still.ExceptWith(w.Exclude);
                    return still.Count;
                }).ContinueWith(t =>
                {
                    api.MainView.UIDispatcher.BeginInvoke(new Action(() =>
                    {
                        w.Checking = false;
                        if (!leftovers.TryGetValue(id, out var cur) || cur != w) return;
                        var open = t.Status == TaskStatus.RanToCompletion && t.Result > 0;
                        if (open)
                        {
                            w.LastSeen = DateTime.Now;
                            w.Misses = 0;
                        }
                        else if (++w.Misses >= 2)
                        {
                            FinishLeftover(id, true);
                        }
                    }));
                });
            }
        }

        /// <summary>The game's last program has closed (or the disc was pulled out): add the time Playnite missed.</summary>
        private void FinishLeftover(Guid id, bool announce)
        {
            if (!leftovers.TryGetValue(id, out var w)) return;
            leftovers.Remove(id);
            before.Remove(id);
            var extra = (ulong)Math.Max(0, Math.Round((w.LastSeen - w.Since).TotalSeconds + LeftoverTick.TotalSeconds / 2));
            try
            {
                var g = Db.Games.Get(id);
                if (g != null && extra > 0)
                {
                    g.Playtime += extra;
                    g.LastActivity = DateTime.Now;
                    Db.Games.Update(g);
                    logger.Info($"MyVLibrary: {g.Name} ha seguido abierto {extra} s más; sumados a su tiempo de juego");
                }
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: no se ha podido sumar el tiempo de juego");
            }

            if (announce) Stopped(id, w.PlayniteSeconds + extra);
            else running.Remove(id);
        }

        /// <summary>Playnite is closing: keep the time of any game still being watched.</summary>
        public void Shutdown()
        {
            foreach (var id in leftovers.Keys.ToList()) FinishLeftover(id, false);
            leftoverTimer?.Stop();
        }

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
                ["presets"] = PresetsOf(g),
                ["favorite"] = g.Favorite,
                ["score"] = g.UserScore,
                ["critic"] = g.CriticScore,
                ["community"] = g.CommunityScore,
                ["hasCover"] = !string.IsNullOrEmpty(g.CoverImage),
                ["hasBg"] = !string.IsNullOrEmpty(g.BackgroundImage),
                ["hasLogo"] = File.Exists(Extra(g.Id, "Logo.png")),
                ["scans"] = ArtOf(g.Id),
                ["scanFit"] = FitOf(g.Id),
                ["coverVer"] = Hash(g.CoverImage ?? ""),
                ["manual"] = ManualOf(g),
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
                ["categories"] = Db.Categories.Select(c => new Dictionary<string, object> { ["id"] = c.Id.ToString(), ["name"] = c.Name }).ToList(),
                ["platforms"] = Db.Platforms.Select(p => new Dictionary<string, object> { ["id"] = p.Id.ToString(), ["name"] = p.Name }).ToList(),
                ["presets"] = PresetList()
            };
        }

        private Dictionary<string, object> Library(ShelfHost host)
        {
            var showHidden = plugin.Settings.ShowHidden;
            LoadPresets();
            var message = Lists("library");
            message["mode"] = host.ModeName;
            message["lang"] = api.ApplicationSettings.Language;
            message["running"] = running.Select(r => new Dictionary<string, object> { ["id"] = r.Key.ToString(), ["seconds"] = (int)(DateTime.Now - r.Value).TotalSeconds }).ToList();
            message["hostPad"] = host.Kind == ShelfHost.HostKind.Fullscreen;
            message["maximized"] = host.IsMaximized;
            message["games"] = Db.Games.Where(g => showHidden || !g.Hidden).Select(Record).ToList();
            /* films and series: the kept list now, Jellyfin's fresh one when it answers */
            var video = CachedVideo();
            if (video != null) message["video"] = video;
            RefreshVideo(false);
            /* the record shop: the same, from Navidrome */
            var music = CachedMusic();
            if (music != null) message["music"] = music;
            RefreshMusic(false);
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
                    case "fetch":
                        Fetch(host, m.url);
                        break;
                    case "createStatus":
                        CreateStatus(m);
                        break;
                    case "release":
                        // the disc was pulled out by hand while the shelf was the one keeping track
                        if (Guid.TryParse(m.id, out var rid)) FinishLeftover(rid, false);
                        break;
                    case "createCategory":
                        if (!string.IsNullOrWhiteSpace(m.name)) Db.Categories.Add(m.name.Trim());
                        break;
                    case "game":
                        GameAction(host, m);
                        break;
                    case "window":
                        host.WindowAction(m.act);
                        break;
                    case "setArt":
                        SetArt(host, m);
                        break;
                    case "setFit":
                        SetFit(host, m);
                        break;
                    case "manual":
                        ManualAction(host, m);
                        break;
                    case "jfSeasons":
                        VideoSeasons(host, m.id);
                        break;
                    case "jfEpisodes":
                        VideoEpisodes(host, m.id, m.season);
                        break;
                    case "jfPlay":
                        VideoPlay(m.id, m.start ?? 0);
                        break;
                    case "jfStop":
                        VideoStop();
                        break;
                    case "ndScrobble":
                        MusicScrobble(m.id);
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
                ["images"] = MediaIn(g.Description, ImgSrc),
                ["videos"] = MediaIn(g.Description, VideoSrc),
                ["trailer"] = File.Exists(Extra(g.Id, "VideoTrailer.mp4")) ? $"https://extra.myvlibrary/{g.Id}/VideoTrailer.mp4"
                            : File.Exists(Extra(g.Id, "VideoMicrotrailer.mp4")) ? $"https://extra.myvlibrary/{g.Id}/VideoMicrotrailer.mp4" : null,
                ["links"] = (g.Links?.ToList() ?? new List<Link>()).Where(l => l != null).Select(l => new Dictionary<string, object> { ["name"] = l.Name, ["url"] = l.Url }).ToList()
            });
        }

        private void Start(ShelfHost host, string id)
        {
            var g = Find(id);
            Func<string, string, Dictionary<string, object>> msg = (type, reason) => new Dictionary<string, object> { ["type"] = type, ["id"] = id, ["reason"] = reason };
            if (g == null)
            {
                host.Post(msg("failed", Loc.S("Ese juego ya no está en tu biblioteca.", "That game is no longer in your library.")));
                return;
            }

            if (g.IsRunning || g.IsLaunching)
            {
                host.Post(msg("failed", Loc.S("Ese juego ya está en marcha.", "That game is already running.")));
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

        /// <summary>A line for the page to show as a toast.</summary>
        private static void Notice(ShelfHost host, string text) => host.Post(new Dictionary<string, object> { ["type"] = "notice", ["text"] = text });

        /// <summary>The buttons on a game's card: Playnite installs, uninstalls, corrects what it has noted, opens the folder or shows the game.</summary>
        private void GameAction(ShelfHost host, PageMessage m)
        {
            var g = Find(m.id);
            if (g == null)
            {
                Notice(host, Loc.S("Ese juego ya no está en tu biblioteca.", "That game is no longer in your library."));
                return;
            }

            switch (m.act)
            {
                case "install":
                    if (g.IsInstalled)
                    {
                        Notice(host, Loc.S("Playnite ya lo tiene como instalado.", "Playnite already has it as installed."));
                        return;
                    }

                    api.InstallGame(g.Id);
                    break;

                case "uninstall":
                    if (g.IsRunning || g.IsLaunching)
                    {
                        Notice(host, Loc.S("Ciérralo antes de desinstalarlo.", "Close it before uninstalling it."));
                        return;
                    }

                    if (api.Dialogs.ShowMessage(Loc.S($"¿Desinstalar {g.Name}?", $"Uninstall {g.Name}?"), "MyVLibrary", System.Windows.MessageBoxButton.YesNo) != System.Windows.MessageBoxResult.Yes) return;
                    api.UninstallGame(g.Id);
                    break;

                case "markOn":
                case "markOff":
                    // only what Playnite has noted down: nothing is installed or deleted
                    g.IsInstalled = m.act == "markOn";
                    Db.Games.Update(g);
                    break;

                case "folder":
                    var dir = g.InstallDirectory;
                    try
                    {
                        if (!string.IsNullOrWhiteSpace(dir)) dir = api.ExpandGameVariables(g, dir);
                    }
                    catch
                    {
                        // keep it as it is
                    }

                    if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir))
                    {
                        Notice(host, Loc.S("Playnite no tiene una carpeta de instalación para este juego.", "Playnite has no install folder for this game."));
                        return;
                    }

                    Process.Start("explorer.exe", "\"" + dir + "\"");
                    break;

                case "reveal":
                    plugin.CloseHost(host);
                    api.MainView.SelectGame(g.Id);
                    break;
            }
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

            /* a game Playnite has on the wrong platform: the one chosen in the card replaces what it had */
            if (m.fields.Contains("platform") && Guid.TryParse(m.platform, out var pid) && Db.Platforms.Get(pid) != null)
            {
                g.PlatformIds = new List<Guid> { pid };
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

        // ---------- pictures and trailers mentioned in the description ----------

        private static readonly Regex ImgSrc = new Regex("<img[^>]+?src\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex VideoSrc = new Regex("<(?:video|source)[^>]+?src\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static List<string> MediaIn(string html, Regex re)
        {
            if (string.IsNullOrEmpty(html)) return new List<string>();
            return re.Matches(html).Cast<Match>().Select(m => WebUtility.HtmlDecode(m.Groups[1].Value).Trim())
                .Where(u => u.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                .Distinct().Take(12).ToList();
        }

        /// <summary>Downloads a picture or video from the description once and serves it from https://cache.myvlibrary/remote/.</summary>
        private void Fetch(ShelfHost host, string url)
        {
            var dispatcher = api.MainView.UIDispatcher;
            Action<string> reply = served => dispatcher.BeginInvoke(new Action(() => host.Post(new Dictionary<string, object> { ["type"] = "fetched", ["url"] = url, ["local"] = served })));
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                reply(null);
                return;
            }

            var ext = Path.GetExtension(uri.AbsolutePath).ToLowerInvariant();
            if (ext.Length > 6 || ext.Length < 2) ext = ".bin";
            var name = Hash(url) + Hash(url + "#") + ext;
            var file = Path.Combine(RemoteDir, name);
            var local = "https://cache.myvlibrary/" + name;
            if (File.Exists(file))
            {
                reply(local);
                return;
            }

            lock (fetching)
            {
                if (fetching.Contains(url)) return;
                fetching.Add(url);
            }

            Task.Run(() =>
            {
                var tmp = file + ".part";
                try
                {
                    ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                    var req = (HttpWebRequest)WebRequest.Create(uri);
                    req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Playnite MyVLibrary";
                    req.Timeout = 30000;
                    req.ReadWriteTimeout = 60000;
                    using (var res = (HttpWebResponse)req.GetResponse())
                    {
                        var type = (res.ContentType ?? "").ToLowerInvariant();
                        if (!type.StartsWith("image/") && !type.StartsWith("video/") && !type.StartsWith("application/octet-stream"))
                        {
                            reply(null);
                            return;
                        }

                        using (var input = res.GetResponseStream())
                        using (var output = File.Create(tmp))
                        {
                            var buffer = new byte[81920];
                            long total = 0;
                            int read;
                            while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                            {
                                total += read;
                                if (total > 80L * 1024 * 1024) throw new IOException("demasiado grande");
                                output.Write(buffer, 0, read);
                            }
                        }
                    }

                    File.Move(tmp, file);
                    reply(local);
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: no se ha podido descargar " + url);
                    try { File.Delete(tmp); } catch { }
                    reply(null);
                }
                finally
                {
                    lock (fetching) fetching.Remove(url);
                }
            });
        }

        private void CreateStatus(PageMessage m)
        {
            if (string.IsNullOrWhiteSpace(m.name)) return;
            var st = Db.CompletionStatuses.FirstOrDefault(s => string.Equals(s.Name, m.name.Trim(), StringComparison.OrdinalIgnoreCase)) ?? Db.CompletionStatuses.Add(m.name.Trim());
            var g = Find(m.id);
            if (g != null && st != null)
            {
                g.CompletionStatusId = st.Id;
                Db.Games.Update(g);
            }
        }

        // ---------- covers and backgrounds ----------

        /// <summary>https://media.myvlibrary/{cover|bg|icon}/{gameId}?w=512 → a JPEG no wider than w, cached on disk.</summary>
        public MediaFile LoadMedia(string url, string range = null)
        {
            try
            {
                var uri = new Uri(url);
                var parts = uri.AbsolutePath.Trim('/').Split('/');
                var width = 512;
                string ver = null;
                foreach (var pair in uri.Query.TrimStart('?').Split('&'))
                {
                    var kv = pair.Split('=');
                    if (kv.Length == 2 && kv[0] == "w" && int.TryParse(kv[1], out var w)) width = Math.Max(32, Math.Min(2048, w));
                    if (kv.Length == 2 && kv[0] == "v") ver = Uri.UnescapeDataString(kv[1]);
                }
                /* a film's or series' picture from Jellyfin */
                if (parts.Length == 3 && parts[0] == "jf") return LoadJellyfinImage(parts[1], parts[2], width, ver);
                /* music from Navidrome: a cover, or a song's sound */
                if (parts.Length == 3 && parts[0] == "nd" && parts[1] == "cover") return LoadNavidromeCover(Uri.UnescapeDataString(parts[2]), width);
                if (parts.Length == 3 && parts[0] == "nd" && parts[1] == "stream")
                {
                    var f = uri.Query.TrimStart('?').Split('&').Select(p => p.Split('=')).Where(kv => kv.Length == 2 && kv[0] == "f").Select(kv => Uri.UnescapeDataString(kv[1])).FirstOrDefault();
                    return LoadNavidromeAudio(Uri.UnescapeDataString(parts[2]), f, range);
                }
                if (parts.Length != 2 || !Guid.TryParse(parts[1], out var id)) return null;
                var kind = parts[0];
                /* the game's real manual, a PDF */
                if (kind == "manual") return LoadManual(id);

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
