using Playnite.SDK;
using System;

namespace MyVLibrary
{
    /// <summary>The extension's own texts follow Playnite's language: Spanish, or English for everything else.</summary>
    internal static class Loc
    {
        private static bool spanish = true;

        public static void Init(IPlayniteAPI api)
        {
            try
            {
                var lang = api.ApplicationSettings?.Language ?? "";
                spanish = lang.StartsWith("es", StringComparison.OrdinalIgnoreCase) || lang.IndexOf("spanish", StringComparison.OrdinalIgnoreCase) >= 0;
            }
            catch
            {
                spanish = true;
            }
        }

        public static string S(string es, string en) => spanish ? es : en;
    }
}
