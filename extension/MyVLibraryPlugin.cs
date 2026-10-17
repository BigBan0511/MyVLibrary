using Playnite.SDK;
using Playnite.SDK.Events;
using Playnite.SDK.Models;
using Playnite.SDK.Plugins;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;

namespace MyVLibrary
{
    /// <summary>
    /// MyVLibrary: your Playnite library as a shelf of physical games.
    /// Desktop mode: a sidebar view, a main menu entry and a game menu entry.
    /// Fullscreen mode: a window that can open on start and with LB + RB on the controller.
    /// </summary>
    public class MyVLibraryPlugin : GenericPlugin
    {
        private static readonly ILogger logger = LogManager.GetLogger();

        public override Guid Id { get; } = Guid.Parse("3f1b7c52-6a0e-4c8e-9a51-8e2d7c4b9a10");

        internal ShelfSettingsViewModel SettingsVm { get; }
        internal ShelfSettings Settings => SettingsVm.Settings;
        internal LibraryBridge Bridge { get; }
        internal string PluginDir { get; }
        internal string WebDir => Path.Combine(PluginDir, "web");

        private Window shelfWindow;
        private bool lbDown, rbDown;
        private DateTime lastToggle = DateTime.MinValue;

        public MyVLibraryPlugin(IPlayniteAPI api) : base(api)
        {
            PluginDir = Path.GetDirectoryName(typeof(MyVLibraryPlugin).Assembly.Location);
            SettingsVm = new ShelfSettingsViewModel(this);
            Bridge = new LibraryBridge(this);
            Properties = new GenericPluginProperties { HasSettings = true };
        }

        public override ISettings GetSettings(bool firstRunSettings) => SettingsVm;

        public override UserControl GetSettingsView(bool firstRunView) => new ShelfSettingsView();

        public override void OnApplicationStarted(OnApplicationStartedEventArgs args)
        {
            Bridge.Subscribe();
            if (PlayniteApi.ApplicationInfo.Mode == ApplicationMode.Fullscreen && Settings.OpenOnFullscreenStart)
            {
                // let Playnite finish drawing its own window first
                PlayniteApi.MainView.UIDispatcher.BeginInvoke(new Action(() => OpenWindow(null)), DispatcherPriority.ApplicationIdle);
            }
        }

        public override void OnApplicationStopped(OnApplicationStoppedEventArgs args)
        {
            Bridge.Unsubscribe();
            if (shelfWindow != null)
            {
                try { shelfWindow.Close(); } catch { }
            }
        }

        // ---------- desktop entry points ----------

        public override IEnumerable<SidebarItem> GetSidebarItems()
        {
            ShelfHost host = null;
            yield return new SidebarItem
            {
                Title = "MyVLibrary",
                Type = SiderbarItemType.View,
                Icon = Path.Combine(PluginDir, "icon.png"),
                Opened = () =>
                {
                    host = new ShelfHost(this, ShelfHost.HostKind.Sidebar, null);
                    return host;
                },
                Closed = () =>
                {
                    host?.Dispose();
                    host = null;
                }
            };
        }

        public override IEnumerable<MainMenuItem> GetMainMenuItems(GetMainMenuItemsArgs args)
        {
            yield return new MainMenuItem
            {
                MenuSection = "@MyVLibrary",
                Description = "Abrir la estantería en una ventana",
                Action = a => OpenWindow(null)
            };
        }

        public override IEnumerable<GameMenuItem> GetGameMenuItems(GetGameMenuItemsArgs args)
        {
            if (args.Games == null || args.Games.Count != 1)
            {
                yield break;
            }

            var game = args.Games[0];
            yield return new GameMenuItem
            {
                MenuSection = "MyVLibrary",
                Description = "Ver en la estantería",
                Action = a => OpenWindow(game.Id)
            };
        }

        // ---------- game events, relayed to the shelf ----------

        public override void OnGameStarted(OnGameStartedEventArgs args) => Bridge.GameStarted(args.Game);

        public override void OnGameStopped(OnGameStoppedEventArgs args) => Bridge.GameStopped(args.Game, args.ElapsedSeconds);

        public override void OnGameStartupCancelled(OnGameStartupCancelledEventArgs args) => Bridge.GameCancelled(args.Game);

        // ---------- controller (Playnite only reports it in fullscreen mode) ----------

        public override void OnControllerButtonStateChanged(OnControllerButtonStateChangedArgs args)
        {
            var pressed = args.State == ControllerInputState.Pressed;
            if (args.Button == ControllerInput.LeftShoulder) lbDown = pressed;
            if (args.Button == ControllerInput.RightShoulder) rbDown = pressed;

            if (Settings.ControllerToggle && pressed && lbDown && rbDown && (DateTime.Now - lastToggle).TotalMilliseconds > 800)
            {
                lastToggle = DateTime.Now;
                if (shelfWindow == null) OpenWindow(null); else shelfWindow.Close();
                return;
            }

            if (shelfWindow != null && shelfWindow.IsActive)
            {
                Bridge.ControllerInput(args.Button.ToString(), args.State.ToString());
            }
        }

        // ---------- the window (fullscreen, or desktop from the menus) ----------

        internal void OpenWindow(Guid? focusGame)
        {
            try
            {
                if (shelfWindow != null)
                {
                    shelfWindow.Activate();
                    if (focusGame.HasValue) Bridge.Focus(focusGame.Value);
                    return;
                }

                var fullscreen = PlayniteApi.ApplicationInfo.Mode == ApplicationMode.Fullscreen;
                var window = PlayniteApi.Dialogs.CreateWindow(new WindowCreationOptions
                {
                    ShowCloseButton = !fullscreen,
                    ShowMaximizeButton = !fullscreen,
                    ShowMinimizeButton = !fullscreen
                });

                var host = new ShelfHost(this, fullscreen ? ShelfHost.HostKind.Fullscreen : ShelfHost.HostKind.Window, focusGame);
                window.Title = "MyVLibrary";
                window.Content = host;
                window.Owner = PlayniteApi.Dialogs.GetCurrentAppWindow();
                if (fullscreen)
                {
                    window.WindowStyle = WindowStyle.None;
                    window.ResizeMode = ResizeMode.NoResize;
                    window.WindowState = WindowState.Maximized;
                }
                else
                {
                    window.Width = Math.Min(1500, SystemParameters.WorkArea.Width * .9);
                    window.Height = Math.Min(880, SystemParameters.WorkArea.Height * .9);
                    window.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                }

                window.Closed += (s, e) =>
                {
                    host.Dispose();
                    shelfWindow = null;
                };

                shelfWindow = window;
                window.Show();
                window.Activate();
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: no se ha podido abrir la ventana");
                PlayniteApi.Dialogs.ShowErrorMessage("No se ha podido abrir la estantería:\n" + e.Message, "MyVLibrary");
            }
        }

        internal void CloseHost(ShelfHost host)
        {
            if (host.Kind == ShelfHost.HostKind.Sidebar)
            {
                PlayniteApi.MainView.SwitchToLibraryView();
            }
            else
            {
                shelfWindow?.Close();
            }
        }
    }
}
