using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;

namespace MyVLibrary
{
    public class ShelfSettings : ObservableObject
    {
        private bool openOnFullscreenStart = true;
        private bool controllerToggle = true;
        private bool showHidden = false;
        private bool devTools = false;
        private bool keepTracking = true;
        private bool checkUpdates = true;

        /// <summary>Open the shelf as soon as Playnite starts in fullscreen mode.</summary>
        public bool OpenOnFullscreenStart { get => openOnFullscreenStart; set => SetValue(ref openOnFullscreenStart, value); }

        /// <summary>In fullscreen mode, LB + RB together open and close the shelf.</summary>
        public bool ControllerToggle { get => controllerToggle; set => SetValue(ref controllerToggle, value); }

        /// <summary>Put games marked as hidden in Playnite on the shelf too.</summary>
        public bool ShowHidden { get => showHidden; set => SetValue(ref showHidden, value); }

        /// <summary>
        /// When Playnite thinks a game has closed but a program from its folder is still open,
        /// keep the disc in and add the missing time to Playnite once it really closes.
        /// </summary>
        public bool KeepTracking { get => keepTracking; set => SetValue(ref keepTracking, value); }

        /// <summary>When Playnite starts, look on GitHub for a newer MyVLibrary and offer it in a notification.</summary>
        public bool CheckUpdates { get => checkUpdates; set => SetValue(ref checkUpdates, value); }

        /// <summary>Allow F12 developer tools inside the shelf (for debugging).</summary>
        public bool DevTools { get => devTools; set => SetValue(ref devTools, value); }

        // ---------- Jellyfin: the video room ----------
        private string jellyfinUrl = "";
        private string jellyfinUser = "";
        private string jellyfinPlayer = "system";
        private string vlcPath = "";

        /// <summary>The server, e.g. http://192.168.1.10:8096</summary>
        public string JellyfinUrl { get => jellyfinUrl; set => SetValue(ref jellyfinUrl, value); }
        public string JellyfinUser { get => jellyfinUser; set => SetValue(ref jellyfinUser, value); }
        /// <summary>What logging in gave back; the password itself is never kept.</summary>
        public string JellyfinToken { get; set; } = "";
        public string JellyfinUserId { get; set; } = "";
        public string JellyfinDeviceId { get; set; } = Guid.NewGuid().ToString("N");
        /// <summary>The libraries that become bookcases (empty: every film and series library).</summary>
        public List<string> JellyfinLibraries { get; set; } = new List<string>();
        /// <summary>"system" (whatever plays videos in Windows) or "vlc"; anything else (the old "jmp") counts as "system".</summary>
        public string JellyfinPlayer { get => jellyfinPlayer; set => SetValue(ref jellyfinPlayer, value); }
        public string VlcPath { get => vlcPath; set => SetValue(ref vlcPath, value); }

        // ---------- Navidrome: the record shop ----------
        private string navidromeUrl = "";
        private string navidromeUser = "";

        /// <summary>The server, e.g. http://192.168.1.10:4533</summary>
        public string NavidromeUrl { get => navidromeUrl; set => SetValue(ref navidromeUrl, value); }
        public string NavidromeUser { get => navidromeUser; set => SetValue(ref navidromeUser, value); }
        /// <summary>The password, encrypted for this Windows user (Navidrome needs it for every request); empty when not linked.</summary>
        public string NavidromePassword { get; set; } = "";
    }

    public class ShelfSettingsViewModel : ObservableObject, ISettings
    {
        private readonly MyVLibraryPlugin plugin;
        private ShelfSettings editingClone;
        private ShelfSettings settings;

        public ShelfSettings Settings
        {
            get => settings;
            set { settings = value; OnPropertyChanged(); }
        }

        public ShelfSettingsViewModel(MyVLibraryPlugin plugin)
        {
            this.plugin = plugin;
            Settings = plugin.LoadPluginSettings<ShelfSettings>() ?? new ShelfSettings();
        }

        public void BeginEdit() => editingClone = Serialization.GetClone(Settings);

        public void CancelEdit() => Settings = editingClone;

        public void EndEdit()
        {
            plugin.SavePluginSettings(Settings);
            plugin.Bridge.LibraryChanged();
            plugin.Bridge.RefreshVideo();
            plugin.Bridge.RefreshMusic();
        }

        internal MyVLibraryPlugin Plugin => plugin;

        public bool VerifySettings(out List<string> errors)
        {
            errors = new List<string>();
            return true;
        }
    }

    /// <summary>Settings page, built in code (no XAML to compile): the shelf, the video room and the record shop in tabs.</summary>
    public class ShelfSettingsView : UserControl
    {
        public ShelfSettingsView()
        {
            var panel = new StackPanel { Margin = new Thickness(20) };
            var video = new StackPanel { Margin = new Thickness(20) };
            var music = new StackPanel { Margin = new Thickness(20) };
            TabItem Tab(string header, StackPanel content) => new TabItem { Header = header, Content = new ScrollViewer { Content = content, VerticalScrollBarVisibility = ScrollBarVisibility.Auto } };
            var tabs = new TabControl();
            tabs.Items.Add(Tab(Loc.S("Estantería", "Shelf"), panel));
            tabs.Items.Add(Tab(Loc.S("Vídeo (Jellyfin)", "Video (Jellyfin)"), video));
            tabs.Items.Add(Tab(Loc.S("Música (Navidrome)", "Music (Navidrome)"), music));
            panel.Children.Add(new TextBlock
            {
                Text = "MyVLibrary",
                FontSize = 20,
                Margin = new Thickness(0, 0, 0, 12)
            });

            void Check(string text, string path, string hint)
            {
                var box = new CheckBox { Content = text, Margin = new Thickness(0, 10, 0, 2) };
                box.SetBinding(ToggleButton_IsChecked, new Binding("Settings." + path) { Mode = BindingMode.TwoWay });
                panel.Children.Add(box);
                panel.Children.Add(new TextBlock { Text = hint, Opacity = .7, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(26, 0, 0, 4) });
            }

            Check(Loc.S("Abrir la estantería al iniciar Playnite en pantalla completa", "Open the shelf when Playnite starts in fullscreen"), nameof(ShelfSettings.OpenOnFullscreenStart),
                Loc.S("Sales de ella con B (o Esc) y vuelves a la interfaz de Playnite.", "Leave it with B (or Esc) to go back to Playnite."));
            Check(Loc.S("LB + RB abren y cierran la estantería en pantalla completa", "LB + RB open and close the shelf in fullscreen"), nameof(ShelfSettings.ControllerToggle),
                Loc.S("Pulsa los dos botones superiores del mando a la vez.", "Press both shoulder buttons together."));
            Check(Loc.S("Poner también los juegos ocultos", "Include hidden games"), nameof(ShelfSettings.ShowHidden),
                Loc.S("Por defecto la estantería deja fuera los juegos que tienes ocultos en Playnite.", "By default the shelf leaves out games you have hidden in Playnite."));
            Check(Loc.S("Mantener el disco dentro mientras el juego siga abierto", "Keep the disc in while the game is still open"), nameof(ShelfSettings.KeepTracking),
                Loc.S("Algunos juegos pasan a otro programa al arrancar y Playnite los da por cerrados a los pocos segundos. " +
                      "Si sigue abierto algún programa de la carpeta del juego, el disco no sale hasta que lo cierres y ese tiempo se suma a tus horas en Playnite.",
                      "Some games hand over to another program when they start, and Playnite thinks they closed after a few seconds. " +
                      "If a program from the game's folder is still open, the disc stays in until you close it, and that time is added to your Playnite playtime."));
            Check(Loc.S("Avisar cuando haya una versión nueva", "Tell me when there is a new version"), nameof(ShelfSettings.CheckUpdates),
                Loc.S("Al abrir Playnite mira en GitHub si hay una versión más reciente y te la ofrece en una notificación: haz clic en ella para descargarla e instalarla.",
                      "When Playnite starts, it looks on GitHub for a newer version and offers it in a notification: click it to download and install it."));
            Check(Loc.S("Herramientas de desarrollo (F12)", "Developer tools (F12)"), nameof(ShelfSettings.DevTools),
                Loc.S("Solo para depurar la estantería. Se aplica la próxima vez que la abras.", "Only for debugging the shelf. Applies the next time you open it."));

            AddJellyfin(video);
            AddNavidrome(music);

            panel.Children.Add(new TextBlock
            {
                Text = Loc.S("Los cambios de estado, categorías, valoración y notas que hagas en la estantería se guardan en Playnite. " +
                             "El precinto y el polvo de cada caja solo existen en la estantería.",
                             "Status, categories, rating and notes you change on the shelf are saved to Playnite. " +
                             "The shrink wrap and the dust on each case only exist on the shelf."),
                Opacity = .7,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 18, 0, 0)
            });
            Content = tabs;
        }

        /// <summary>
        /// The record shop: link a Navidrome server. Its API needs the password for every request, so it is kept,
        /// encrypted for this Windows user.
        /// </summary>
        private void AddNavidrome(StackPanel panel)
        {
            panel.Children.Add(new TextBlock { Text = Loc.S("Tienda de música (Navidrome)", "Record shop (Navidrome)"), FontSize = 16, Margin = new Thickness(0, 0, 0, 4) });
            panel.Children.Add(new TextBlock
            {
                Text = Loc.S("Tus álbumes, artistas, canciones y listas de Navidrome aparecen como una tienda de discos. Hasta 1972 salen en vinilo, hasta 1999 en casete y después en CD; las listas, en CD. Suenan en una cadena de música dentro de la estantería y siguen sonando mientras la recorres. El formato se cambia en cada disco o, para todos, en Ajustes → Música dentro de la estantería.",
                             "Your Navidrome albums, artists, songs and playlists appear as a record shop. Up to 1972 they come on vinyl, up to 1999 on cassette and after that on CD; playlists on CD. They play on a hi-fi inside the shelf and keep playing while you walk around it. The format changes on each record or, for all of them, in Settings → Music inside the shelf."),
                Opacity = .7, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8)
            });
            Grid Row(string label, UIElement field)
            {
                var g = new Grid { Margin = new Thickness(0, 3, 0, 3) };
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                var t = new TextBlock { Text = label, VerticalAlignment = VerticalAlignment.Center };
                Grid.SetColumn(field, 1); g.Children.Add(t); g.Children.Add(field);
                panel.Children.Add(g); return g;
            }
            TextBox Bound(string path) { var b = new TextBox(); b.SetBinding(TextBox.TextProperty, new Binding("Settings." + path) { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged }); return b; }
            Row(Loc.S("Servidor", "Server"), Bound(nameof(ShelfSettings.NavidromeUrl)));
            Row(Loc.S("Usuario", "User"), Bound(nameof(ShelfSettings.NavidromeUser)));
            var pass = new PasswordBox();
            Row(Loc.S("Contraseña", "Password"), pass);
            var buttons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(150, 6, 0, 4) };
            var connect = new Button { Content = Loc.S("Conectar", "Connect"), Padding = new Thickness(12, 3, 12, 3) };
            var unlink = new Button { Content = Loc.S("Desvincular", "Unlink"), Padding = new Thickness(12, 3, 12, 3), Margin = new Thickness(8, 0, 0, 0) };
            buttons.Children.Add(connect); buttons.Children.Add(unlink); panel.Children.Add(buttons);
            var status = new TextBlock { Opacity = .8, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(150, 2, 0, 6) };
            panel.Children.Add(status);
            panel.Children.Add(new TextBlock { Text = Loc.S("La contraseña se guarda cifrada para tu usuario de Windows: Navidrome la pide en cada petición. Las canciones que escuchas se guardan un tiempo en la carpeta de la extensión (hasta 1 GB).", "The password is kept encrypted for your Windows user: Navidrome needs it for every request. The songs you play are kept for a while in the extension's folder (up to 1 GB)."), Opacity = .6, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(150, 0, 0, 4) });

            ShelfSettingsViewModel Vm() => DataContext as ShelfSettingsViewModel;
            Loaded += (s, e) => { var vm = Vm(); if (vm == null) return; status.Text = string.IsNullOrEmpty(vm.Settings.NavidromePassword) ? Loc.S("Sin vincular.", "Not linked.") : Loc.S("Vinculado como ", "Linked as ") + vm.Settings.NavidromeUser + "."; };
            connect.Click += async (s, e) =>
            {
                var vm = Vm(); if (vm == null) return;
                var st = vm.Settings;
                if (string.IsNullOrWhiteSpace(st.NavidromeUrl) || string.IsNullOrWhiteSpace(st.NavidromeUser) || pass.Password.Length == 0) { status.Text = Loc.S("Escribe la dirección del servidor, tu usuario y tu contraseña.", "Type the server address, your user and your password."); return; }
                if (!st.NavidromeUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)) st.NavidromeUrl = "http://" + st.NavidromeUrl.Trim();
                connect.IsEnabled = false; status.Text = Loc.S("Conectando…", "Connecting…");
                try
                {
                    await new NavidromeClient(st.NavidromeUrl, st.NavidromeUser, pass.Password).Ping();
                    st.NavidromePassword = Secret.Protect(pass.Password); pass.Clear();
                    status.Text = Loc.S("Vinculado como ", "Linked as ") + st.NavidromeUser + ". " + Loc.S("Guarda los ajustes y la tienda de música aparecerá en la estantería.", "Save the settings and the record shop will appear on the shelf.");
                }
                catch (UnauthorizedAccessException) { status.Text = Loc.S("Usuario o contraseña incorrectos.", "Wrong user or password."); }
                catch (Exception ex) { status.Text = Loc.S("No se ha podido conectar: ", "Could not connect: ") + ex.Message; }
                finally { connect.IsEnabled = true; }
            };
            unlink.Click += (s, e) =>
            {
                var vm = Vm(); if (vm == null) return;
                vm.Settings.NavidromePassword = "";
                status.Text = Loc.S("Sin vincular. Guarda los ajustes para quitar la tienda de música.", "Not linked. Save the settings to remove the record shop.");
            };
        }

        private static readonly DependencyProperty ToggleButton_IsChecked = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty;

        /// <summary>
        /// The video room: link a Jellyfin server (the token is kept, not the password), choose which
        /// libraries become bookcases and which program plays the films.
        /// </summary>
        private void AddJellyfin(StackPanel panel)
        {
            panel.Children.Add(new TextBlock { Text = Loc.S("Sala de vídeo (Jellyfin)", "Video room (Jellyfin)"), FontSize = 16, Margin = new Thickness(0, 0, 0, 4) });
            panel.Children.Add(new TextBlock
            {
                Text = Loc.S("Tus películas y series de Jellyfin aparecen como un videoclub: una estantería por biblioteca. Hasta 1997 salen en VHS, hasta 2014 en DVD y después en Blu-ray, y se puede cambiar cada una. Se ven en el reproductor de Windows o en VLC.",
                             "Your Jellyfin films and series appear as a video shop: one bookcase per library. Up to 1997 they come on VHS, up to 2014 on DVD and after that on Blu-ray, and each one can be changed. They play in the Windows player or VLC."),
                Opacity = .7, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8)
            });

            Grid Row(string label, UIElement field)
            {
                var g = new Grid { Margin = new Thickness(0, 3, 0, 3) };
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                var t = new TextBlock { Text = label, VerticalAlignment = VerticalAlignment.Center };
                Grid.SetColumn(field, 1); g.Children.Add(t); g.Children.Add(field);
                panel.Children.Add(g); return g;
            }
            TextBox Bound(string path) { var b = new TextBox(); b.SetBinding(TextBox.TextProperty, new Binding("Settings." + path) { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged }); return b; }

            Row(Loc.S("Servidor", "Server"), Bound(nameof(ShelfSettings.JellyfinUrl)));
            Row(Loc.S("Usuario", "User"), Bound(nameof(ShelfSettings.JellyfinUser)));
            var pass = new PasswordBox();
            Row(Loc.S("Contraseña", "Password"), pass);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(150, 6, 0, 4) };
            var connect = new Button { Content = Loc.S("Conectar", "Connect"), Padding = new Thickness(12, 3, 12, 3) };
            var unlink = new Button { Content = Loc.S("Desvincular", "Unlink"), Padding = new Thickness(12, 3, 12, 3), Margin = new Thickness(8, 0, 0, 0) };
            buttons.Children.Add(connect); buttons.Children.Add(unlink); panel.Children.Add(buttons);
            var status = new TextBlock { Opacity = .8, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(150, 2, 0, 6) };
            panel.Children.Add(status);
            var libs = new WrapPanel { Margin = new Thickness(150, 0, 0, 6) };
            panel.Children.Add(libs);

            var players = new StackPanel { Orientation = Orientation.Horizontal };
            var system = new RadioButton { Content = Loc.S("El de Windows", "Windows' own"), GroupName = "mvlPlayer", Margin = new Thickness(0, 0, 16, 0) };
            var vlc = new RadioButton { Content = "VLC", GroupName = "mvlPlayer" };
            players.Children.Add(system); players.Children.Add(vlc);
            Row(Loc.S("Reproductor", "Player"), players);
            Row(Loc.S("VLC (opcional)", "VLC (optional)"), Bound(nameof(ShelfSettings.VlcPath)));
            panel.Children.Add(new TextBlock { Text = Loc.S("El de Windows es el que abre las listas .m3u (Reproductor multimedia, si no has cambiado nada); con él la extensión cuenta el tiempo con la ventana abierta, pausas incluidas. VLC dice exactamente por dónde vas. Deja la ruta vacía para que la extensión busque VLC en su sitio de siempre.", "Windows' own is the one that opens .m3u playlists (Media Player, unless you changed it); with it the extension counts the time its window is open, pauses included. VLC tells exactly where you are. Leave the path empty and the extension looks for VLC where it is usually installed."), Opacity = .6, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(150, 0, 0, 4) });

            ShelfSettingsViewModel Vm() => DataContext as ShelfSettingsViewModel;

            async void ShowLibraries()
            {
                var vm = Vm(); if (vm == null) return;
                var st = vm.Settings; libs.Children.Clear();
                if (string.IsNullOrEmpty(st.JellyfinToken)) { status.Text = Loc.S("Sin vincular.", "Not linked."); return; }
                status.Text = Loc.S("Vinculado como ", "Linked as ") + st.JellyfinUser + ". " + Loc.S("Bibliotecas:", "Libraries:");
                try
                {
                    var all = await new JellyfinClient(st).VideoLibraries();
                    foreach (var lib in all)
                    {
                        var box = new CheckBox { Content = lib.Name, Margin = new Thickness(0, 2, 14, 2), IsChecked = st.JellyfinLibraries.Count == 0 || st.JellyfinLibraries.Contains(lib.Id) };
                        var id = lib.Id;
                        box.Checked += (s, e) => { if (st.JellyfinLibraries.Count == 0) return; if (!st.JellyfinLibraries.Contains(id)) st.JellyfinLibraries.Add(id); };
                        box.Unchecked += (s, e) =>
                        {
                            if (st.JellyfinLibraries.Count == 0) st.JellyfinLibraries = all.Select(l => l.Id).ToList();
                            st.JellyfinLibraries.Remove(id);
                        };
                        libs.Children.Add(box);
                    }
                    if (all.Count == 0) status.Text += " " + Loc.S("ninguna de películas o series.", "none with films or series.");
                }
                catch (Exception e)
                {
                    status.Text = Loc.S("Vinculado, pero el servidor no contesta: ", "Linked, but the server does not answer: ") + e.Message;
                }
            }

            Loaded += (s, e) =>
            {
                var vm = Vm(); if (vm == null) return;
                system.IsChecked = vm.Settings.JellyfinPlayer != "vlc"; vlc.IsChecked = vm.Settings.JellyfinPlayer == "vlc";
                ShowLibraries();
            };
            system.Checked += (s, e) => { var vm = Vm(); if (vm != null) vm.Settings.JellyfinPlayer = "system"; };
            vlc.Checked += (s, e) => { var vm = Vm(); if (vm != null) vm.Settings.JellyfinPlayer = "vlc"; };
            connect.Click += async (s, e) =>
            {
                var vm = Vm(); if (vm == null) return;
                var st = vm.Settings;
                if (string.IsNullOrWhiteSpace(st.JellyfinUrl) || string.IsNullOrWhiteSpace(st.JellyfinUser)) { status.Text = Loc.S("Escribe la dirección del servidor y tu usuario.", "Type the server address and your user."); return; }
                if (!st.JellyfinUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)) st.JellyfinUrl = "http://" + st.JellyfinUrl.Trim();
                connect.IsEnabled = false; status.Text = Loc.S("Conectando…", "Connecting…");
                try
                {
                    var auth = await JellyfinClient.Login(st.JellyfinUrl, st.JellyfinUser, pass.Password, st.JellyfinDeviceId);
                    st.JellyfinToken = auth.AccessToken; st.JellyfinUserId = auth.User?.Id ?? ""; pass.Clear();
                    ShowLibraries();
                }
                catch (UnauthorizedAccessException) { status.Text = Loc.S("Usuario o contraseña incorrectos.", "Wrong user or password."); }
                catch (Exception ex) { status.Text = Loc.S("No se ha podido conectar: ", "Could not connect: ") + ex.Message; }
                finally { connect.IsEnabled = true; }
            };
            unlink.Click += (s, e) =>
            {
                var vm = Vm(); if (vm == null) return;
                vm.Settings.JellyfinToken = ""; vm.Settings.JellyfinUserId = ""; vm.Settings.JellyfinLibraries = new List<string>();
                libs.Children.Clear(); status.Text = Loc.S("Sin vincular. Guarda los ajustes para quitar la sala de vídeo.", "Not linked. Save the settings to remove the video room.");
            };
        }
    }
}
