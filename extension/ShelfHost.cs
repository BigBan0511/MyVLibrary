using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Playnite.SDK;
using Playnite.SDK.Data;
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;

namespace MyVLibrary
{
    /// <summary>
    /// Hosts the shelf page in WebView2. The page is served from the plugin's web folder
    /// at https://app.myvlibrary/ and asks for covers at https://media.myvlibrary/.
    /// </summary>
    public class ShelfHost : UserControl, IDisposable
    {
        public enum HostKind { Sidebar, Window, Fullscreen }

        internal const string AppHost = "app.myvlibrary";
        internal const string MediaPrefix = "https://media.myvlibrary/";

        private static readonly ILogger logger = LogManager.GetLogger();
        private static Task<CoreWebView2Environment> environment;

        private readonly MyVLibraryPlugin plugin;
        private readonly Grid root;
        private readonly TextBlock status;
        private WebView2 web;
        private bool disposed;

        public HostKind Kind { get; }

        /// <summary>True when the window holding the shelf is the one in front.</summary>
        public bool IsOnScreen
        {
            get
            {
                var w = Window.GetWindow(this);
                return w != null && w.IsActive && w.WindowState != WindowState.Minimized;
            }
        }

        private Window hostWindow;
        public Guid? FocusGame { get; set; }
        public string ModeName => Kind == HostKind.Fullscreen ? "fullscreen" : Kind == HostKind.Window ? "window" : "desktop";

        public ShelfHost(MyVLibraryPlugin plugin, HostKind kind, Guid? focusGame)
        {
            this.plugin = plugin;
            Kind = kind;
            FocusGame = focusGame;
            root = new Grid { Background = new SolidColorBrush(Color.FromRgb(18, 17, 16)) };
            status = new TextBlock
            {
                Text = Loc.S("Colocando los juegos en la estantería…", "Putting the games on the shelf…"),
                Foreground = new SolidColorBrush(Color.FromRgb(188, 176, 160)),
                FontSize = 16,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                TextAlignment = TextAlignment.Center,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(40)
            };
            root.Children.Add(status);
            Content = root;
            Loaded += async (s, e) =>
            {
                HookWindow();
                await InitAsync();
            };
            Unloaded += (s, e) => UnhookWindow();
        }

        private void HookWindow()
        {
            UnhookWindow();
            hostWindow = Window.GetWindow(this);
            if (hostWindow != null)
            {
                hostWindow.Activated += OnWindowActivated;
                hostWindow.StateChanged += OnWindowActivated;
            }
        }

        private void UnhookWindow()
        {
            if (hostWindow != null)
            {
                hostWindow.Activated -= OnWindowActivated;
                hostWindow.StateChanged -= OnWindowActivated;
                hostWindow = null;
            }
        }

        private void OnWindowActivated(object sender, EventArgs e)
        {
            if (IsOnScreen) Post(new System.Collections.Generic.Dictionary<string, object> { ["type"] = "activated" });
            PostWindowState();
        }

        /// <summary>Whether the window is maximised, so the page's own window buttons show the right icon.</summary>
        internal bool IsMaximized => (hostWindow ?? Window.GetWindow(this))?.WindowState == WindowState.Maximized;

        private void PostWindowState() => Post(new System.Collections.Generic.Dictionary<string, object> { ["type"] = "winState", ["max"] = IsMaximized });

        [DllImport("user32.dll")] private static extern bool ReleaseCapture();
        [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);

        /// <summary>
        /// The window buttons and the drag strip the page draws in the sidebar, where the web view covers
        /// Playnite's own: minimise, maximise or restore, close, and moving the window by its top bar.
        /// </summary>
        internal void WindowAction(string act)
        {
            var w = hostWindow ?? Window.GetWindow(this);
            if (w == null) return;
            try
            {
                switch (act)
                {
                    case "min":
                        w.WindowState = WindowState.Minimized;
                        break;
                    case "max":
                        w.WindowState = w.WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                        break;
                    case "close":
                        w.Close();
                        break;
                    case "drag":
                        // only while the left button is still held: the same move a title bar starts
                        if ((GetAsyncKeyState(0x01) & 0x8000) == 0) return;
                        var handle = new WindowInteropHelper(w).Handle;
                        ReleaseCapture();
                        SendMessage(handle, 0x0112 /* WM_SYSCOMMAND */, (IntPtr)0xF012 /* SC_MOVE + HTCAPTION */, IntPtr.Zero);
                        break;
                }
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido " + act + " la ventana");
            }
        }

        private static Task<CoreWebView2Environment> GetEnvironment(MyVLibraryPlugin plugin)
        {
            if (environment == null)
            {
                // Playnite's own folder does not have WebView2Loader.dll; ours does, per architecture
                var arch = Environment.Is64BitProcess ? "x64" : "x86";
                var loaderDir = Path.Combine(plugin.PluginDir, "runtimes", "win-" + arch, "native");
                if (File.Exists(Path.Combine(loaderDir, "WebView2Loader.dll")))
                {
                    try
                    {
                        CoreWebView2Environment.SetLoaderDllFolderPath(loaderDir);
                    }
                    catch (Exception e)
                    {
                        // another extension already loaded WebView2 in this process: its loader works for us too
                        logger.Warn(e, "MyVLibrary: WebView2Loader ya estaba cargado");
                    }
                }

                var dataDir = Path.Combine(plugin.GetPluginUserDataPath(), "WebView2");
                // the shelf plays its sounds when the controller is used, which is not a "user gesture" for the page
                var options = new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required");
                environment = CoreWebView2Environment.CreateAsync(null, dataDir, options);
            }

            return environment;
        }

        private async Task InitAsync()
        {
            if (web != null || disposed)
            {
                return;
            }

            try
            {
                if (!File.Exists(Path.Combine(plugin.WebDir, "index.html")))
                {
                    status.Text = Loc.S("Falta la carpeta «web» de la extensión. Reinstala MyVLibrary.", "The extension's «web» folder is missing. Reinstall MyVLibrary.");
                    return;
                }

                var env = await GetEnvironment(plugin);
                if (disposed)
                {
                    return;
                }

                web = new WebView2 { DefaultBackgroundColor = System.Drawing.Color.FromArgb(255, 18, 17, 16) };
                root.Children.Add(web);
                await web.EnsureCoreWebView2Async(env);
                if (disposed)
                {
                    return;
                }

                var core = web.CoreWebView2;
                core.Settings.AreDevToolsEnabled = plugin.Settings.DevTools;
                core.Settings.AreDefaultContextMenusEnabled = plugin.Settings.DevTools;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = false;
                core.Settings.AreBrowserAcceleratorKeysEnabled = plugin.Settings.DevTools;
                core.SetVirtualHostNameToFolderMapping(AppHost, plugin.WebDir, CoreWebView2HostResourceAccessKind.Deny);
                // trailers and logos from Extra Metadata Loader, and pictures downloaded from descriptions
                // (made if it is not there yet, so pictures saved from the card can be shown straight away)
                try
                {
                    Directory.CreateDirectory(plugin.Bridge.ExtraRoot);
                }
                catch (Exception e)
                {
                    logger.Warn(e, "MyVLibrary: no se ha podido crear la carpeta ExtraMetadata");
                }

                if (Directory.Exists(plugin.Bridge.ExtraRoot))
                {
                    core.SetVirtualHostNameToFolderMapping("extra.myvlibrary", plugin.Bridge.ExtraRoot, CoreWebView2HostResourceAccessKind.Allow);
                }

                core.SetVirtualHostNameToFolderMapping("cache.myvlibrary", plugin.Bridge.RemoteDir, CoreWebView2HostResourceAccessKind.Allow);
                core.AddWebResourceRequestedFilter(MediaPrefix + "*", CoreWebView2WebResourceContext.All);
                core.WebResourceRequested += OnResourceRequested;
                core.WebMessageReceived += OnWebMessage;
                core.NewWindowRequested += (s, a) => a.Handled = true;
                core.NavigationStarting += (s, a) =>
                {
                    if (!a.Uri.StartsWith("https://" + AppHost + "/", StringComparison.OrdinalIgnoreCase))
                    {
                        a.Cancel = true;
                    }
                };
                core.ProcessFailed += (s, a) =>
                {
                    logger.Warn($"MyVLibrary: WebView2 process failed ({a.ProcessFailedKind})");
                    if (a.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited || a.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessUnresponsive)
                    {
                        try { core.Reload(); } catch { }
                    }
                };

                plugin.Bridge.Attach(this);
                core.Navigate("https://" + AppHost + "/index.html");
                status.Visibility = Visibility.Collapsed;
                web.Focus();
            }
            catch (WebView2RuntimeNotFoundException)
            {
                status.Text = Loc.S("La estantería necesita el componente WebView2 de Microsoft, que no está instalado.\n" +
                                    "Descárgalo gratis buscando «WebView2 Runtime» en la web de Microsoft, instálalo y vuelve a abrir la estantería.",
                                    "The shelf needs Microsoft's WebView2 component, which is not installed.\n" +
                                    "Get it free by searching for «WebView2 Runtime» on Microsoft's website, install it and open the shelf again.");
                RemoveWeb();
            }
            catch (Exception e)
            {
                logger.Error(e, "MyVLibrary: no se ha podido iniciar WebView2");
                status.Text = Loc.S("No se ha podido abrir la estantería:\n", "Could not open the shelf:\n") + e.Message;
                RemoveWeb();
            }
        }

        private void RemoveWeb()
        {
            if (web != null)
            {
                root.Children.Remove(web);
                web.Dispose();
                web = null;
            }

            status.Visibility = Visibility.Visible;
        }

        public void Post(object message)
        {
            if (disposed || web?.CoreWebView2 == null)
            {
                return;
            }

            try
            {
                web.CoreWebView2.PostWebMessageAsJson(Serialization.ToJson(message));
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se ha podido enviar un mensaje a la estantería");
            }
        }

        private void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (e.Source == null || !e.Source.StartsWith("https://" + AppHost + "/", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            plugin.Bridge.Handle(this, e.WebMessageAsJson);
        }

        /// <summary>Covers and backgrounds: resized on a worker thread, answered on the UI thread.</summary>
        private void OnResourceRequested(object sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            var core = web?.CoreWebView2;
            if (core == null)
            {
                return;
            }

            var uri = e.Request.Uri;
            string range = null;
            try { if (e.Request.Headers.Contains("Range")) range = e.Request.Headers.GetHeader("Range"); } catch { }
            var deferral = e.GetDeferral();
            var env = core.Environment;
            Task.Run(() => plugin.Bridge.LoadMedia(uri, range)).ContinueWith(t =>
            {
                Dispatcher.BeginInvoke(new Action(() =>
                {
                    try
                    {
                        if (disposed)
                        {
                            return;
                        }

                        var media = t.Status == TaskStatus.RanToCompletion ? t.Result : null;
                        if (media != null)
                        {
                            e.Response = env.CreateWebResourceResponse(new MemoryStream(media.Bytes), media.Status, media.Status == 206 ? "Partial Content" : "OK",
                                media.Headers ?? "Content-Type: " + media.ContentType + "\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: max-age=31536000");
                        }
                        else
                        {
                            e.Response = env.CreateWebResourceResponse(null, 404, "Not Found", "Access-Control-Allow-Origin: *");
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.Warn(ex, "MyVLibrary: error al servir " + uri);
                    }
                    finally
                    {
                        deferral.Complete();
                    }
                }));
            });
        }

        public void Dispose()
        {
            if (disposed)
            {
                return;
            }

            disposed = true;
            UnhookWindow();
            plugin.Bridge.Detach(this);
            if (web != null)
            {
                try
                {
                    if (web.CoreWebView2 != null)
                    {
                        web.CoreWebView2.WebResourceRequested -= OnResourceRequested;
                        web.CoreWebView2.WebMessageReceived -= OnWebMessage;
                    }
                }
                catch { }

                root.Children.Remove(web);
                web.Dispose();
                web = null;
            }
        }
    }
}
