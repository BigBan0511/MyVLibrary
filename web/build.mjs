/* Builds the shelf page.
   node build.mjs                 -> dist/ for the Playnite extension (fonts and three.js as local files)
   node build.mjs --target=demo   -> dist-demo/index.html, one self-contained page for the browser demo */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const target = (process.argv.find(a => a.startsWith('--target=')) || '--target=playnite').split('=')[1];
const src = join(here, 'src');
const parts = readdirSync(src).filter(f => f.endsWith('.js')).sort();
const app = '(() => {\n' + parts.map(f => `/* ---- ${f} ---- */\n` + readFileSync(join(src, f), 'utf8')).join('\n') + '\n})();\n';
new vm.Script(app, { filename: 'app.js' }); // syntax check
const VERSION = (readFileSync(join(here, '..', 'extension', 'extension.yaml'), 'utf8').match(/^Version:\s*([0-9][0-9.]*)/m) || [])[1] || '0.0.0';
const head = readFileSync(join(src, 'head.html'), 'utf8').replace(/<!--VERSION-->/g, VERSION);

const FONTS = [
  ['Bungee', 'bungee', [[400, 'normal']]],
  ['Figtree', 'figtree', [[400, 'normal'], [500, 'normal'], [600, 'normal'], [700, 'normal'], [800, 'normal']]],
  ['Fraunces', 'fraunces', [[700, 'normal'], [700, 'italic']]],
  ['JetBrains Mono', 'jetbrains-mono', [[500, 'normal'], [700, 'normal']]],
  ['Permanent Marker', 'permanent-marker', [[400, 'normal']]],
  ['Press Start 2P', 'press-start-2p', [[400, 'normal']]],
  ['Saira Extra Condensed', 'saira-extra-condensed', [[600, 'normal'], [800, 'normal']]]
];
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

if (target === 'demo') {
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Figtree:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,700;1,700&family=JetBrains+Mono:wght@500;700&family=Permanent+Marker&family=Press+Start+2P&family=Saira+Extra+Condensed:wght@600;800&display=swap">`;
  const out = join(here, 'dist-demo'); mkdirSync(out, { recursive: true });
  /* the charset must be declared: opened from disk, the page would otherwise be read as Windows-1252 and the script breaks */
  const html = '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' + head.replace('<!--FONTS-->', fonts) + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n' + app + '</script>\n';
  writeFileSync(join(out, 'index.html'), html);
  console.log(`demo -> dist-demo/index.html (${(html.length / 1024).toFixed(0)} KB)`);
} else {
  const out = join(here, 'dist'); if (existsSync(out)) rmSync(out, { recursive: true }); mkdirSync(join(out, 'fonts'), { recursive: true }); mkdirSync(join(out, 'vendor'), { recursive: true });
  let css = '';
  for (const [family, pkg, faces] of FONTS) for (const [w, st] of faces) {
    const file = `${pkg}-latin-${w}-${st}.woff2`, from = join(here, 'node_modules', '@fontsource', pkg, 'files', file);
    copyFileSync(from, join(out, 'fonts', file));
    css += `@font-face{font-family:"${family}";font-style:${st};font-weight:${w};font-display:swap;src:url(${file}) format("woff2");unicode-range:${LATIN}}\n`;
  }
  writeFileSync(join(out, 'fonts', 'fonts.css'), css);
  copyFileSync(join(here, 'node_modules', 'three', 'build', 'three.min.js'), join(out, 'vendor', 'three.min.js'));
  /* pdf.js, loaded only when a game's real manual is opened (as .js, so the page's server gives it a script's type) */
  copyFileSync(join(here, 'node_modules', 'pdfjs-dist', 'build', 'pdf.min.mjs'), join(out, 'vendor', 'pdf.min.js'));
  copyFileSync(join(here, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'), join(out, 'vendor', 'pdf.worker.min.js'));
  copyFileSync(join(here, 'node_modules', 'pdfjs-dist', 'LICENSE'), join(out, 'vendor', 'pdf.js-LICENSE.txt'));
  writeFileSync(join(out, 'app.js'), app);
  const html = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    head.replace('<!--FONTS-->', '<link rel="stylesheet" href="fonts/fonts.css">').replace(/<style>/, '<style>').replace('<canvas id="gl"', '</head>\n<body>\n<canvas id="gl"') +
    '\n<script src="vendor/three.min.js"></script>\n<script src="app.js"></script>\n</body>\n</html>\n';
  writeFileSync(join(out, 'index.html'), html);
  console.log(`playnite -> dist/ (app.js ${(app.length / 1024).toFixed(0)} KB)`);
}
