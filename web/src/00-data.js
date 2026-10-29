'use strict';
/* =====================================================================
   MyVLibrary · estantería de videojuegos para Playnite
   Fuera de Playnite enseña una biblioteca de ejemplo con juegos inventados
   y arte generado en canvas; dentro de Playnite usa tu biblioteca real.
   ===================================================================== */
const V3 = THREE.Vector3, Q4 = THREE.Quaternion, EU = THREE.Euler;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = RM ? 0.3 : 1;
const F = {
  saira: '"Saira Extra Condensed","Arial Narrow",sans-serif',
  fig: 'Figtree,system-ui,sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
  bungee: 'Bungee,Impact,sans-serif',
  fraunces: 'Fraunces,Georgia,serif',
  press: '"Press Start 2P",monospace',
  marker: '"Permanent Marker","Comic Sans MS",cursive'
};

/* ---------- formats (cm) ----------
   shell: what the case is made of (keep = DVD keep case, clear = jewel case, card = cardboard box)
   media: what goes into the console (disc, floppy, cart); wide: the spine is wide enough to be printed like a front */
const DIMS = {
  dvd:      { w: 13.5, h: 19,   d: 1.4,  split: 0,   discX: 0.45, discR: 6,   man: [12.2, 17.4], label: 'PC · DVD-ROM', short: 'DVD',  name: 'Caja DVD',          shell: 'keep',  media: 'disc' },
  jewel:    { w: 14.2, h: 12.5, d: 1.0,  split: 0.2, discX: 0.25, discR: 5.9, man: [11.6, 11.4], label: 'CD-ROM',       short: 'CD',   name: 'Caja de CD',        shell: 'clear', media: 'disc' },
  /* the bulky PAL jewel case of PlayStation and Dreamcast games: taller, almost twice as thick, black tray */
  bigjewel: { w: 14.3, h: 13.1, d: 1.75, split: 0.3, discX: 0.3,  discR: 5.9, man: [12.4, 11.9], label: 'CD-ROM',       short: 'CD',   name: 'Caja de CD grande', shell: 'clear', media: 'disc' },
  big:      { w: 19,   h: 22,   d: 5,    split: 2.2, discX: 0,    discR: 6,   man: [15.2, 19],   label: 'PC CD-ROM',    short: 'BIG',  name: 'Caja grande',       shell: 'card',  media: 'disc', wide: true },
  /* late-90s PC games on 3½" floppies: a cardboard box with a few disks inside */
  floppy:   { w: 15.5, h: 21,   d: 4,    split: 0,   discX: 0,    discR: 0,   man: [13.6, 18.4], label: 'PC · 3½" HD',  short: '3½"',  name: 'Caja de disquetes', shell: 'card',  media: 'floppy', wide: true, disks: 3 },
  /* a 16-bit cartridge in its cardboard box, in the style of the European Super Nintendo */
  cart:     { w: 13.6, h: 18.2, d: 3.4,  split: -0.7, discX: 0,   discR: 0,   man: [12, 16.2],   label: 'CARTUCHO',     short: 'CART', name: 'Caja de cartucho',  shell: 'card',  media: 'cart', wide: true },
  /* video (Jellyfin): the black clamshell of a VHS tape, the blue Blu-ray case, and for series with several
     episodes a DVD or Blu-ray case with a flip tray (four discs in view) or a cardboard box of six tapes */
  vhs:      { w: 12.6, h: 20.6, d: 3.2,  split: 0,   discX: 0,    discR: 0,   man: [0, 0],       label: 'VHS',          short: 'VHS',  name: 'Caja de VHS',       shell: 'keep',  media: 'tape', video: true },
  bluray:   { w: 13.5, h: 17.1, d: 1.2,  split: 0,   discX: 0.45, discR: 6,   man: [0, 0],       label: 'BLU-RAY',      short: 'BD',   name: 'Caja Blu-ray',      shell: 'keep',  media: 'disc', video: true },
  dvdbox:   { w: 13.5, h: 19,   d: 2.2,  split: 0,   discX: 0.45, discR: 6,   man: [0, 0],       label: 'DVD',          short: 'DVD',  name: 'Caja DVD de varios discos',    shell: 'keep', media: 'disc', video: true, multi: 4 },
  bdbox:    { w: 13.5, h: 17.1, d: 1.9,  split: 0,   discX: 0.45, discR: 6,   man: [0, 0],       label: 'BLU-RAY',      short: 'BD',   name: 'Caja Blu-ray de varios discos', shell: 'keep', media: 'disc', video: true, multi: 4 },
  vhsbox:   { w: 20.8, h: 21.6, d: 13.4, split: 6.55, discX: 0,   discR: 0,   man: [0, 0],       label: 'VHS',          short: 'VHS',  name: 'Caja de cintas',    shell: 'card',  media: 'tape', video: true, multi: 6, wide: true },
  /* music (Navidrome): an LP in its gatefold sleeve, a cassette in its box, a CD in its jewel case; an
     artist is a divider card in the racks, with nothing inside */
  lp:       { w: 31.4, h: 31.4, d: 0.6,  split: 0,   discX: 0,    discR: 15,  man: [0, 0],       label: 'LP · 33⅓',     short: 'LP',   name: 'Vinilo',            shell: 'card',  media: 'disc', music: true, vinyl: true },
  cass:     { w: 7,    h: 11,   d: 1.75, split: 0,   discX: 0,    discR: 0,   man: [0, 0],       label: 'CASETE',       short: 'MC',   name: 'Casete',            shell: 'clear', media: 'cass', music: true },
  cd:       { w: 14.2, h: 12.5, d: 1.0,  split: 0.2, discX: 0.25, discR: 5.9, man: [0, 0],       label: 'COMPACT DISC', short: 'CD',   name: 'CD',                shell: 'clear', media: 'disc', music: true },
  artist:   { w: 22,   h: 27,   d: 1.4,  split: 0,   discX: 0,    discR: 0,   man: [0, 0],       label: 'ARTISTA',      short: 'ART',  name: 'Separador',         shell: 'card',  media: 'none', music: true }
};
const FMTS = Object.keys(DIMS);
const FMT_ORDER = { dvd: 0, jewel: 1, bigjewel: 2, big: 3, floppy: 4, cart: 5, vhs: 6, bluray: 7, dvdbox: 8, bdbox: 9, vhsbox: 10, lp: 11, cass: 12, cd: 13, artist: 14 };
/* the cases a game can come in, and the families a film or a season can be changed to */
const GAME_FMTS = FMTS.filter(f => !DIMS[f].video && !DIMS[f].music);
const VIDEO_FMTS = ['vhs', 'dvd', 'bluray'];
const MUSIC_FMTS = ['lp', 'cass', 'cd'];
/* the media themselves (cm): a 3½" disk, a cartridge and a VHS tape, all drawn upright in their own XY plane */
const MSIZE = { floppy: { w: 9, h: 9.4, t: .33 }, cart: { w: 12.7, h: 8.6, t: 2 }, tape: { w: 18.7, h: 10.2, t: 2.5 }, cass: { w: 10, h: 6.3, t: 1.2 } };
function mediaOf(g) { return DIMS[g.fmt].media; }

/* ---------- systems: PC games live at the desk, every other platform has its own room with a TV ---------- */
const PC_SYSTEMS = new Set(['PC', 'LINUX', 'MAC']);
/* from the PS3 generation on, the TV in the room is a flat one */
const FLAT_SYSTEMS = new Set(['PS3', 'PS4', 'PS5', 'X360', 'XONE', 'XSX', 'WII', 'WII U', 'SWITCH', 'SWITCH 2']);
const CART_SYSTEMS = new Set(['NES', 'SNES', 'N64', 'MD', 'SMS', 'GB', 'GBC', 'GBA', 'GG', 'NEO GEO', 'DS', '3DS', 'VITA', 'SWITCH', 'SWITCH 2']);
const SYS_ORDER = ['PC', 'NES', 'SMS', 'MD', 'PCE', 'GB', 'GG', 'SNES', 'NEO GEO', 'MEGA CD', '3DO', 'SATURN', 'PS1', 'N64', 'GBC', 'DC', 'PS2', 'GBA', 'GC', 'XBOX', 'DS', 'PSP', 'X360', 'PS3', 'WII', '3DS', 'VITA', 'WII U', 'XONE', 'PS4', 'SWITCH', 'XSX', 'PS5', 'SWITCH 2', 'ARCADE', 'VIDEO', 'MUSIC'];
/* films and series from Jellyfin live in a room of their own, the video room; music from Navidrome in the record shop */
function sysOf(g) { return g.video ? 'VIDEO' : g.music ? 'MUSIC' : g.plat && !PC_SYSTEMS.has(g.plat) ? g.plat : 'PC'; }
function sysRank(s) { const i = SYS_ORDER.indexOf(s); return i < 0 ? 900 : i; }
/* the format a game came in, from its platform (and, for PC, its year) */
/* the case each system's games came in. PC games by their year: floppies before 1994, CDs up to 2003, DVDs after */
const SYS_FMT = { PS1: 'bigjewel', SATURN: 'bigjewel', DC: 'bigjewel', 'MEGA CD': 'jewel', PCE: 'jewel', '3DO': 'jewel' };
function fmtFor(plat, year) {
  if (!plat || PC_SYSTEMS.has(plat)) return !year ? 'dvd' : year < 1994 ? 'floppy' : year <= 2003 ? 'jewel' : 'dvd';
  if (CART_SYSTEMS.has(plat)) return 'cart';
  return SYS_FMT[plat] || 'dvd';
}
/* console games keep the case they came in unless Settings frees them; PC games, films and series can always change */
function fmtLocked(g) { return !g.video && !g.music && prefs.fmtCon !== 'free' && sysOf(g) !== 'PC'; }
function resolveFmt(g) { if (g.video) return resolveVideoFmt(g); if (g.music) return resolveMusicFmt(g); g.fmt = !fmtLocked(g) && g.fmtPick && DIMS[g.fmtPick] ? g.fmtPick : fmtFor(g.plat, g.year); return g.fmt; }
/* films by their year: VHS up to 1997, DVD up to 2014, Blu-ray from 2015 */
function videoFamily(year) { return !year ? 'dvd' : year <= 1997 ? 'vhs' : year <= 2014 ? 'dvd' : 'bluray'; }
const VIDEO_BOX = { vhs: 'vhsbox', dvd: 'dvdbox', bluray: 'bdbox' };
const VIDEO_FAMILY = { vhs: 'vhs', vhsbox: 'vhs', dvd: 'dvd', dvdbox: 'dvd', bluray: 'bluray', bdbox: 'bluray' };
/* a film is one case; a series shows the season you are holding: its own year and format, and a box
   of tapes or a multi-disc case when it has more than one episode */
function seasonOf(g) { return g.kind === 'series' && g.seasons ? g.seasons[g.seasonIdx || 0] || null : null; }
function resolveVideoFmt(g) {
  const s = seasonOf(g), pick = (s && g.seasonPicks && g.seasonPicks[s.idx]) || g.fmtPick;
  const fam = VIDEO_FMTS.includes(pick) ? pick : videoFamily((s && s.year) || g.year);
  const multi = g.kind === 'series' && (s ? (s.count ?? 2) > 1 : (g.episodes ?? 2) > 1);
  g.fmt = multi ? VIDEO_BOX[fam] : fam; return g.fmt;
}
/* texts that name the thing you put in the console: written for the disc, said right for the others */
function mediaT(g, s, ...a) {
  const m = mediaOf(g);
  if (m === 'cass') s = s.replace(/el disco/g, 'el casete').replace(/El disco/g, 'El casete').replace(/disco/g, 'casete').replace(/Disco/g, 'Casete').replace(/DISCO/g, 'CASETE');
  else if (m === 'tape') s = s.replace(/\bel disco/g, 'la cinta').replace(/\bEl disco/g, 'La cinta').replace(/disco/g, 'cinta').replace(/Disco/g, 'Cinta').replace(/DISCO/g, 'CINTA');
  else if (m !== 'disc') { const w = m === 'floppy' ? ['disquete', 'Disquete', 'DISQUETE'] : ['cartucho', 'Cartucho', 'CARTUCHO']; s = s.replace(/disco/g, w[0]).replace(/Disco/g, w[1]).replace(/DISCO/g, w[2]); }
  return T(s, ...a);
}

/* ---------- library ---------- */
const GAMES = [
 { id:'faro', t:'Faro Norte', tag:'Una historia de luz y niebla', genre:'Aventura narrativa', ctl:'adv', dev:'Estudio Galerna', pub:'Galerna', year:2023, fmt:'dvd', players:'1 jugador', online:false, pad:true, age:7,
   hours:9.2, sessions:6, last:2, added:40, status:'Jugando', ach:[7,20], art:'sea', font:'fraunces', tpos:'bottom', rating:4,
   pal:['#0e1b2c','#2a4a6b','#d9534a','#ffe7a8','#f7f3ea'],
   sum:'Mantén encendido el último faro del Cantábrico mientras la niebla trae barcos que no deberían existir.',
   desc:'Eres Inés, la nueva farera de Punta Cerda. Cada noche debes mantener viva la lámpara, anotar los barcos que pasan y responder a la radio. Pero hay barcos que no aparecen en ningún registro, y la niebla parece saber tu nombre. Una aventura breve, sin combates, sobre la soledad y las señales que decidimos atender.' },
 { id:'turbo', t:'Turbo Meridiano', tag:'Carreras a 300 por la costa', genre:'Carreras arcade', ctl:'race', dev:'Velocípedo Games', pub:'Velocípedo', year:2021, fmt:'dvd', players:'1–4 jugadores', online:true, pad:true, age:3,
   hours:31.5, sessions:40, last:12, added:600, status:'Completado', ach:[30,30], art:'sun', font:'bungee', tpos:'top', rating:5,
   pal:['#1a0b2e','#6a1f77','#ff5fa2','#ffd36e','#ffffff'],
   sum:'Doce circuitos al atardecer, derrapes eternos y una banda sonora que no te vas a quitar de la cabeza.',
   desc:'Recorre una costa imaginaria de punta a punta en coches que nunca existieron. Turbo Meridiano recupera las recreativas de los noventa: tiempo límite, puntos de control y rivales que te adelantan por el arcén. Incluye campeonato, contrarreloj y pantalla partida para cuatro.' },
 { id:'minas', t:'Las Minas de Ocre', tag:'Excava. Vende. No mires atrás.', genre:'Roguelike de excavación', ctl:'plat', dev:'Cooperativa Pico', pub:'Pico Soft', year:1998, fmt:'big', players:'1 jugador', online:false, pad:false, age:12,
   hours:64, sessions:88, last:220, added:2400, status:'Completado', ach:[22,40], art:'cave', font:'saira', tpos:'top', rating:5, burst:'¡Con mapa a todo color!',
   pal:['#1b120c','#5a3520','#e8913a','#ffd27a','#f6e7d2'],
   sum:'Baja cada día un poco más hondo en una mina que cambia cada vez que entras.',
   desc:'El pueblo de Ocre vive de la mina, y la mina vive de los que bajan. Cada expedición genera galerías nuevas, vetas raras y derrumbes que no perdonan. Vende lo que subas, mejora el pico y la lámpara, y descubre qué excavaron los primeros mineros antes de sellar el pozo cuatro.' },
 { id:'pulso', t:'Pulso', tag:'Puzles al ritmo del corazón', genre:'Puzle rítmico', ctl:'puzzle', dev:'Latido', pub:'Latido', year:1999, fmt:'jewel', players:'1–2 jugadores', online:false, pad:false, age:3,
   hours:3.1, sessions:5, last:400, added:2100, status:'Abandonado', ach:[2,15], art:'rings', artOpt:{pulse:true}, font:'saira', tpos:'top', rating:3,
   pal:['#0b1320','#173a52','#4fd1c5','#f6f7c4','#e9fbff'],
   sum:'Encaja piezas siguiendo el compás. Si pierdes el ritmo, el tablero se acelera.',
   desc:'Cada nivel late a un tempo distinto. Las piezas solo encajan en el golpe de compás, así que resolver el tablero es tanto cuestión de lógica como de oído. Ochenta niveles, un editor de canciones y un modo a dos jugadores en el mismo teclado.' },
 { id:'orbital', t:'Orbital 9', tag:'Un planeta cada vez', genre:'Estrategia por turnos', ctl:'strat', dev:'Kepler Interactivo', pub:'Kepler', year:2019, fmt:'dvd', players:'1–8 jugadores', online:true, pad:false, age:12,
   hours:120.4, sessions:96, last:30, added:1500, status:'Completado', ach:[41,60], art:'planet', font:'saira', tpos:'top', rating:4,
   pal:['#05060f','#1c2350','#6f86f0','#ffe2a8','#eef1ff'],
   sum:'Estrategia por turnos en un sistema solar que gira mientras planeas tu próximo movimiento.',
   desc:'Nueve planetas, nueve facciones y órbitas que cambian las distancias cada turno. Lo que hoy es una ruta corta mañana queda al otro lado del sol. Gestiona flotas, firma tratados que pensarás romper y defiende tu mundo natal en partidas de una tarde o campañas de semanas.' },
 { id:'bosque', t:'Bosque Hueco', tag:'Algo vive bajo las raíces', genre:'Metroidvania', ctl:'plat', dev:'Musgo', pub:'Musgo', year:2022, fmt:'dvd', players:'1 jugador', online:false, pad:true, age:12,
   hours:18.7, sessions:14, last:5, added:90, status:'Jugando', ach:[12,35], art:'forest', font:'fraunces', tpos:'top', rating:4,
   pal:['#0c1a14','#2c5444','#c6e27a','#f2f7d8','#eef5e8'],
   sum:'Explora un bosque que se hunde en sí mismo y recupera las habilidades que la savia te robó.',
   desc:'Despiertas sin voz en el tronco de un árbol milenario. Para salir tendrás que bajar: raíces, cuevas y las ruinas de un reino que crecía hacia abajo. Cada habilidad recuperada abre caminos que antes ignorabas. Mapa interconectado, jefes exigentes y secretos en cada pared.' },
 { id:'neon', t:'Neón Paralelo', tag:'La ciudad nunca duerme', genre:'Disparos en tercera persona', ctl:'shoot', dev:'Circuito Rojo', pub:'Circuito Rojo', year:2024, fmt:'dvd', players:'1–2 jugadores', online:true, pad:true, age:18,
   hours:7.5, sessions:8, last:60, added:300, status:'Pausado', ach:[5,40], art:'city', font:'saira', tpos:'top', rating:3,
   pal:['#0b0816','#2b1446','#ff3d81','#5cf2ff','#f5f0ff'],
   sum:'Disparos en tercera persona en una ciudad vertical donde cada planta es un barrio distinto.',
   desc:'En Nueva Bética los rascacielos tienen ochenta plantas y cada una tiene sus propias leyes. Como mensajera de un sindicato clandestino subes, bajas y negocias a tiros. Campaña de doce misiones, cooperativo a dos y un sistema de cobertura que premia moverse.' },
 { id:'granja', t:'Granja Lunar', tag:'Cultiva en baja gravedad', genre:'Simulación de granja', ctl:'sim', dev:'Huerto Espacial', pub:'Huerto Espacial', year:2020, fmt:'dvd', players:'1–4 jugadores', online:true, pad:true, age:3,
   hours:0, sessions:0, last:null, added:420, status:'Sin jugar', ach:[0,45], art:'moonfarm', font:'bungee', tpos:'top', rating:0,
   pal:['#0d1022','#2b2f55','#8ad46a','#fff3b0','#f4f6ff'],
   sum:'Planta tomates en cráteres, cuida vacas con escafandra y vende la cosecha a la Tierra.',
   desc:'Heredas una parcela en el lado visible de la Luna y un invernadero que pierde aire. Riega, abona con polvo de regolito y adapta los cultivos a días que duran dos semanas. Los vecinos de la base te pedirán favores y, si aprietas, te invitarán a la fiesta del eclipse.' },
 { id:'km0', t:'Kilómetro 0', tag:'Sobrevive al invierno más largo', genre:'Supervivencia', ctl:'adv', dev:'Escarcha', pub:'Escarcha', year:2021, fmt:'dvd', players:'1 jugador', online:false, pad:true, age:16,
   hours:0, sessions:0, last:null, added:30, status:'Sin jugar', ach:[0,25], art:'snow', font:'saira', tpos:'top', rating:0,
   pal:['#101a24','#56718a','#ff7a3a','#ffd9b8','#ffffff'],
   sum:'Tu coche se queda sin gasolina en el kilómetro cero de una carretera que nadie limpia.',
   desc:'Una tormenta deja la sierra incomunicada y a ti sin batería ni cobertura. Busca leña, raciona la comida y decide si esperar al quitanieves o intentar bajar a pie. Cada partida dura un invierno y cada invierno es distinto.' },
 { id:'tinta', t:'Duelo de Tinta', tag:'Cartas dibujadas a mano', genre:'Cartas coleccionables', ctl:'cards', dev:'Pluma y Naipe', pub:'Pluma y Naipe', year:2001, fmt:'jewel', players:'1–2 jugadores', online:false, pad:false, age:7,
   hours:42.3, sessions:70, last:900, added:3000, status:'Completado', ach:[18,24], art:'cards', font:'fraunces', tpos:'top', rating:4, tshadow:false,
   pal:['#efe3c8','#d9c6a1','#b0302a','#1d1a17','#1d1a17'], spine:'#b0302a', scol:'#f6eedc',
   sum:'Construye un mazo de criaturas de tinta y enfréntate a los grabadores del gremio.',
   desc:'Un torneo de duelistas en una ciudad de imprentas. Cada carta está dibujada a plumilla y algunas se emborronan si las juegas demasiado. Campaña de veinte duelos, modo libre y un editor para crear tus propias cartas.' },
 { id:'relojera', t:'Ciudad Relojera', tag:'Que nunca se pare', genre:'Construcción de ciudades', ctl:'strat', dev:'Engranaje', pub:'Engranaje', year:2022, fmt:'dvd', players:'1 jugador', online:false, pad:false, age:7,
   hours:56, sessions:33, last:15, added:400, status:'Jugando', ach:[20,50], art:'gears', font:'fraunces', tpos:'bottom', rating:5,
   pal:['#1a1410','#4a3524','#d9a441','#f6e3b4','#f7efe2'],
   sum:'Gestiona una ciudad movida por un único reloj gigante. Si se para, se para todo.',
   desc:'Cada distrito depende de la cuerda del Gran Reloj: las fábricas, los tranvías y hasta los turnos de comida. Diseña engranajes, contrata relojeros y equilibra trabajo y descanso antes de que el vecindario se rebele contra las campanadas.' },
 { id:'marea', t:'Marea Roja', tag:'Abordajes al atardecer', genre:'Acción naval', ctl:'shoot', dev:'Bucanero', pub:'Bucanero', year:2018, fmt:'dvd', players:'1–4 jugadores', online:true, pad:true, age:16,
   hours:22, sessions:19, last:340, added:1900, status:'Abandonado', ach:[9,50], art:'waves', font:'saira', tpos:'top', rating:3,
   pal:['#1f0a0f','#7a2222','#ff7a3d','#ffd6a0','#fff2e6'],
   sum:'Capitanea un bergantín pirata, recluta tripulación y saquea el mar de Alborán.',
   desc:'Combate naval en tiempo real y abordajes cuerpo a cuerpo en un mar lleno de galeones, contrabandistas y tormentas. Mejora tu barco, cuida la moral de la tripulación y decide a quién traicionas primero.' },
 { id:'anden', t:'El Último Andén', tag:'No te duermas en la línea 9', genre:'Terror psicológico', ctl:'adv', dev:'Túnel Siete', pub:'Túnel Siete', year:2023, fmt:'dvd', players:'1 jugador', online:false, pad:true, age:18,
   hours:4.4, sessions:3, last:45, added:200, status:'Pausado', ach:[3,18], art:'tunnel', font:'saira', tpos:'bottom', rating:4,
   pal:['#07080a','#2a3036','#e8d06a','#ff4b3e','#e9e7df'],
   sum:'Te despiertas en un vagón vacío que no deja de circular. Las estaciones ya no tienen nombre.',
   desc:'El último metro de la noche se detiene en estaciones que no aparecen en el plano. Explora andenes abandonados, descifra los avisos de megafonía y evita lo que viaja en el vagón de cola. Terror psicológico sin sustos baratos y con tres finales.' },
 { id:'cumbre', t:'Cumbre', tag:'Tres mil metros, una cuerda', genre:'Escalada', ctl:'plat', dev:'Vía Ferrata', pub:'Vía Ferrata', year:2020, fmt:'dvd', players:'1 jugador', online:false, pad:true, age:7,
   hours:0, sessions:0, last:null, added:260, status:'Sin jugar', ach:[0,20], art:'mountains', font:'saira', tpos:'top', rating:0,
   pal:['#0e1a2b','#4b7aa3','#ff9f5a','#ffe2b0','#ffffff'],
   sum:'Planifica cada agarre, gestiona el frío y llega a la cima antes de que cambie el tiempo.',
   desc:'Una montaña, siete vías posibles y un parte meteorológico que cambia cada hora. Coloca anclajes, elige qué llevar en la mochila y cuida las manos de tu escaladora. Controles precisos pensados para jugar con mando.' },
 { id:'sauce', t:'Expediente Sauce', tag:'Un caso cerrado en falso', genre:'Investigación', ctl:'adv', dev:'Gabardina', pub:'Gabardina', year:2019, fmt:'dvd', players:'1 jugador', online:false, pad:false, age:16,
   hours:14.2, sessions:9, last:120, added:800, status:'Completado', ach:[15,15], art:'noir', font:'fraunces', tpos:'top', rating:5,
   pal:['#0d1117','#2a3846','#d8b46a','#e9eef3','#e9eef3'],
   sum:'Una inspectora, un caso cerrado en falso y una ciudad que esconde la verdad bajo la lluvia.',
   desc:'El caso Sauce se archivó en 1987. Treinta años después, alguien envía a comisaría la pieza que faltaba. Interroga, compara declaraciones y conecta pruebas en tu tablero de corcho. Ninguna pista se marca sola: tú decides cuándo acusar.' },
 { id:'galleta', t:'Capitán Galleta', tag:'¡Rescata la merienda!', genre:'Plataformas', ctl:'plat', dev:'Miga Studios', pub:'Miga', year:2016, fmt:'dvd', players:'1–2 jugadores', online:false, pad:true, age:3,
   hours:11, sessions:25, last:700, added:2600, status:'Completado', ach:[28,40], art:'blocks', artOpt:{hero:'cookie'}, font:'bungee', tpos:'top', rating:4,
   pal:['#3fa9f5','#c9f0ff','#d9853b','#ffd84a','#ffffff'],
   sum:'Salta por la despensa, esquiva al ratón Comino y recupera la merienda robada.',
   desc:'Un plataformas para toda la familia con niveles en la nevera, el horno y el tarro de las galletas. Controles sencillos, cooperativo a dos y jefes que se pueden vencer de varias maneras.' },
 { id:'pixel', t:'Pixelandia', tag:'Ocho bits de aventura', genre:'Plataformas clásico', ctl:'plat', dev:'Bit Bazar', pub:'Bit Bazar', year:1996, fmt:'cart', players:'1 jugador', online:false, pad:false, age:3,
   hours:25.6, sessions:50, last:1500, added:3500, status:'Completado', ach:[10,12], art:'blocks', artOpt:{night:true, hero:'knight'}, font:'press', tpos:'top', rating:4,
   pal:['#1d2b53','#7e2553','#ab5236','#ffa300','#fff1e8'],
   sum:'Ocho mundos, trescientas monedas escondidas y un dragón que no es tan malo como parece.',
   desc:'Un clásico de los dieciséis bits: niveles cortos, secretos en cada esquina y una dificultad que sube sin piedad en el último mundo. El cartucho lleva pila, así que tus monedas y tus récords siguen ahí treinta años después.' },
 { id:'ritmo', t:'Ritmo Cósmico', tag:'Baila entre galaxias', genre:'Música y ritmo', ctl:'rhythm', dev:'Latido', pub:'Latido', year:2002, fmt:'bigjewel', players:'1–2 jugadores', online:false, pad:true, age:3,
   hours:6.8, sessions:12, last:800, added:2900, status:'Pausado', ach:[6,30], art:'rings', artOpt:{stars:true}, font:'bungee', tpos:'bottom', rating:3,
   pal:['#120a26','#3b1a6b','#ffcc33','#ff6ad5','#fdf6ff'],
   sum:'Pulsa al compás para que tu nave atraviese anillos de luz. Treinta canciones originales.',
   desc:'La secuela espiritual de Pulso cambia el tablero por el espacio. Cada canción es una ruta entre planetas y cada fallo te saca de órbita. Modo historia, desafíos diarios y duelos a dos.' },
 { id:'kart', t:'Kart de Barrio', tag:'El gran premio de las fiestas', genre:'Carreras de karts', ctl:'race', dev:'Velocípedo Games', pub:'Velocípedo', year:2000, fmt:'bigjewel', players:'1–4 jugadores', online:false, pad:true, age:3,
   hours:15, sessions:30, last:1100, added:3100, status:'Completado', ach:[16,20], art:'sun', font:'bungee', tpos:'top', rating:4,
   pal:['#2b6cff','#9fd3ff','#ff5a36','#ffe066','#ffffff'],
   sum:'Karts de cartón, cuestas imposibles y atajos por el patio de la vecina.',
   desc:'Los chavales del barrio organizan el gran premio de las fiestas. Construye tu kart con lo que encuentres, mejora las ruedas y compite en doce circuitos por calles, mercados y el polideportivo.' },
 { id:'arena', t:'Imperio de Arena', tag:'Agua, caravanas y poder', genre:'Estrategia en tiempo real', ctl:'strat', dev:'Kepler Interactivo', pub:'Kepler', year:1997, fmt:'big', players:'1–8 jugadores (red local)', online:true, pad:false, age:12,
   hours:88, sessions:120, last:1800, added:3600, status:'Completado', ach:[30,35], art:'desert', font:'saira', tpos:'top', rating:5, burst:'¡Juego en red para 8!',
   pal:['#3a1d0b','#b5532a','#f29b4b','#ffe3a3','#fff7ea'],
   sum:'Estrategia en tiempo real: agua, comercio y caravanas en un desierto que nunca perdona.',
   desc:'Funda un oasis, abre rutas de caravanas y defiende tus pozos de los imperios vecinos. Tres campañas, un editor de mapas y partidas en red local para hasta ocho jugadores, como en las tardes de cibercafé.' },
 { id:'tranvia', t:'Simulador de Tranvía 97', tag:'Próxima parada: realismo', genre:'Simulación de conducción', ctl:'sim', dev:'Raíl Soft', pub:'Raíl Soft', year:1997, fmt:'big', players:'1 jugador', online:false, pad:false, age:3,
   hours:2.2, sessions:2, last:2000, added:3700, status:'Abandonado', ach:[1,10], art:'tram', font:'saira', tpos:'top', rating:2, burst:'¡5 ciudades reales!',
   pal:['#16324a','#5a9bd4','#ff6b3d','#ffd23f','#ffffff'],
   sum:'Conduce tranvías por cinco ciudades europeas reproducidas con todo detalle.',
   desc:'Horarios, señales y pasajeros con prisa. Aprende a frenar a tiempo en cuesta, a respetar los semáforos y a no cerrar las puertas en la cara a nadie. Incluye un manual de conducción de sesenta páginas.' },
 { id:'torre', t:'Torre del Mago', tag:'Cien plantas, un hechizo', genre:'Rol por turnos', ctl:'strat', dev:'Cooperativa Pico', pub:'Pico Soft', year:1995, fmt:'floppy', players:'1 jugador', online:false, pad:false, age:12,
   hours:0, sessions:0, last:null, added:1300, status:'Sin jugar', ach:[0,30], art:'tower', font:'fraunces', tpos:'top', rating:0, burst:'¡100 plantas!',
   pal:['#120b24','#3a2a6e','#c49bff','#ffe9a8','#f4efff'],
   sum:'Sube planta a planta por la torre de un mago desaparecido y descubre por qué la construyó.',
   desc:'Un juego de rol por casillas con combates por turnos, mapas dibujados a mano y un hechicero que dejó notas en cada rellano. Crea un grupo de cuatro aventureros y decide si quieres salvar la torre o quedártela.' }
];

const CONTROLS = {
  plat:   [['Moverse','Stick izquierdo','A / D'],['Saltar','Botón A','Espacio'],['Atacar','Botón X','J'],['Habilidad','Botón B','K'],['Mapa','Select','M'],['Pausa','Start','Esc']],
  race:   [['Acelerar','Gatillo derecho','W'],['Frenar','Gatillo izquierdo','S'],['Girar','Stick izquierdo','A / D'],['Derrapar','Botón A','Espacio'],['Turbo','Botón X','Mayús'],['Cámara','Botón Y','C']],
  shoot:  [['Moverse','Stick izquierdo','W A S D'],['Apuntar','Gatillo izquierdo','Clic derecho'],['Disparar','Gatillo derecho','Clic izquierdo'],['Cubrirse','Botón B','Ctrl'],['Recargar','Botón X','R'],['Pausa','Start','Esc']],
  strat:  [['Seleccionar','Botón A','Clic izquierdo'],['Dar orden','Botón X','Clic derecho'],['Mover cámara','Stick derecho','W A S D'],['Pasar turno','Start','Intro'],['Construir','Botón Y','B'],['Pausa','Select','Esc']],
  puzzle: [['Mover pieza','Cruceta','Flechas'],['Girar','Botón A','Z / X'],['Soltar','Botón B','Espacio'],['Guardar pieza','Botón superior','C'],['Pausa','Start','Esc']],
  adv:    [['Caminar','Stick izquierdo','W A S D'],['Interactuar','Botón A','E'],['Inventario','Botón Y','I'],['Diario','Select','J'],['Correr','Botón B','Mayús'],['Pausa','Start','Esc']],
  rhythm: [['Golpe izquierdo','Gatillo izquierdo','F'],['Golpe derecho','Gatillo derecho','J'],['Nota larga','Botón A','Espacio'],['Pausa','Start','Esc']],
  sim:    [['Moverse','Stick izquierdo','W A S D'],['Usar','Botón A','Clic izquierdo'],['Cambiar herramienta','Botones superiores','Rueda'],['Inventario','Botón Y','Tab'],['Mapa','Select','M'],['Pausa','Start','Esc']],
  cards:  [['Elegir carta','Cruceta','Ratón'],['Jugar carta','Botón A','Clic izquierdo'],['Ver detalle','Botón Y','Clic derecho'],['Terminar turno','Botón X','Espacio'],['Pausa','Start','Esc']]
};
const ACH_POOL = [
  ['Primer paso','Empieza la partida por primera vez'],['Sin un rasguño','Supera un capítulo sin recibir daño'],['Coleccionista','Consigue todos los objetos de una zona'],
  ['Madrugador','Juega antes de las 7 de la mañana'],['Maratón','Juega tres horas seguidas'],['Explorador nato','Descubre el 100 % del mapa'],
  ['El final verdadero','Desbloquea el final secreto'],['Perfeccionista','Completa cualquier desafío con nota máxima'],['Contra todo pronóstico','Gana estando a punto de perder'],
  ['Viejo conocido','Vuelve después de un año sin jugar'],['Sin ayuda','Termina un nivel sin usar pistas'],['Racha imparable','Encadena diez aciertos'],
  ['Ojo de halcón','Encuentra el secreto mejor escondido'],['Por los pelos','Gana en el último segundo'],['Leyenda local','Llega al primer puesto de la clasificación']
];

/* ---------- small utils ---------- */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function hexA(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function lum(h) { const [r, g, b] = hexRgb(h).map(v => v / 255); return .2126 * r + .7152 * g + .0722 * b; }
function inkAccent(g) { const a = g.pal[2]; return lum(a) > .42 ? mix(a, '#000000', .5) : a; }
function fmtH(h) { if (!h) return '0 h'; if (h < 1) return Math.round(h * 60) + ' min'; if (h >= 100) return Math.round(h) + ' h'; return h.toFixed(1).replace('.', T('.')) + ' h'; }
function lastText(d) {
  if (d === null || d === undefined) return T('Nunca');
  if (d === 0) return T('Hoy'); if (d === 1) return T('Ayer');
  if (d < 14) return T('Hace {0} días', d);
  if (d < 60) return T('Hace {0} semanas', Math.round(d / 7));
  if (d < 365) { const m = Math.round(d / 30); return m === 1 ? T('Hace 1 mes') : T('Hace {0} meses', m); }
  const y = Math.round(d / 365); return y === 1 ? T('Hace 1 año') : T('Hace {0} años', y);
}
function shortAgo(d) {
  if (d === null || d === undefined) return T('nunca');
  if (d < 1) return T('hoy'); if (d < 30) return d + ' d'; if (d < 365) return Math.round(d / 30) + ' m'; return Math.round(d / 365) + ' ' + T('a');
}
let STATUS_CLASS = { 'No jugado': 'st-sin', 'Planeado': 'st-pla', 'Jugando': 'st-jug', 'Jugado': 'st-jdo', 'En espera': 'st-esp', 'Abandonado': 'st-aba', 'Superado': 'st-sup', 'Completado': 'st-com' };
/* what a status means, whatever the user called it (Playnite lets you rename and add them) */
let STATUS_KIND = { 'Jugando': 'playing', 'En espera': 'hold', 'Planeado': 'plan', 'No jugado': 'none', 'Jugado': 'played', 'Superado': 'beaten', 'Completado': 'completed', 'Abandonado': 'dropped' };
const KIND_CLASS = { playing: 'st-jug', hold: 'st-esp', plan: 'st-pla', none: 'st-sin', played: 'st-jdo', beaten: 'st-sup', completed: 'st-com', dropped: 'st-aba', other: 'st-sin' };
const KIND_ORDER = ['playing', 'hold', 'plan', 'none', 'played', 'beaten', 'completed', 'dropped', 'other'];
function statusKind(name) {
  const n = norm(name || '');
  const has = (...w) => w.some(k => n.includes(k));
  if (!n) return 'other';
  if (has('no jug', 'sin jug', 'not play', 'unplay', 'nunca', 'backlog', 'pendiente')) return 'none';
  if (has('jugando', 'playing', 'en curso', 'in progress', 'current')) return 'playing';
  if (has('espera', 'hold', 'pausa', 'paused')) return 'hold';
  if (has('plan', 'wishlist', 'quiero')) return 'plan';
  if (has('abandon', 'dropped', 'dejado')) return 'dropped';
  if (has('complet', '100', 'platin', 'master')) return 'completed';
  if (has('superad', 'beaten', 'terminad', 'finish', 'acabad', 'pasad')) return 'beaten';
  if (has('jugado', 'played', 'probado', 'tried')) return 'played';
  return 'other';
}
function kindOf(g) { return STATUS_KIND[g.status] || 'other'; }
function initials(s) { return s.split(/\s+/).filter(w => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || s.slice(0, 2).toUpperCase(); }

/* ---------- running inside Playnite? (WebView2 exposes chrome.webview) ---------- */
const HOST = (window.chrome && window.chrome.webview) || null;
const MOCK = /[?&]mock\b/.test(location.search);
const PLAYNITE = !!HOST || MOCK;
/* what Playnite is doing with the game in the console (only used inside Playnite) */
const PN_STATE = { waiting: false, running: null, mode: 'desktop', selfTrack: false };

/* ---------- persistence (per viewer, optional) ----------
   In the demo everything lives here. Inside Playnite, status, categories, notes, score
   and playtime belong to Playnite; only the seal and the dust are kept here. */
const STORE = PLAYNITE ? 'myvlibrary:ui' : 'myvlibrary:demo';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }
function persist() { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) { } }
function saveGame(g) {
  /* fmt is only kept when you chose it; otherwise each game keeps the format its platform suggests */
  if (PLAYNITE) { saved[g.id] = { wrapped: g.wrapped, tear: g.tear, dust: +(g.dust || 0).toFixed(3), dustAt: Date.now(), fmt: g.fmtPick || undefined, seasons: g.seasonPicks || undefined }; persist(); return; }
  saved[g.id] = { hours: g.hours, sessions: g.sessions, last: g.last, status: g.status, wrapped: g.wrapped, tear: g.tear, dust: g.dust, notes: g.notes, rating: g.rating, ach: g.ach, cats: g.cats, fmt: g.fmtPick || undefined, seasons: g.seasonPicks || undefined }; persist();
}
/* a film or a season keeps the family you chose (VHS, DVD, Blu-ray); a game the case you chose */
function restoreFmt(g, s) {
  if (s && s.fmt && (g.video ? VIDEO_FMTS.includes(s.fmt) : g.music ? MUSIC_FMTS.includes(s.fmt) : DIMS[s.fmt] && !DIMS[s.fmt].video && !DIMS[s.fmt].music)) g.fmtPick = s.fmt;
  if (g.video && s && s.seasons) g.seasonPicks = Object.assign({}, s.seasons);
  resolveFmt(g);
}

/* Playnite's default completion statuses, in Spanish (replaced by the real ones inside Playnite) */
/* Playnite's saved filters (filter presets): { id, name }; each game lists the ones it matches in g.presets */
let PRESETS = [];
let STATUSES = ['Jugando', 'En espera', 'Planeado', 'No jugado', 'Jugado', 'Superado', 'Completado', 'Abandonado'];
let STATUS_SHELF = { 'Jugando': 'Jugando', 'En espera': 'En espera', 'Planeado': 'Planeados', 'No jugado': 'Sin jugar', 'Jugado': 'Jugados', 'Superado': 'Superados', 'Completado': 'Completados', 'Abandonado': 'Abandonados' };
const ST0 = { faro: 'Jugando', turbo: 'Completado', minas: 'Superado', pulso: 'Abandonado', orbital: 'Superado', bosque: 'Jugando', neon: 'En espera', granja: 'No jugado', km0: 'Planeado', tinta: 'Superado', relojera: 'Jugando', marea: 'Abandonado', anden: 'En espera', cumbre: 'Planeado', sauce: 'Completado', galleta: 'Superado', pixel: 'Superado', ritmo: 'Jugado', kart: 'Superado', arena: 'Superado', tranvia: 'Abandonado', torre: 'No jugado' };
/* user categories (Playnite "Categories") */
const CAT0 = { faro: ['Partidas cortas', 'Favoritos'], turbo: ['Con amigos', 'Favoritos'], minas: ['Retro', 'Favoritos'], pulso: ['Retro'], orbital: ['Con amigos'], bosque: ['Favoritos'], neon: ['Con amigos'], granja: ['Pendientes', 'Con amigos'], km0: ['Pendientes'], tinta: ['Retro'], relojera: ['Favoritos'], marea: ['Con amigos'], anden: ['Partidas cortas'], cumbre: ['Pendientes'], sauce: ['Partidas cortas', 'Favoritos'], galleta: ['Con amigos'], pixel: ['Retro'], ritmo: ['Retro'], kart: ['Retro', 'Con amigos'], arena: ['Retro'], tranvia: ['Retro'], torre: ['Pendientes', 'Retro'] };

/* viewer preferences */
const PREF_KEY = 'myvlibrary:prefs';
const prefs = { group: 'status', shelf: '__all', sort: 'alpha', light: 'cine', hold: 'studio', zoom: 'on', near: 'off', wheel: 'page', corners: 'real', filter: 'all', seal: 'ask', sound: 'on', vol: 80, trailer: 'on', autoStatus: 'off', card: 'show', cardStart: 'hide', cardPos: null, layout: 'rooms', sys: 'PC', fmtCon: 'lock', room: 'salon', mfAlb: 'year', mfPl: 'cd', mfSong: 'year', mixFmt: 'cd', flip: 'off', mvol: 70, setTab: 'general', cats: PLAYNITE ? [] : ['Favoritos', 'Con amigos', 'Partidas cortas', 'Retro', 'Pendientes'] };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}); } catch (e) { }
/* rooms by system arrived in 0.4: everyone starts there once; the older designs stay in Settings */
if (prefs.layoutV !== 2) { prefs.layout = 'rooms'; prefs.layoutV = 2; }
/* the cinema light arrived in 0.7: everyone gets it once; the other lights stay in Settings */
if (prefs.lightV !== 2) { prefs.light = 'cine'; prefs.lightV = 2; }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { } }

/* dust builds up while a game sits untouched; wiping it is remembered */
function dustFor(idleDays) { return clamp((idleDays - 120) / 700, 0, 1); }
function restoreUi(g) {
  const s = saved[g.id]; if (!s) return;
  restoreFmt(g, s);
  if ('wrapped' in s && !s.wrapped) g.wrapped = false;
  if (g.wrapped && 'tear' in s) g.tear = s.tear || 0;
  if ('dust' in s && s.dustAt) g.dust = clamp(s.dust + Math.max(0, (Date.now() - s.dustAt) / 864e5) / 700, 0, 1);
}

/* the demo library: 22 hand-made games plus a shelf's worth of generated ones */
function hslHex(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
function fillerGames(n) {
  const r = rng(20261017), pick = a => a[Math.floor(r() * a.length)];
  const nouns = ['Faro', 'Eco', 'Brújula', 'Marea', 'Tormenta', 'Ceniza', 'Hoguera', 'Corsario', 'Relámpago', 'Laberinto', 'Cometa', 'Glaciar', 'Volcán', 'Espejo', 'Reliquia', 'Bastión', 'Dédalo', 'Nébula', 'Quimera', 'Centinela', 'Tundra', 'Oasis', 'Zafiro', 'Galeón', 'Cripta', 'Molino', 'Arrecife', 'Púlsar', 'Gárgola', 'Linterna', 'Dinamo', 'Caravana', 'Satélite', 'Herrero', 'Cuervo', 'Tranvía', 'Mosaico', 'Alquimia'];
  const adjs = ['Errante', 'Dormido', 'Perdido', 'Infinito', 'Salvaje', 'Oxidado', 'Escarlata', 'Eterno', 'Sombrío', 'Dorado', 'Helado', 'Nocturno', 'Fugaz', 'Silencioso', 'Lejano', 'Mecánico'];
  const places = ['Ultramar', 'la Niebla', 'Arenas Rojas', 'Puerto Viejo', 'las Islas', 'Vega Alta', 'Cuarzo', 'la Colina', 'Sal Blanca', 'Hierro', 'Medianoche', 'Bruma'];
  const subs = ['Edición Definitiva', 'Segunda Luna', 'El Despertar', 'Origen', 'Réquiem', 'Turbo', 'Deluxe', 'Remasterizado', 'Año Cero', 'Legado', 'Ecos'];
  const genres = [['Aventura', 'adv'], ['Plataformas', 'plat'], ['Rol', 'adv'], ['Estrategia', 'strat'], ['Carreras', 'race'], ['Puzles', 'puzzle'], ['Acción', 'shoot'], ['Simulación', 'sim'], ['Lucha', 'plat'], ['Shooter', 'shoot'], ['Survival horror', 'adv'], ['Ritmo', 'rhythm'], ['Metroidvania', 'plat'], ['Roguelike', 'plat'], ['Cartas', 'cards']];
  const devs = ['Estudio Brezo', 'Cometa Soft', 'Hierro Games', 'Pixelar', 'Nórdica Interactiva', 'Luna Menguante', 'Arcadia Ibérica', 'Ultramarinos', 'Vértigo Labs', 'Cuatro Vientos', 'Bitácora', 'Mar de Fondo', 'Polígono Sur', 'Tinta China'];
  const tags = ['Una aventura sin vuelta atrás', 'Más rápido que nunca', 'El clásico, mejor que nunca', 'Nadie vuelve igual', 'Cada partida es distinta', 'Solo quedas tú', 'Juega con tus amigos', 'Una historia de ruido y silencio', 'Construye, explora, sobrevive'];
  const arts = Object.keys(ART), fonts = ['saira', 'saira', 'bungee', 'fraunces', 'press', 'saira'];
  const kinds = ['Superado', 'Superado', 'Jugado', 'No jugado', 'Completado', 'Abandonado', 'Planeado', 'En espera', 'Superado', 'Jugado'];
  const used = new Set(GAMES.map(g => g.t)), out = [];
  for (let i = 0; i < n; i++) {
    let t, tries = 0;
    do { const k = r(); t = k < .3 ? `${pick(nouns)} ${pick(adjs)}` : k < .55 ? `El ${pick(nouns)} de ${pick(places)}` : k < .8 ? `${pick(nouns)}: ${pick(subs)}` : `${pick(nouns)} ${2 + Math.floor(r() * 3)}`; } while (used.has(t) && ++tries < 20);
    used.add(t);
    const [genre, ctl] = pick(genres), year = 1994 + Math.floor(r() * 32), h = r() * 360;
    let fmt = year < 2001 ? (r() < .55 ? 'jewel' : r() < .5 ? 'big' : 'dvd') : r() < .12 ? 'jewel' : 'dvd';
    /* a few on floppies, cartridges and fat jewel cases; from a separate hash so the rest of the demo stays as it was */
    const fk = hash('fmt' + i) % 100;
    if (year < 1999 && fk < 35) fmt = 'floppy'; else if (fk >= 92) fmt = 'cart'; else if (fmt === 'jewel' && fk >= 60) fmt = 'bigjewel';
    const status = pick(kinds), played = status !== 'No jugado' && status !== 'Planeado';
    const hours = played ? +(1 + r() * r() * 90).toFixed(1) : 0, sessions = played ? Math.max(1, Math.round(hours * (.6 + r()))) : 0;
    const last = played ? Math.floor(r() * r() * 1400) : null, added = (last || 0) + Math.floor(r() * 900) + 30;
    const pal = [hslHex(h, .45, .09 + r() * .06), hslHex(h + 10, .4, .25 + r() * .1), hslHex(h + 150 + r() * 60, .7, .52), hslHex(h + 30, .75, .78), '#f7f3ea'];
    const tot = 10 + Math.floor(r() * 50), got = status === 'Completado' ? tot : played ? Math.floor(tot * r() * .8) : 0;
    out.push({ id: 'g' + i, t, tag: pick(tags), genre, ctl, dev: pick(devs), pub: pick(devs), year, fmt, players: r() < .7 ? '1 jugador' : '1–4 jugadores', online: r() < .3, pad: r() < .6, age: pick([3, 7, 12, 16, 18]),
      hours, sessions, last, added, status, ach: [got, tot], art: pick(arts), font: pick(fonts), tpos: r() < .6 ? 'top' : 'bottom', rating: played ? 2 + Math.floor(r() * 4) : 0, pal, artOpt: {},
      sum: `${genre} de ${pick(devs)}: ${pick(tags).toLowerCase()}.`, desc: `${t} es un juego de ${genre.toLowerCase()} publicado en ${year}. Forma parte de la biblioteca de ejemplo de MyVLibrary: el juego no existe, pero su caja sí, y ocupa su sitio en la estantería como cualquier otro.` });
  }
  return out;
}
/* the demo spreads its games over a few systems, so each room has something on its shelf */
const DEMO_SYS = { pixel: 'SNES', kart: 'PS1', ritmo: 'PS1', neon: 'PS3', marea: 'PS3' };
const DEMO_PLAT = { PC: 'PC (Windows)', PS1: 'Sony PlayStation', SNES: 'Nintendo SNES', PS3: 'Sony PlayStation 3' };
function initDemoGames() {
  GAMES.push(...fillerGames(86));
  GAMES.forEach(g => {
    const h = hash('sys' + g.id) % 100, k = DEMO_SYS[g.id] || (/^g\d/.test(g.id) ? (h < 9 ? 'PS1' : h < 16 ? 'SNES' : h < 21 ? 'PS3' : 'PC') : 'PC');
    g.plat = k; g.platFull = DEMO_PLAT[k]; g.platName = DEMO_PLAT[k];
    /* the demo's PC games come in the cases picked for them, as if you had chosen them */
    if (k === 'PC') g.fmtPick = g.fmt;
    g.status = ST0[g.id] || g.status;
    g.cats = (CAT0[g.id] || []).slice();
    g.wrapped = g.sessions === 0; g.tear = 0;
    const idle = g.last === null ? g.added : g.last;
    g.dust = g.wrapped ? 0 : dustFor(idle);
    g.notes = ''; g.artOpt = g.artOpt || {};
    const s = saved[g.id];
    if (s) { for (const k of ['hours', 'sessions', 'last', 'status', 'wrapped', 'tear', 'dust', 'notes', 'rating', 'ach', 'cats']) if (k in s) g[k] = s[k]; restoreFmt(g, s); }
    resolveFmt(g);
    if (g.wrapped) { g.dust = 0; g.tear = g.tear || 0; }
    g.dust0 = g.dust;
    g.cats.forEach(c => { if (!prefs.cats.includes(c)) prefs.cats.push(c); });
  });
  /* and a small video shop: films never seen come shrink-wrapped */
  demoVideos().forEach(g => {
    g.wrapped = g.kind === 'movie' && !g.played && !g.pos && g.last === null; g.tear = 0; g.notes = '';
    g.dust = g.wrapped ? 0 : dustFor(g.last !== null ? g.last : g.added);
    const s = saved[g.id]; if (s) { for (const k of ['wrapped', 'tear', 'dust']) if (k in s) g[k] = s[k]; restoreFmt(g, s); }
    resolveFmt(g); g.dust0 = g.dust; GAMES.push(g);
  });
  /* and a record shop */
  demoMusic().forEach(g => { const s = saved[g.id]; if (s) { for (const k of ['wrapped', 'tear', 'dust']) if (k in s) g[k] = s[k]; restoreFmt(g, s); } resolveFmt(g); g.dust0 = g.dust; GAMES.push(g); });
}

/* =====================================================================
   CANVAS ART
   ===================================================================== */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function rr(x, X, Y, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function stars(x, W, H, r, n, col, maxR = 1.6) { x.fillStyle = col; for (let i = 0; i < n; i++) { x.globalAlpha = .25 + r() * .75; x.beginPath(); x.arc(r() * W, r() * H, r() * maxR + .3, 0, 7); x.fill(); } x.globalAlpha = 1; }
function ridge(x, W, baseY, amp, r, col, bottom, o = {}) {
  const freq = o.freq || 3, peaky = !!o.peaky;
  const ph = [r() * 7, r() * 7, r() * 7], fq = [freq * (.7 + r() * .6), freq * 2.3 * (.7 + r() * .6), freq * 5.1 * (.7 + r() * .6)];
  const pts = [], N = 96;
  for (let i = 0; i <= N; i++) {
    const u = i / N; let n;
    if (peaky) n = (1 - Math.abs(Math.sin(u * fq[0] * 3.14 + ph[0]))) * .75 + (1 - Math.abs(Math.sin(u * fq[1] * 3.14 + ph[1]))) * .25 - .5;
    else n = Math.sin(u * fq[0] * 6.28 + ph[0]) * .55 + Math.sin(u * fq[1] * 6.28 + ph[1]) * .3 + Math.sin(u * fq[2] * 6.28 + ph[2]) * .12;
    pts.push([u * W, baseY - amp * (.5 + .5 * n * (peaky ? 2 : 1))]);
  }
  x.beginPath(); x.moveTo(0, bottom); pts.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(W, bottom); x.closePath();
  x.fillStyle = col; x.fill(); return pts;
}
function glow(x, cx, cy, R, col, a) { x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rg(x, cx, cy, 0, R, [[0, hexA(col, a)], [1, hexA(col, 0)]]); x.fillRect(cx - R, cy - R, 2 * R, 2 * R); x.restore(); }
function spruce(x, cx, base, w, h) {
  const tiers = 5; x.beginPath(); x.moveTo(cx, base - h);
  for (let i = 1; i <= tiers; i++) { const y = base - h + h * i / tiers * .9, ww = w * i / tiers; x.lineTo(cx + ww, y); x.lineTo(cx + ww * .42, y); }
  x.lineTo(cx + w * .07, base + 2); x.lineTo(cx - w * .07, base + 2);
  for (let i = tiers; i >= 1; i--) { const y = base - h + h * i / tiers * .9, ww = w * i / tiers; x.lineTo(cx - ww * .42, y); x.lineTo(cx - ww, y); }
  x.closePath(); x.fill();
}
function gear(x, cx, cy, R, n, col, rot = 0) {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = col; x.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n * .5, a2 = a0 + Math.PI / n, a3 = a0 + Math.PI / n * 1.5;
    x.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); x.lineTo(Math.cos(a1) * R * 1.2, Math.sin(a1) * R * 1.2);
    x.lineTo(Math.cos(a2) * R * 1.2, Math.sin(a2) * R * 1.2); x.lineTo(Math.cos(a3) * R, Math.sin(a3) * R);
  }
  x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.arc(0, 0, R * .42, 0, 7); x.fill();
  x.fillStyle = col; x.beginPath(); x.arc(0, 0, R * .16, 0, 7); x.fill();
  x.strokeStyle = col; x.lineWidth = R * .1; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * R * .45, Math.sin(a) * R * .45); x.stroke(); }
  x.restore();
}
function vignette(x, W, H, a = .45) { x.fillStyle = rg(x, W / 2, H / 2, Math.min(W, H) * .35, Math.max(W, H) * .78, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]); x.fillRect(0, 0, W, H); }

const ART = {
  sun(x, W, H, p, r) {
    const hz = H * .6;
    x.fillStyle = lg(x, 0, 0, 0, hz, [[0, p[0]], [1, p[1]]]); x.fillRect(0, 0, W, hz);
    stars(x, W, hz * .55, r, 60, '#ffffff');
    const cx = W * .5, cy = hz - H * .03, R = W * .3;
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
    x.fillStyle = lg(x, 0, cy - R, 0, cy + R * .4, [[0, p[3]], [1, p[2]]]); x.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    x.fillStyle = p[1]; for (let i = 0; i < 7; i++) { const y = cy - R * .08 + i * R * .15; x.fillRect(cx - R, y, 2 * R, R * (.025 + i * .02)); }
    x.restore();
    glow(x, cx, cy, R * 2, p[2], .28);
    ridge(x, W, hz + 1, H * .07, r, mix(p[0], p[1], .45), hz + 3, { freq: 2 });
    x.fillStyle = p[0]; x.fillRect(0, hz, W, H - hz);
    x.strokeStyle = p[2]; x.lineWidth = Math.max(1.5, W / 240); x.globalAlpha = .9;
    for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * .025, hz); x.lineTo(W / 2 + i * W * .32, H); x.stroke(); }
    for (let j = 1; j < 14; j++) { const y = hz + (H - hz) * Math.pow(j / 14, 1.8); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
    x.globalAlpha = 1;
  },
  sea(x, W, H, p, r) {
    const hz = H * .64;
    x.fillStyle = lg(x, 0, 0, 0, hz, [[0, p[0]], [1, p[1]]]); x.fillRect(0, 0, W, hz);
    stars(x, W, hz * .7, r, 90, '#ffffff', 1.3);
    x.fillStyle = hexA(p[4], .85); x.beginPath(); x.arc(W * .2, H * .15, W * .055, 0, 7); x.fill();
    const lx = W * .7, top = H * .36;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = lg(x, lx, top, 0, top, [[0, hexA(p[3], .55)], [1, hexA(p[3], 0)]]);
    x.beginPath(); x.moveTo(lx, top + H * .01); x.lineTo(-W * .1, top - H * .17); x.lineTo(-W * .1, top + H * .1); x.closePath(); x.fill(); x.restore();
    x.fillStyle = mix(p[0], '#000000', .25); x.fillRect(0, hz, W, H - hz);
    for (let k = 0; k < 16; k++) {
      const y = hz + (H - hz) * Math.pow(k / 16, 1.5) + 2;
      x.strokeStyle = hexA(k % 3 ? p[1] : p[3], .18 + .32 * (k / 16)); x.lineWidth = 1 + k * .25; x.beginPath();
      for (let i = 0; i <= 40; i++) x.lineTo(i / 40 * W, y + Math.sin(i * .9 + k * 1.7) * (1.5 + k * .4));
      x.stroke();
    }
    x.fillStyle = mix(p[0], '#000000', .5);
    x.beginPath(); x.moveTo(W * .5, H); x.lineTo(W * .57, hz + H * .02); x.lineTo(W * .64, hz - H * .015); x.lineTo(W * .8, hz - H * .008); x.lineTo(W * .9, hz + H * .03); x.lineTo(W, hz + H * .06); x.lineTo(W, H); x.fill();
    const b = hz - H * .01, bw = W * .05, tw = W * .032, t2 = top + H * .03;
    const half = y => lerp(tw, bw, (y - t2) / (b - t2));
    x.fillStyle = p[4]; x.beginPath(); x.moveTo(lx - bw, b); x.lineTo(lx - tw, t2); x.lineTo(lx + tw, t2); x.lineTo(lx + bw, b); x.fill();
    x.fillStyle = p[2];
    for (let i = 0; i < 3; i++) { const y0 = t2 + (b - t2) * (.12 + i * .3), y1 = y0 + (b - t2) * .13; x.beginPath(); x.moveTo(lx - half(y0), y0); x.lineTo(lx + half(y0), y0); x.lineTo(lx + half(y1), y1); x.lineTo(lx - half(y1), y1); x.fill(); }
    x.fillStyle = p[3]; x.shadowColor = p[3]; x.shadowBlur = 30; x.fillRect(lx - tw * .9, top - H * .006, tw * 1.8, H * .036); x.shadowBlur = 0;
    x.fillStyle = mix(p[0], '#000000', .3); x.beginPath(); x.moveTo(lx - tw * 1.35, top); x.lineTo(lx, top - H * .045); x.lineTo(lx + tw * 1.35, top); x.fill();
    x.fillRect(lx - tw * 1.3, t2 - H * .006, tw * 2.6, H * .01);
  },
  cave(x, W, H, p, r) {
    x.fillStyle = p[0]; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) ridge(x, W, H * (i / 10) + H * .1, H * .05, r, mix(p[0], p[1], (i % 2 ? .3 : .65) * (1 - i / 14)), H, { freq: 1.4 });
    x.fillStyle = rg(x, W * .5, H * .58, 0, W * .5, [[0, 'rgba(0,0,0,.92)'], [.65, 'rgba(0,0,0,.65)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const cx = r() * W, cy = H * .22 + r() * H * .7, s = W * (.025 + r() * .05);
      x.save(); x.translate(cx, cy); x.rotate(r() - .5); x.shadowColor = p[2]; x.shadowBlur = 26;
      for (let k = 0; k < 3; k++) { x.save(); x.rotate((k - 1) * .45); x.fillStyle = k === 1 ? p[3] : p[2]; x.beginPath(); x.moveTo(-s * .24, 0); x.lineTo(0, -s * (1.3 - Math.abs(k - 1) * .35)); x.lineTo(s * .24, 0); x.lineTo(0, s * .25); x.closePath(); x.fill(); x.restore(); }
      x.restore();
    }
    const mx = W * .5, my = H * .82;
    glow(x, mx + W * .04, my - H * .07, W * .4, p[3], .35);
    x.fillStyle = '#0a0705';
    x.beginPath(); x.arc(mx, my - H * .085, W * .028, 0, 7); x.fill();
    x.fillRect(mx - W * .035, my - H * .086, W * .07, H * .012);
    rr(x, mx - W * .03, my - H * .07, W * .06, H * .09, W * .015); x.fill();
    x.fillRect(mx - W * .028, my + H * .015, W * .02, H * .06); x.fillRect(mx + W * .008, my + H * .015, W * .02, H * .06);
    x.strokeStyle = '#0a0705'; x.lineWidth = W * .012; x.beginPath(); x.moveTo(mx + W * .02, my - H * .04); x.lineTo(mx + W * .09, my - H * .1); x.stroke();
    x.beginPath(); x.moveTo(mx + W * .06, my - H * .125); x.quadraticCurveTo(mx + W * .1, my - H * .11, mx + W * .115, my - H * .07); x.stroke();
    x.fillStyle = p[3]; x.beginPath(); x.arc(mx + W * .012, my - H * .1, W * .008, 0, 7); x.fill();
  },
  rings(x, W, H, p, r, o) {
    x.fillStyle = rg(x, W * .5, H * .45, 0, Math.max(W, H) * .8, [[0, p[1]], [1, p[0]]]); x.fillRect(0, 0, W, H);
    if (o.stars) stars(x, W, H, r, 140, '#ffffff', 1.4);
    const cx = W * (.42 + r() * .16), cy = H * (.42 + r() * .12);
    for (let i = 0; i < 15; i++) {
      x.strokeStyle = i % 3 === 0 ? p[3] : p[2]; x.globalAlpha = i % 2 ? .35 : .85; x.lineWidth = i % 4 === 0 ? W * .02 : W * .006;
      x.setLineDash(i % 5 === 2 ? [W * .02, W * .015] : []);
      x.beginPath(); x.arc(cx + Math.sin(i) * i * 1.5, cy + Math.cos(i) * i, W * .04 + i * W * .055, 0, 7); x.stroke();
    }
    x.setLineDash([]); x.globalAlpha = 1;
    x.fillStyle = hexA(p[4], .12); const st = W / 22; for (let i = st / 2; i < W; i += st) for (let j = st / 2; j < H; j += st) { x.beginPath(); x.arc(i, j, 1.3, 0, 7); x.fill(); }
    if (o.pulse) {
      x.strokeStyle = p[3]; x.lineWidth = W * .012; x.shadowColor = p[3]; x.shadowBlur = 18; x.lineJoin = 'round';
      const y = H * .8; x.beginPath(); x.moveTo(0, y);
      [[.3, 0], [.36, -.06], [.4, .05], [.45, -.16], [.5, .1], [.55, 0], [1, 0]].forEach(([u, v]) => x.lineTo(u * W, y + v * H)); x.stroke(); x.shadowBlur = 0;
    }
    if (o.stars) { x.fillStyle = p[3]; x.save(); x.translate(cx + W * .2, cy + H * .18); x.rotate(-.6); x.beginPath(); x.moveTo(0, -W * .05); x.lineTo(W * .025, W * .04); x.lineTo(-W * .025, W * .04); x.closePath(); x.shadowColor = p[3]; x.shadowBlur = 20; x.fill(); x.restore(); x.shadowBlur = 0; }
  },
  planet(x, W, H, p, r) {
    x.fillStyle = p[0]; x.fillRect(0, 0, W, H); stars(x, W, H, r, 240, '#ffffff', 1.5);
    for (let i = 0; i < 3; i++) glow(x, r() * W, r() * H, W * (.3 + r() * .3), p[1], .35);
    const cx = W * .6, cy = H * .58, R = W * .34;
    const ring = front => { x.save(); x.translate(cx, cy); x.rotate(-.35); x.scale(1, .28); x.strokeStyle = hexA(p[3], .75); x.lineWidth = R * .17; x.beginPath(); x.arc(0, 0, R * 1.55, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); x.stroke(); x.lineWidth = R * .04; x.strokeStyle = hexA(p[4], .5); x.beginPath(); x.arc(0, 0, R * 1.78, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); x.stroke(); x.restore(); };
    ring(false);
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.clip();
    x.fillStyle = lg(x, cx - R, cy - R, cx + R, cy + R, [[0, p[2]], [1, p[1]]]); x.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    x.save(); x.translate(cx, cy); x.rotate(-.35); for (let i = 0; i < 10; i++) { x.fillStyle = hexA(i % 2 ? p[3] : p[0], .2); x.fillRect(-R * 1.3, -R + i * R * .22 + r() * R * .06, R * 2.6, R * (.04 + r() * .09)); } x.restore();
    x.fillStyle = rg(x, cx - R * .45, cy - R * .45, R * .2, R * 1.9, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.92)']]); x.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    x.restore();
    ring(true);
    x.fillStyle = p[4]; x.beginPath(); x.arc(W * .18, H * .22, W * .045, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(W * .195, H * .225, W * .042, 0, 7); x.fill();
  },
  moonfarm(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H * .6, [[0, p[0]], [1, p[1]]]); x.fillRect(0, 0, W, H); stars(x, W, H * .55, r, 120, '#ffffff', 1.3);
    const ex = W * .76, ey = H * .2, eR = W * .1;
    x.save(); x.beginPath(); x.arc(ex, ey, eR, 0, 7); x.clip(); x.fillStyle = '#3d7bd9'; x.fillRect(ex - eR, ey - eR, 2 * eR, 2 * eR);
    x.fillStyle = '#5fbf6a'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(ex + (r() - .5) * eR * 1.6, ey + (r() - .5) * eR * 1.6, eR * (.2 + r() * .3), eR * (.1 + r() * .2), r() * 3, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 4; i++) { x.fillRect(ex - eR, ey - eR + r() * eR * 2, eR * 2, eR * .07); }
    x.fillStyle = rg(x, ex - eR * .4, ey - eR * .4, eR * .2, eR * 1.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.85)']]); x.fillRect(ex - eR, ey - eR, 2 * eR, 2 * eR); x.restore();
    x.fillStyle = lg(x, 0, H * .52, 0, H, [[0, '#a4a9ba'], [1, '#4a4e5e']]); x.beginPath(); x.arc(W * .5, H * 1.95, H * 1.4, 0, 7); x.fill();
    for (let i = 0; i < 9; i++) { const cx = r() * W, cy = H * .62 + r() * H * .35, s = W * (.02 + r() * .06); x.fillStyle = 'rgba(30,32,44,.35)'; x.beginPath(); x.ellipse(cx, cy, s, s * .35, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; x.stroke(); }
    for (let row = 0; row < 6; row++) { const y = H * .7 + row * H * .045; for (let i = 0; i < 9; i++) { const px = W * (.06 + i * .055 + row * .01); x.fillStyle = p[2]; x.beginPath(); x.ellipse(px, y, W * .012, H * .01, -.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(px + W * .012, y - H * .004, W * .01, H * .008, .5, 0, 7); x.fill(); } }
    const dx = W * .74, dy = H * .77, dR = W * .18;
    x.fillStyle = hexA(p[2], .2); x.beginPath(); x.arc(dx, dy, dR, Math.PI, 0); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(dx, dy, dR, Math.PI, 0); x.stroke();
    x.lineWidth = 1.5; for (let i = 1; i < 4; i++) { x.beginPath(); x.ellipse(dx, dy, dR * i / 4, dR, 0, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(dx - dR * Math.sqrt(1 - (i / 4) ** 2), dy - dR * i / 4); x.lineTo(dx + dR * Math.sqrt(1 - (i / 4) ** 2), dy - dR * i / 4); x.stroke(); }
    x.fillStyle = '#50586e'; x.fillRect(dx - dR * 1.05, dy, dR * 2.1, H * .015);
  },
  forest(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, mix(p[1], '#ffffff', .12)], [.55, mix(p[1], p[0], .45)], [1, p[0]]]); x.fillRect(0, 0, W, H);
    x.fillStyle = hexA(p[3], .92); x.beginPath(); x.arc(W * .7, H * .2, W * .13, 0, 7); x.fill(); glow(x, W * .7, H * .2, W * .45, p[3], .25);
    for (let L = 0; L < 5; L++) {
      const t = L / 4, col = mix(mix(p[1], '#ffffff', .05), p[0], .2 + t * .8), base = H * (.5 + t * .12), n = 7 + L * 3;
      x.fillStyle = col; x.fillRect(0, base, W, H - base);
      for (let i = 0; i < n; i++) { const tx = (i + r() * .8) / n * W * 1.12 - W * .06, th = H * (.16 + r() * .14) * (.75 + t * .7); spruce(x, tx, base, th * .27, th); }
      x.fillStyle = lg(x, 0, base - H * .08, 0, base + H * .03, [[0, hexA(p[1], 0)], [1, hexA(mix(p[1], '#ffffff', .2), .22)]]); x.fillRect(0, base - H * .08, W, H * .11);
    }
    x.fillStyle = p[2]; x.shadowColor = p[2]; x.shadowBlur = 12; for (let i = 0; i < 24; i++) { x.globalAlpha = .4 + r() * .6; x.beginPath(); x.arc(r() * W, H * .55 + r() * H * .42, 1.5 + r() * 2.5, 0, 7); x.fill(); } x.shadowBlur = 0; x.globalAlpha = 1;
  },
  city(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, p[0]], [.7, p[1]], [1, mix(p[1], p[2], .45)]]); x.fillRect(0, 0, W, H);
    stars(x, W, H * .35, r, 30, '#ffffff', 1);
    let xx = 0; while (xx < W) { const bw = W * (.05 + r() * .08), bh = H * (.3 + r() * .35); x.fillStyle = mix(p[1], p[0], .55); x.fillRect(xx, H - bh, bw, bh); xx += bw + W * .006; }
    xx = -W * .02; while (xx < W) {
      const bw = W * (.09 + r() * .12), bh = H * (.32 + r() * .42); x.fillStyle = mix(p[0], '#000000', .3); x.fillRect(xx, H - bh, bw, bh);
      for (let wy = H - bh + H * .02; wy < H - H * .02; wy += H * .026) for (let wx = xx + W * .012; wx < xx + bw - W * .015; wx += W * .022) if (r() < .32) { x.fillStyle = r() < .5 ? hexA(p[3], .85) : hexA(p[2], .75); x.fillRect(wx, wy, W * .01, H * .011); }
      xx += bw + W * .01;
    }
    x.strokeStyle = p[2]; x.lineWidth = W * .011; x.shadowColor = p[2]; x.shadowBlur = 28; rr(x, W * .16, H * .4, W * .075, H * .24, W * .02); x.stroke();
    x.strokeStyle = p[3]; x.shadowColor = p[3]; rr(x, W * .7, H * .52, W * .16, H * .05, W * .015); x.stroke(); x.shadowBlur = 0;
    x.fillStyle = p[2]; for (let i = 0; i < 4; i++) x.fillRect(W * .178, H * (.43 + i * .05), W * .04, H * .025);
  },
  mountains(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H * .72, [[0, p[0]], [.55, p[1]], [1, mix(p[1], p[2], .6)]]); x.fillRect(0, 0, W, H);
    x.fillStyle = lg(x, 0, H * .32, 0, H * .52, [[0, p[3]], [1, p[2]]]); x.beginPath(); x.arc(W * .32, H * .44, W * .09, 0, 7); x.fill(); glow(x, W * .32, H * .44, W * .4, p[2], .3);
    for (let L = 0; L < 4; L++) {
      const t = L / 3, base = H * (.44 + t * .17), amp = H * (.3 - t * .07), col = mix(mix(p[1], '#ffffff', .2), p[0], .15 + t * .82);
      const pts = ridge(x, W, base, amp, r, col, H, { freq: 1.6 + L * .4, peaky: true });
      if (L < 3) {
        x.save(); x.beginPath(); x.moveTo(0, H); pts.forEach(q => x.lineTo(q[0], q[1])); x.lineTo(W, H); x.closePath(); x.clip();
        x.fillStyle = hexA('#ffffff', .85 - L * .22); x.beginPath(); x.moveTo(0, 0);
        for (let i = 0; i <= 40; i++) x.lineTo(i / 40 * W, base - amp * .58 + Math.sin(i * 1.7 + L) * amp * .06 + (r() - .5) * amp * .05);
        x.lineTo(W, 0); x.closePath(); x.fill(); x.restore();
      }
    }
  },
  snow(x, W, H, p, r) {
    ART.mountains(x, W, H, p, r);
    const hz = H * .66; x.fillStyle = lg(x, 0, hz, 0, H, [[0, '#e7eef5'], [1, '#c7d3df']]); x.fillRect(0, hz, W, H - hz);
    x.fillStyle = '#3b444f'; x.beginPath(); x.moveTo(W * .485, hz); x.lineTo(W * .515, hz); x.lineTo(W * .9, H); x.lineTo(W * .1, H); x.closePath(); x.fill();
    x.strokeStyle = p[2]; x.lineWidth = 3; x.setLineDash([12, 14]); x.beginPath(); x.moveTo(W * .5, hz); x.lineTo(W * .5, H); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#161b21'; rr(x, W * .41, H * .8, W * .18, H * .07, W * .02); x.fill(); rr(x, W * .44, H * .765, W * .12, H * .05, W * .02); x.fill();
    x.fillStyle = p[2]; x.shadowColor = p[2]; x.shadowBlur = 18; x.fillRect(W * .42, H * .825, W * .03, H * .012); x.fillRect(W * .55, H * .825, W * .03, H * .012); x.shadowBlur = 0;
    x.fillStyle = '#ffffff'; for (let i = 0; i < 320; i++) { x.globalAlpha = .4 + r() * .6; x.beginPath(); x.arc(r() * W, r() * H, .6 + r() * 2.2, 0, 7); x.fill(); } x.globalAlpha = 1;
  },
  cards(x, W, H, p, r) {
    x.fillStyle = p[0]; x.fillRect(0, 0, W, H);
    x.strokeStyle = hexA(p[3], .05); x.lineWidth = 1; for (let i = 0; i < 160; i++) { const y = r() * H; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y + (r() - .5) * 8); x.stroke(); }
    x.fillStyle = p[3]; x.beginPath(); x.arc(W * .55, H * .52, W * .2, 0, 7); x.fill();
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = W * .17 + Math.pow(r(), 1.5) * W * .32; x.beginPath(); x.arc(W * .55 + Math.cos(a) * d, H * .52 + Math.sin(a) * d * 1.2, W * (.006 + r() * .035) * (1 - d / (W * .55)), 0, 7); x.fill(); }
    const sym = ['diamond', 'eye', 'moon'], letters = ['7', 'R', 'A'];
    for (let i = 0; i < 3; i++) {
      x.save(); x.translate(W * (.3 + i * .2), H * (.56 + (i === 1 ? -.05 : 0))); x.rotate((i - 1) * .3);
      const cw = W * .3, ch = cw * 1.45; rr(x, -cw / 2, -ch / 2, cw, ch, cw * .07); x.fillStyle = '#fffaf0'; x.fill(); x.strokeStyle = p[3]; x.lineWidth = 3; x.stroke();
      rr(x, -cw / 2 + cw * .07, -ch / 2 + cw * .07, cw * .86, ch - cw * .14, cw * .04); x.lineWidth = 1.5; x.stroke();
      x.fillStyle = i === 1 ? p[3] : p[2]; const s = cw * .22;
      if (sym[i] === 'diamond') { x.beginPath(); x.moveTo(0, -s * 1.3); x.lineTo(s, 0); x.lineTo(0, s * 1.3); x.lineTo(-s, 0); x.closePath(); x.fill(); }
      if (sym[i] === 'eye') { x.beginPath(); x.ellipse(0, 0, s * 1.3, s * .7, 0, 0, 7); x.fill(); x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(0, 0, s * .45, 0, 7); x.fill(); x.fillStyle = p[2]; x.beginPath(); x.arc(0, 0, s * .22, 0, 7); x.fill(); }
      if (sym[i] === 'moon') { x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(s * .4, -s * .2, s * .85, 0, 7); x.fill(); }
      x.fillStyle = p[3]; x.font = `italic 700 ${Math.round(cw * .2)}px ${F.fraunces}`; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText(letters[i], -cw / 2 + cw * .1, -ch / 2 + cw * .08);
      x.restore();
    }
  },
  gears(x, W, H, p, r) {
    x.fillStyle = rg(x, W * .5, H * .4, 0, H * .9, [[0, p[1]], [1, p[0]]]); x.fillRect(0, 0, W, H);
    const cx = W * .55, cy = H * .38, R = W * .3;
    x.fillStyle = hexA(p[3], .1); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.strokeStyle = p[3]; x.lineWidth = W * .012; x.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = i % 3 ? W * .006 : W * .014; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * .82, cy + Math.sin(a) * R * .82); x.lineTo(cx + Math.cos(a) * R * .94, cy + Math.sin(a) * R * .94); x.stroke(); }
    x.lineCap = 'round'; x.lineWidth = W * .016; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + R * .5, cy - R * .25); x.stroke(); x.lineWidth = W * .01; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx - R * .1, cy - R * .72); x.stroke(); x.lineCap = 'butt';
    gear(x, W * .2, H * .74, W * .17, 14, p[2], .1); gear(x, W * .5, H * .83, W * .11, 10, mix(p[2], p[0], .35), .3); gear(x, W * .84, H * .7, W * .14, 12, p[3], .2); gear(x, W * .12, H * .26, W * .08, 8, hexA(p[2], .55), 0);
    x.fillStyle = mix(p[0], '#000000', .4); for (let i = 0; i < 7; i++) { const bx = i * W * .15 - W * .03, bh = H * (.06 + r() * .1); x.fillRect(bx, H - bh, W * .12, bh); x.fillRect(bx + W * .03, H - bh - H * .06, W * .025, H * .06); }
    x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(W * (.1 + i * .15) + r() * 20, H * .82 - i * 6 - r() * 30, W * (.03 + r() * .03), 0, 7); x.fill(); }
  },
  blocks(x, W, H, p, r, o) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, p[0]], [1, p[1]]]); x.fillRect(0, 0, W, H);
    if (o.night) stars(x, W, H * .6, r, 80, '#fff1e8', 1.6);
    const s = W / 16;
    const cloud = (cx, cy) => { x.fillStyle = o.night ? hexA(p[4], .25) : '#ffffff'; [[0, 0, 4, 1], [1, -1, 2, 1], [-1, 1, 6, 1]].forEach(([dx, dy, w, h]) => x.fillRect(cx + dx * s * .5, cy + dy * s * .5, w * s * .5, h * s * .5)); };
    cloud(W * .1, H * .14); cloud(W * .62, H * .22); cloud(W * .35, H * .08);
    x.fillStyle = o.night ? mix(p[1], p[0], .3) : '#57b85a';
    for (let i = 0; i < 3; i++) { const hx = W * (.15 + i * .38), hw = W * .35, hh = H * (.16 + i % 2 * .06); x.beginPath(); x.ellipse(hx, H * .78, hw / 2, hh, 0, Math.PI, 0); x.fill(); }
    const gy = H * .78;
    for (let row = 0; row < 5; row++) for (let i = 0; i < 17; i++) { const bx = i * s - (row % 2) * s * .5, by = gy + row * s * .8; x.fillStyle = row === 0 ? (o.night ? p[1] : '#4aa14d') : mix(p[2], '#000000', row * .08); x.fillRect(bx, by, s - 2, s * .8 - 2); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(bx, by, s - 2, 3); }
    [[.22, .55], [.29, .55], [.64, .45]].forEach(([u, v]) => { const bx = u * W, by = v * H; x.fillStyle = p[3]; x.fillRect(bx, by, s, s); x.strokeStyle = mix(p[3], '#000000', .4); x.lineWidth = 3; x.strokeRect(bx + 1.5, by + 1.5, s - 3, s - 3); x.fillStyle = mix(p[3], '#000000', .35); x.fillRect(bx + s * .4, by + s * .25, s * .2, s * .5); });
    x.fillStyle = p[3]; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(W * (.42 + i * .06), H * (.48 - Math.sin(i / 4 * Math.PI) * .06), s * .18, s * .25, 0, 0, 7); x.fill(); }
    const hx = W * .48, hy = gy;
    if (o.hero === 'cookie') {
      x.fillStyle = '#c0392b'; x.beginPath(); x.moveTo(hx - s * .5, hy - s * 1.6); x.quadraticCurveTo(hx - s * 1.6, hy - s * 1.2, hx - s * 1.4, hy - s * .1); x.lineTo(hx, hy - s * .6); x.fill();
      x.fillStyle = '#d99a4e'; x.beginPath(); x.arc(hx, hy - s * 1.15, s * 1.05, 0, 7); x.fill();
      x.fillStyle = '#5a3416'; [[-.4, -.3], [.35, -.5], [.1, .3], [-.2, .5], [.5, .2]].forEach(([u, v]) => { x.beginPath(); x.arc(hx + u * s, hy - s * 1.15 + v * s, s * .13, 0, 7); x.fill(); });
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(hx - s * .3, hy - s * 1.35, s * .2, 0, 7); x.arc(hx + s * .3, hy - s * 1.35, s * .2, 0, 7); x.fill();
      x.fillStyle = '#1b1b1b'; x.beginPath(); x.arc(hx - s * .26, hy - s * 1.33, s * .09, 0, 7); x.arc(hx + s * .34, hy - s * 1.33, s * .09, 0, 7); x.fill();
    } else {
      const u = s * .22; const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(hx + a * u, hy - s * 2.1 + b * u, w * u, h * u); };
      px(-2, 0, 4, 1, '#c2c3c7'); px(-3, 1, 6, 3, '#c2c3c7'); px(-2, 2, 4, 1, '#1d2b53'); px(-3, 4, 6, 3, p[2]); px(-3, 7, 2, 2, '#5f574f'); px(1, 7, 2, 2, '#5f574f'); px(3, 3, 1, 5, '#fff1e8'); px(2, 4, 3, 1, p[3]);
    }
  },
  tunnel(x, W, H, p, r) {
    x.fillStyle = p[0]; x.fillRect(0, 0, W, H);
    const vx = W * .5, vy = H * .5;
    for (let i = 20; i >= 0; i--) {
      const t = Math.pow(i / 20, 1.7), w = W * .06 + W * 1.25 * t, h = H * .045 + H * .95 * t;
      x.strokeStyle = i % 2 ? mix(p[1], p[0], .35) : p[1]; x.lineWidth = 2 + t * 16; rr(x, vx - w / 2, vy - h / 2, w, h, w * .3); x.stroke();
      if (i % 3 === 0 && i > 0) { x.fillStyle = p[2]; x.shadowColor = p[2]; x.shadowBlur = 14; const lw = 3 + t * 10, lh = 2 + t * 5; x.fillRect(vx - w / 2 + t * 22, vy - h * .12, lw, lh); x.fillRect(vx + w / 2 - t * 22 - lw, vy - h * .12, lw, lh); x.shadowBlur = 0; }
    }
    x.strokeStyle = mix(p[1], '#ffffff', .2); x.lineWidth = 3; [-.12, -.05, .05, .12].forEach(o2 => { x.beginPath(); x.moveTo(vx + o2 * W * .1, vy + H * .03); x.lineTo(vx + o2 * W * 4, H); x.stroke(); });
    glow(x, vx, vy + H * .015, W * .35, p[2], .45);
    x.fillStyle = '#fffbe8'; x.beginPath(); x.arc(vx - W * .025, vy + H * .015, W * .012, 0, 7); x.arc(vx + W * .025, vy + H * .015, W * .012, 0, 7); x.fill();
    x.fillStyle = p[3]; x.shadowColor = p[3]; x.shadowBlur = 20; x.beginPath(); x.arc(W * .12, H * .2, W * .014, 0, 7); x.fill(); x.shadowBlur = 0;
    vignette(x, W, H, .6);
  },
  noir(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, p[1]], [1, p[0]]]); x.fillRect(0, 0, W, H);
    x.fillStyle = mix(p[0], '#000000', .3);
    [[0, .35, .2], [.18, .22, .16], [.32, .42, .14], [.82, .28, .22]].forEach(([u, v, w]) => { x.fillRect(u * W, v * H, w * W, H); for (let i = 0; i < 6; i++) if (r() < .5) { x.fillStyle = hexA(p[2], .45); x.fillRect(u * W + W * .03 + r() * w * W * .6, v * H + H * .04 + i * H * .07, W * .02, H * .025); x.fillStyle = mix(p[0], '#000000', .3); } });
    const lx = W * .7;
    x.fillStyle = lg(x, 0, H * .3, 0, H * .95, [[0, hexA(p[2], .55)], [1, hexA(p[2], .06)]]); x.beginPath(); x.moveTo(lx - W * .03, H * .31); x.lineTo(lx + W * .03, H * .31); x.lineTo(lx + W * .28, H * .95); x.lineTo(lx - W * .32, H * .95); x.closePath(); x.fill();
    x.fillStyle = '#05070a'; x.fillRect(lx + W * .045, H * .3, W * .014, H * .66); x.fillRect(lx, H * .295, W * .06, H * .01);
    x.fillStyle = p[2]; x.shadowColor = p[2]; x.shadowBlur = 30; rr(x, lx - W * .035, H * .29, W * .07, H * .025, 6); x.fill(); x.shadowBlur = 0;
    const fx = W * .6, fy = H * .93; x.fillStyle = '#05070a';
    x.beginPath(); x.moveTo(fx - W * .06, fy); x.lineTo(fx - W * .04, fy - H * .2); x.lineTo(fx + W * .04, fy - H * .2); x.lineTo(fx + W * .07, fy); x.closePath(); x.fill();
    x.beginPath(); x.arc(fx, fy - H * .23, W * .03, 0, 7); x.fill();
    x.beginPath(); x.ellipse(fx, fy - H * .255, W * .07, H * .011, 0, 0, 7); x.fill(); x.fillRect(fx - W * .035, fy - H * .3, W * .07, H * .045);
    x.fillStyle = hexA(p[2], .3); x.beginPath(); x.ellipse(lx - W * .05, H * .965, W * .22, H * .018, 0, 0, 7); x.fill();
    x.strokeStyle = hexA(p[4], .22); x.lineWidth = 1.2; for (let i = 0; i < 420; i++) { const rx = r() * W * 1.2, ry = r() * H, l = H * (.02 + r() * .04); x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - l * .25, ry + l); x.stroke(); }
    vignette(x, W, H, .55);
  },
  waves(x, W, H, p, r) {
    const hz = H * .6;
    x.fillStyle = lg(x, 0, 0, 0, hz, [[0, p[0]], [.5, p[1]], [1, p[2]]]); x.fillRect(0, 0, W, hz);
    x.fillStyle = p[3]; x.beginPath(); x.arc(W * .52, hz, W * .21, Math.PI, 0); x.fill(); glow(x, W * .52, hz, W * .6, p[2], .35);
    x.fillStyle = mix(p[0], '#000000', .2); x.fillRect(0, hz, W, H - hz);
    for (let k = 0; k < 18; k++) { const y = hz + (H - hz) * Math.pow(k / 18, 1.4) + 2, w = W * (.1 + (1 - k / 18) * .25); x.fillStyle = hexA(k % 2 ? p[2] : p[3], .5 - k * .02); x.fillRect(W * .52 - w / 2 + (r() - .5) * 20, y, w, 2 + k * .3); }
    const sx = W * .3, sy = hz + H * .035; x.fillStyle = '#0d0507';
    x.beginPath(); x.moveTo(sx - W * .17, sy - H * .03); x.lineTo(sx + W * .16, sy - H * .035); x.lineTo(sx + W * .12, sy + H * .015); x.lineTo(sx - W * .13, sy + H * .015); x.closePath(); x.fill();
    [[-.06, .28], [.05, .34]].forEach(([u, hh]) => { const mxp = sx + u * W; x.fillRect(mxp - 2, sy - H * hh, 4, H * hh); x.beginPath(); x.moveTo(mxp - W * .07, sy - H * hh * .88); x.quadraticCurveTo(mxp, sy - H * hh * .8, mxp + W * .07, sy - H * hh * .88); x.lineTo(mxp + W * .065, sy - H * hh * .2); x.quadraticCurveTo(mxp, sy - H * hh * .1, mxp - W * .065, sy - H * hh * .2); x.closePath(); x.fill(); });
    x.beginPath(); x.moveTo(sx + W * .05, sy - H * .34); x.lineTo(sx + W * .1, sy - H * .32); x.lineTo(sx + W * .05, sy - H * .3); x.fill();
    x.strokeStyle = '#0d0507'; x.lineWidth = 3; for (let i = 0; i < 5; i++) { const bx = W * (.6 + r() * .3), by = H * (.12 + r() * .2), s = W * (.015 + r() * .015); x.beginPath(); x.moveTo(bx - s, by - s * .5); x.quadraticCurveTo(bx - s * .4, by - s * .7, bx, by); x.quadraticCurveTo(bx + s * .4, by - s * .7, bx + s, by - s * .5); x.stroke(); }
  },
  desert(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H * .7, [[0, p[1]], [.6, p[2]], [1, p[3]]]); x.fillRect(0, 0, W, H);
    x.fillStyle = hexA('#fffbe8', .95); x.beginPath(); x.arc(W * .62, H * .34, W * .15, 0, 7); x.fill(); glow(x, W * .62, H * .34, W * .55, p[3], .5);
    x.fillStyle = mix(p[1], p[0], .35);
    [[.2, .56, .16], [.33, .58, .1], [.72, .6, .09]].forEach(([u, v, s]) => { x.beginPath(); x.moveTo(u * W - s * W, v * H); x.lineTo(u * W, v * H - s * W * .85); x.lineTo(u * W + s * W, v * H); x.closePath(); x.fill(); });
    ridge(x, W, H * .64, H * .06, r, mix(p[2], p[1], .3), H, { freq: .8 });
    const pts = ridge(x, W, H * .76, H * .08, r, mix(p[1], p[0], .25), H, { freq: .7 });
    ridge(x, W, H * .9, H * .07, r, p[0], H, { freq: .6 });
    x.fillStyle = mix(p[0], '#000000', .3);
    for (let i = 0; i < 5; i++) { const q = pts[30 + i * 6]; if (!q) continue; const cx = q[0], cy = q[1]; x.beginPath(); x.ellipse(cx, cy - W * .018, W * .02, W * .012, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx - W * .006, cy - W * .032, W * .008, 0, 7); x.fill(); x.fillRect(cx + W * .012, cy - W * .04, W * .004, W * .025); x.fillRect(cx - W * .014, cy - W * .01, W * .004, W * .012); x.fillRect(cx + W * .008, cy - W * .01, W * .004, W * .012); }
  },
  tram(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, p[1]], [1, mix(p[1], '#ffffff', .55)]]); x.fillRect(0, 0, W, H);
    x.fillStyle = hexA(p[0], .35); let xx = 0; while (xx < W) { const bw = W * (.1 + r() * .14), bh = H * (.35 + r() * .3); x.fillRect(xx, H * .78 - bh, bw, bh); xx += bw + W * .015; }
    x.strokeStyle = p[0]; x.lineWidth = 2; [.1, .13].forEach(v => { x.beginPath(); x.moveTo(0, H * v); x.quadraticCurveTo(W / 2, H * (v + .03), W, H * v); x.stroke(); });
    x.fillStyle = mix(p[0], '#000000', .25); x.fillRect(0, H * .78, W, H * .22);
    x.strokeStyle = '#a6b4c2'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * .44, H * .78); x.lineTo(W * .2, H); x.moveTo(W * .56, H * .78); x.lineTo(W * .8, H); x.stroke();
    const tx = W * .2, ty = H * .3, tw = W * .6, th = H * .5;
    x.strokeStyle = p[0]; x.lineWidth = 4; x.beginPath(); x.moveTo(W * .5, ty); x.lineTo(W * .42, H * .18); x.lineTo(W * .58, H * .12); x.stroke();
    rr(x, tx, ty, tw, th, W * .08); x.fillStyle = p[3]; x.fill();
    x.fillStyle = mix(p[3], '#000000', .15); x.fillRect(tx, ty + th * .72, tw, th * .1);
    rr(x, tx + tw * .08, ty + th * .2, tw * .84, th * .38, W * .03); x.fillStyle = p[0]; x.fill();
    x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.moveTo(tx + tw * .12, ty + th * .22); x.lineTo(tx + tw * .3, ty + th * .22); x.lineTo(tx + tw * .18, ty + th * .55); x.lineTo(tx + tw * .1, ty + th * .55); x.fill();
    rr(x, tx + tw * .25, ty + th * .05, tw * .5, th * .1, 6); x.fillStyle = '#111111'; x.fill();
    x.fillStyle = p[2]; x.font = `700 ${Math.round(th * .065)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LÍNEA 97', W * .5, ty + th * .1);
    x.fillStyle = '#fffbe8'; x.shadowColor = '#fffbe8'; x.shadowBlur = 20; x.beginPath(); x.arc(tx + tw * .17, ty + th * .67, W * .03, 0, 7); x.arc(tx + tw * .83, ty + th * .67, W * .03, 0, 7); x.fill(); x.shadowBlur = 0;
  },
  tower(x, W, H, p, r) {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, p[0]], [1, p[1]]]); x.fillRect(0, 0, W, H); stars(x, W, H * .8, r, 160, '#ffffff', 1.4);
    x.fillStyle = hexA(p[3], .95); x.beginPath(); x.arc(W * .74, H * .18, W * .11, 0, 7); x.fill(); glow(x, W * .74, H * .18, W * .4, p[3], .2);
    x.fillStyle = mix(p[0], '#000000', .35);
    x.beginPath(); x.moveTo(W * .4, H); x.lineTo(W * .44, H * .26); x.lineTo(W * .56, H * .26); x.lineTo(W * .6, H); x.closePath(); x.fill();
    for (let i = 0; i < 5; i++) x.fillRect(W * (.425 + i * .03), H * .225, W * .02, H * .04);
    x.beginPath(); x.moveTo(W * .43, H * .23); x.lineTo(W * .5, H * .08); x.lineTo(W * .57, H * .23); x.closePath(); x.fill();
    for (let i = 0; i < 9; i++) { const wy = H * (.32 + i * .07); if (r() < .7) { x.fillStyle = p[3]; x.shadowColor = p[3]; x.shadowBlur = 12; rr(x, W * (.47 + (i % 2) * .03), wy, W * .022, H * .03, 5); x.fill(); x.shadowBlur = 0; } }
    x.fillStyle = hexA(p[2], .25); for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(W * .5, H * (.4 + i * .14), W * .32, H * .025, (i % 2 ? .1 : -.1), 0, 7); x.fill(); }
    ridge(x, W, H * .92, H * .06, r, mix(p[0], '#000000', .5), H, { freq: .8 });
    x.fillStyle = p[2]; for (let i = 0; i < 16; i++) { const sx = r() * W, sy = r() * H * .85, s = 2 + r() * 5; x.beginPath(); x.moveTo(sx, sy - s); x.lineTo(sx + s * .25, sy); x.lineTo(sx, sy + s); x.lineTo(sx - s * .25, sy); x.closePath(); x.fill(); x.beginPath(); x.moveTo(sx - s, sy); x.lineTo(sx, sy + s * .25); x.lineTo(sx + s, sy); x.lineTo(sx, sy - s * .25); x.closePath(); x.fill(); }
  }
};
function drawArt(x, W, H, g, seedOff = 0) { ART[g.art](x, W, H, g.pal, rng(hash(g.id) + seedOff * 977), g.artOpt || {}); }
