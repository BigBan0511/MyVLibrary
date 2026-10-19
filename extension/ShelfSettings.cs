using Playnite.SDK;
using Playnite.SDK.Data;
using System.Collections.Generic;
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

        /// <summary>Allow F12 developer tools inside the shelf (for debugging).</summary>
        public bool DevTools { get => devTools; set => SetValue(ref devTools, value); }
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
        }

        public bool VerifySettings(out List<string> errors)
        {
            errors = new List<string>();
            return true;
        }
    }

    /// <summary>Settings page, built in code (no XAML to compile).</summary>
    public class ShelfSettingsView : UserControl
    {
        public ShelfSettingsView()
        {
            var panel = new StackPanel { Margin = new Thickness(20) };
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
            Check(Loc.S("Herramientas de desarrollo (F12)", "Developer tools (F12)"), nameof(ShelfSettings.DevTools),
                Loc.S("Solo para depurar la estantería. Se aplica la próxima vez que la abras.", "Only for debugging the shelf. Applies the next time you open it."));

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
            Content = panel;
        }

        private static readonly DependencyProperty ToggleButton_IsChecked = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty;
    }
}
