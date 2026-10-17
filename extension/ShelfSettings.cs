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

        /// <summary>Open the shelf as soon as Playnite starts in fullscreen mode.</summary>
        public bool OpenOnFullscreenStart { get => openOnFullscreenStart; set => SetValue(ref openOnFullscreenStart, value); }

        /// <summary>In fullscreen mode, LB + RB together open and close the shelf.</summary>
        public bool ControllerToggle { get => controllerToggle; set => SetValue(ref controllerToggle, value); }

        /// <summary>Put games marked as hidden in Playnite on the shelf too.</summary>
        public bool ShowHidden { get => showHidden; set => SetValue(ref showHidden, value); }

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

            Check("Abrir la estantería al iniciar Playnite en pantalla completa", nameof(ShelfSettings.OpenOnFullscreenStart),
                "Sales de ella con B (o Esc) y vuelves a la interfaz de Playnite.");
            Check("LB + RB abren y cierran la estantería en pantalla completa", nameof(ShelfSettings.ControllerToggle),
                "Pulsa los dos botones superiores del mando a la vez.");
            Check("Poner también los juegos ocultos", nameof(ShelfSettings.ShowHidden),
                "Por defecto la estantería deja fuera los juegos que tienes ocultos en Playnite.");
            Check("Herramientas de desarrollo (F12)", nameof(ShelfSettings.DevTools),
                "Solo para depurar la estantería. Se aplica la próxima vez que la abras.");

            panel.Children.Add(new TextBlock
            {
                Text = "Los cambios de estado, categorías, valoración y notas que hagas en la estantería se guardan en Playnite. " +
                       "El precinto y el polvo de cada caja solo existen en la estantería.",
                Opacity = .7,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 18, 0, 0)
            });
            Content = panel;
        }

        private static readonly DependencyProperty ToggleButton_IsChecked = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty;
    }
}
