# MyVLibrary

Tu biblioteca de Playnite convertida en una estantería de juegos físicos.

Cada juego es una caja en una balda de pared. La sacas, le quitas el precinto, la abres y metes el disco en la consola para jugar. La descripción y la ficha del juego están en el manual de dentro, y la contraportada lleva el resumen. Debajo de la balda hay una mesa con una tele de tubo, una pizarra que apunta a rotulador lo que tienes en la mano y la consola.

![La estantería](docs/estanteria.png)

## Qué hace

- **Tu biblioteca real.** Carátulas, fondos, descripciones, tiempo jugado, estados y categorías salen de Playnite.
- **Estantes.** Arriba a la derecha eliges qué hay en la balda: todos los juegos o un estado (Jugando, Superados…). También puedes agruparlos por categoría o plataforma. Si no caben, la balda tiene páginas («Siguiente»).
- **Dos diseños.** Una sola balda larga sobre la mesa con la tele y la consola, o una fila de estanterías (una por estado, categoría o plataforma). Se cambia en Ajustes → Diseño.
- **Jugar de verdad.** Al meter el disco, Playnite arranca el juego. Mientras juegas, la tele lo enseña. Al cerrar el juego, el disco vuelve solo a su caja. Si Playnite da el juego por cerrado pero sigue abierto algún programa de su carpeta, el disco se queda dentro hasta que lo cierres y ese tiempo se suma a tus horas.
- **Tráiler.** La tele y la contraportada ponen el tráiler del juego: el de Extra Metadata Loader si lo tienes, o el vídeo que venga en la descripción.
- **Tu idioma.** La estantería sigue el idioma de Playnite (por ahora español e inglés).
- **Juegos sin estrenar.** Si nunca lo has abierto, llega precintado. Puedes tirar de la lengüeta roja para quitar el precinto.
- **Polvo.** Lo que llevas tiempo sin tocar coge polvo, y se quita frotando la caja.
- **Cambios que se guardan en Playnite.** Estado, categorías, valoración (estrellas) y notas. Nada cambia solo: solo cuando tú lo cambias.
- **Ambientes.** Salón (el de la imagen), Nórdico, Acogedor, Cabaña, Japonés, Biblioteca, Loft, Videoclub, Gamer y Nave. También hay tres luces: noche, tarde y día.

![Caja abierta con el disco y el manual](docs/caja-abierta.png)

## Instalar

Necesitas:

- Playnite 10.36 o posterior.
- WebView2 de Microsoft. Ya viene con Windows 10 y 11; si te falta, la extensión te avisa.

Pasos:

1. Descarga el último `MyVLibrary_x_y_z.pext`. Está en [Releases](../../releases) o, para la última versión en desarrollo, en la pestaña **Actions**: abre la última ejecución y baja el artefacto `MyVLibrary-pext`, que viene dentro de un .zip.
2. Haz doble clic en el `.pext`, o arrástralo encima de la ventana de Playnite.
3. Reinicia Playnite cuando te lo pida.

## Usar

**Modo escritorio**

Tienes tres formas de abrir la estantería:

- En la barra lateral, con el icono del disco.
- Desde el menú principal: **Extensiones → MyVLibrary → Abrir la estantería en una ventana**.
- Con clic derecho sobre un juego: **MyVLibrary → Ver en la estantería**. Abre la estantería justo en ese juego.

**Modo pantalla completa**

- Se abre sola al arrancar Playnite. Se puede desactivar en los ajustes de la extensión.
- **LB + RB** a la vez la abren y la cierran.
- **B** en la estantería vuelve a Playnite.

**Controles**

| | Ratón | Teclado | Mando |
|---|---|---|---|
| Recorrer la balda | pasar por encima | ← → (↑ ↓ saltan de 8 en 8) | cruceta / stick |
| Sacar un juego | clic en el lomo | Intro | A |
| Girar la caja | clic en la caja | F | Y |
| Quitar el precinto | arrastrar la lengüeta | Intro | A |
| Abrir la caja / meter el disco | botones de abajo | Intro | A |
| Leer el manual | clic en el manual | M | X |
| Cambiar de estante | pastillas de arriba | Q / E | LB / RB |
| Cambiar de página | «Siguiente» | Re Pág / Av Pág | LT / RT |
| Volver | | Esc | B |
| Cambiar de ambiente | Ajustes | H | |

**Ajustes de la extensión** (Playnite → Complementos → MyVLibrary):

- Abrir al iniciar en pantalla completa.
- LB + RB para abrir y cerrar.
- Incluir los juegos ocultos.
- Mantener el disco dentro mientras el juego siga abierto.
- Herramientas de desarrollo (F12).

## Qué se guarda y dónde

- **En Playnite:** estado de juego, categorías, puntuación de usuario (cada estrella son 20 puntos) y notas.
- **En los datos de la extensión:** el precinto y el polvo de cada caja, las preferencias de la estantería (ambiente, luz, orden) y una caché de carátulas reducidas.

## Desarrollo

```
MyVLibrary/
├─ web/          la estantería (three.js), en trozos dentro de web/src
│  └─ build.mjs  la une en web/dist (para la extensión) o en web/dist-demo (demo de navegador)
├─ extension/    la extensión de Playnite (C#, .NET Framework 4.6.2, WebView2)
└─ .github/workflows/build.yml   compila todo y genera el .pext
```

**La estantería en el navegador**

```
cd web
npm install
node build.mjs --target=demo   # web/dist-demo/index.html, con juegos de ejemplo
node build.mjs                 # web/dist/, lo que lleva la extensión
```

- Abre `web/dist/index.html` con un servidor estático (por ejemplo `npx serve web`) y verás la biblioteca de ejemplo.
- Con `?mock` al final de la dirección, la página finge estar dentro de Playnite. Así se prueba el camino real: carátulas, colores sacados de la carátula, arranque y cierre del juego, y cambios devueltos.

**La extensión**

- Compílala con `dotnet build extension/MyVLibrary.csproj -c Release`, en Windows y después de construir la web.
- GitHub Actions lo hace en cada cambio y deja el `.pext` como artefacto.
- Si subes una etiqueta `v*` (por ejemplo `v0.2.0`), además se publica una versión en Releases.
- **Versión.** Está en `extension/extension.yaml` (y repetida en `web/package.json`). La DLL y la estantería la toman de ahí; se ve al final de Ajustes. Cada PR tiene que subirla: si no, la comprobación de GitHub Actions falla. La etiqueta de una versión tiene que coincidir con ella.

**Cómo se hablan las dos partes**

- La extensión sirve la carpeta `web` en `https://app.myvlibrary/` y las carátulas en `https://media.myvlibrary/cover/{id}?w=…`, reducidas y guardadas en caché.
- Página y extensión se pasan mensajes JSON con `chrome.webview.postMessage`.
- La página pide: `ready`, `detail`, `start`, `update`, `openUrl`, `close`, `fetch`, `createStatus`, `createCategory` y `release`.
- La extensión responde con `library`, `games`, `removed`, `lists`, `detail`, `started`, `tracking`, `stopped`, `cancelled`, `notInstalled`, `failed`, `activated`, `fetched`, `pad` y `focus`.

## Licencia

GPL-3.0. Los juegos de la demo son inventados, y la consola y la tele son diseños propios.
