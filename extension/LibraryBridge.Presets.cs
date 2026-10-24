using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Windows.Threading;

namespace MyVLibrary
{
    /// <summary>
    /// Playnite's saved filters (filter presets): the shelf can show only the games one of them lets through.
    /// Each game record says which saved filters it matches, so the page can filter without asking again.
    /// </summary>
    public partial class LibraryBridge
    {
        private List<FilterPreset> presets = new List<FilterPreset>();
        private DispatcherTimer presetTimer;

        /// <summary>Reads the saved filters, in the order Playnite lists them. A Playnite without them just gets none.</summary>
        private void LoadPresets()
        {
            try
            {
                presets = ReadPresets();
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se han podido leer los filtros de Playnite");
                presets = new List<FilterPreset>();
            }
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private List<FilterPreset> ReadPresets()
        {
            List<FilterPreset> sorted = null;
            try
            {
                sorted = api.MainView.GetSortedFilterPresets();
            }
            catch
            {
                // fullscreen mode may not keep the desktop order: fall back to the names
            }

            var all = sorted != null && sorted.Count > 0 ? sorted : Db.FilterPresets.OrderBy(p => p.Name).ToList();
            return all.Where(p => p != null && p.Settings != null).ToList();
        }

        private List<Dictionary<string, object>> PresetList()
        {
            return presets.Select(p => new Dictionary<string, object> { ["id"] = p.Id.ToString(), ["name"] = p.Name ?? "" }).ToList();
        }

        /// <summary>The ids of the saved filters this game gets through.</summary>
        private List<string> PresetsOf(Game g)
        {
            if (presets.Count == 0) return new List<string>();
            try
            {
                return Matching(g);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se han podido aplicar los filtros de Playnite");
                presets = new List<FilterPreset>();
                return new List<string>();
            }
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private List<string> Matching(Game g)
        {
            return presets.Where(p => Db.GetGameMatchesFilter(g, p.Settings)).Select(p => p.Id.ToString()).ToList();
        }

        /// <summary>Follow new, edited and removed filters; quietly does nothing on a Playnite without them.</summary>
        private void WatchPresets(bool on)
        {
            try
            {
                WatchPresetsCore(on);
            }
            catch (Exception e)
            {
                logger.Warn(e, "MyVLibrary: no se pueden seguir los filtros de Playnite");
            }
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private void WatchPresetsCore(bool on)
        {
            if (on)
            {
                Db.FilterPresets.ItemCollectionChanged += OnPresetsChanged;
                Db.FilterPresets.ItemUpdated += OnPresetsChanged;
            }
            else
            {
                Db.FilterPresets.ItemCollectionChanged -= OnPresetsChanged;
                Db.FilterPresets.ItemUpdated -= OnPresetsChanged;
            }
        }

        /// <summary>A filter changed: which games it lets through may have too, so the shelves get the library again.</summary>
        private void OnPresetsChanged(object sender, EventArgs e)
        {
            api.MainView.UIDispatcher.BeginInvoke(new Action(() =>
            {
                if (presetTimer == null)
                {
                    presetTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(800) };
                    presetTimer.Tick += (s, a) =>
                    {
                        presetTimer.Stop();
                        LibraryChanged();
                    };
                }

                presetTimer.Stop();
                presetTimer.Start();
            }));
        }
    }
}
