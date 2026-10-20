# MyVLibrary

**English** · [Español](README.es.md)

Your Playnite library turned into a shelf of physical games.

Every game is a case on a wall shelf. You take it down, peel off the shrink wrap, open it and put the disc in the console to play. The description and the game's details are in the manual inside, and the back cover has the summary. Under the shelf there is a table with a CRT TV, a whiteboard that writes down in marker whatever you are holding, and the console.

![The shelf](docs/estanteria.png)

## What it does

- **Your real library.** Covers, backgrounds, descriptions, playtime, completion statuses and categories come from Playnite.
- **Shelves.** At the top right you choose what is on the shelf: all your games or one status (Playing, Beaten…). You can also group them by category, platform or format. If they don't fit, the shelf has pages ("Next").
- **Any format you like.** Each game can come in a DVD case, a CD jewel case, a big CD case (like the PAL PlayStation or Dreamcast ones), a cardboard big box, a late-90s box of 3½" floppies or a 16-bit cartridge box. Pick it in the game's card (Format) and mix them on the same shelf. The case in your hands changes on the spot, and the shelf makes room when you put it back.
- **One console for everything.** The ID-2 has a disc slot, a 3½" floppy drive and a cartridge slot on top. Discs go in the slot, floppies in the drive (with its reading light), and cartridges stay sticking out of the top while you play.
- **Two designs.** One long wall shelf above the table with the TV and the console, or a row of bookcases (one per status, category or platform). Change it in Settings → Design.
- **Actually playing.** When you put the disc in, Playnite starts the game. While you play, the TV shows it. When you close the game, the disc goes back to its case on its own. If Playnite thinks the game has closed but a program from its folder is still open, the disc stays in until you close it, and that time is added to your playtime.
- **Trailer.** The TV and the back cover play the game's trailer: the one from Extra Metadata Loader if you have it, or a video found in the description.
- **Your language.** The shelf follows Playnite's language (Spanish and English for now).
- **Unplayed games.** If you have never opened a game, it arrives shrink-wrapped. Pull the red tab to peel the wrap off.
- **Dust.** Games you haven't touched in a while gather dust, and you wipe it off by rubbing the case.
- **Changes saved to Playnite.** Status, categories, rating (stars) and notes. Nothing changes by itself, only when you change it.
- **Rooms.** Living room (the one in the picture), Nordic, Cosy, Cabin, Japanese, Library, Industrial loft, Video store, Gamer and Spaceship. There are also three lights: night, evening and day.

![Open case with the disc and the manual](docs/caja-abierta.png)

## Install

You need:

- Playnite 10.36 or later.
- Microsoft WebView2. It comes with Windows 10 and 11; if it's missing, the extension tells you.

Steps:

1. Download the latest `MyVLibrary_x_y_z.pext`. It's in [Releases](../../releases) or, for the latest development build, in the **Actions** tab: open the latest run and download the `MyVLibrary-pext` artifact, which comes inside a .zip.
2. Double-click the `.pext`, or drag it onto the Playnite window.
3. Restart Playnite when it asks you to.

## Use

**Desktop mode**

There are three ways to open the shelf:

- From the sidebar, with the disc icon.
- From the main menu: **Extensions → MyVLibrary → Open the shelf in a window**.
- Right-click a game: **MyVLibrary → Show on the shelf**. The shelf opens right on that game.

**Fullscreen mode**

- It opens on its own when Playnite starts. You can turn this off in the extension's settings.
- **LB + RB** together open and close it.
- **B** on the shelf goes back to Playnite.

**Controls**

| | Mouse | Keyboard | Controller |
|---|---|---|---|
| Move along the shelf | hover | ← → (↑ ↓ jump 8 at a time) | d-pad / stick |
| Take a game out | click the spine | Enter | A |
| Turn the case | click the case | F | Y |
| Peel off the shrink wrap | drag the tab | Enter | A |
| Open the case / insert the disc | buttons at the bottom | Enter | A |
| Read the manual | click the manual | M | X |
| Change shelf | pills at the top | Q / E | LB / RB |
| Change page | "Next" | Page Up / Page Down | LT / RT |
| Go back | | Esc | B |
| Change room | Settings | H | |

**Extension settings** (Playnite → Add-ons → MyVLibrary):

- Open the shelf when Playnite starts in fullscreen.
- LB + RB to open and close it.
- Include hidden games.
- Keep the disc in while the game is still open.
- Developer tools (F12).

## What is saved, and where

- **In Playnite:** completion status, categories, user score (each star is 20 points) and notes.
- **In the extension's data:** the shrink wrap, dust and chosen format of each case, the shelf preferences (room, light, sort order) and a cache of downsized covers. If you never change a game's format, it uses the one its platform suggests.

## Development

```
MyVLibrary/
├─ web/          the shelf (three.js), split into pieces in web/src
│  └─ build.mjs  joins them into web/dist (for the extension) or web/dist-demo (browser demo)
├─ extension/    the Playnite extension (C#, .NET Framework 4.6.2, WebView2)
└─ .github/workflows/build.yml   builds everything and packs the .pext
```

**The shelf in the browser**

```
cd web
npm install
node build.mjs --target=demo   # web/dist-demo/index.html, with sample games
node build.mjs                 # web/dist/, what the extension ships
```

- Open `web/dist/index.html` from a static server (for example `npx serve web`) to see the sample library.
- Add `?mock` to the end of the address and the page pretends to be inside Playnite. This tests the real path: covers, colours taken from the cover, starting and closing a game, and changes sent back.

**The extension**

- Build it with `dotnet build extension/MyVLibrary.csproj -c Release`, on Windows, after building the web part.
- GitHub Actions does this on every change and keeps the `.pext` as an artifact.
- If you push a `v*` tag (for example `v0.2.0`), it also publishes a release.
- **Version.** It lives in `extension/extension.yaml` (and is repeated in `web/package.json`). The DLL and the shelf read it from there; you can see it at the bottom of Settings. Every PR that touches `extension/` or `web/` must raise it, or the GitHub Actions check fails. A release tag must match it.

**How the two parts talk**

- The extension serves the `web` folder at `https://app.myvlibrary/` and covers at `https://media.myvlibrary/cover/{id}?w=…`, downsized and cached.
- The page and the extension exchange JSON messages with `chrome.webview.postMessage`.
- The page sends: `ready`, `detail`, `start`, `update`, `openUrl`, `close`, `fetch`, `createStatus`, `createCategory` and `release`.
- The extension answers with `library`, `games`, `removed`, `lists`, `detail`, `started`, `tracking`, `stopped`, `cancelled`, `notInstalled`, `failed`, `activated`, `fetched`, `pad` and `focus`.

## License

GPL-3.0. The demo games are made up, and the console and the TV are original designs.
