
/* =====================================================================
   GLB: the usual 3D format (binary glTF), read with three.js's own loader
   and handed over in the shape the rest of the page expects of a model
   (as UGC.build does for EmuVR's): in centimetres, standing on its base
   and centred, with its meshes and materials listed and its animation, if
   it has one, on a loop. For decorating the rooms with anything exported
   from Blender or downloaded as .glb, not only EmuVR's .ugc.
   The loader is only fetched the first time a .glb is used.
   ===================================================================== */
const GLB = {
  loading: null,
  /* a .glb starts with the letters glTF */
  is(buf) { return buf instanceof ArrayBuffer && buf.byteLength > 20 && new DataView(buf).getUint32(0, true) === 0x46546C67; },
  script(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => { s.remove(); rej(new Error('no ' + src)); }; document.head.appendChild(s); }); },
  /* beside the page inside Playnite; from the same CDN as three.js in the browser demo */
  ready() {
    if (THREE.GLTFLoader) return Promise.resolve();
    return this.loading || (this.loading = this.script('vendor/GLTFLoader.js').catch(() => this.script('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
      .then(() => { if (!THREE.GLTFLoader) throw new Error('GLTFLoader'); }).catch(e => { this.loading = null; throw e; }));
  },
  /* a picture bigger than the cap is drawn smaller: a figure on a shelf does not need a 4K skin */
  shrink(tex, max) {
    const im = tex && tex.image; if (!im || !im.width || Math.max(im.width, im.height) <= max) return;
    const k = max / Math.max(im.width, im.height), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); if (im.close) im.close();
    tex.image = c; tex.needsUpdate = true;
  },
  async build(buf, opts = {}) {
    await this.ready();
    /* (the loader keeps what it is given: it gets its own copy, the stored one stays whole) */
    const gltf = await new Promise((res, rej) => { try { new THREE.GLTFLoader().parse(buf.slice(0), '', res, rej); } catch (e) { rej(e); } });
    const inner = gltf.scene || (gltf.scenes && gltf.scenes[0]); if (!inner) throw new Error('glb: no scene');
    /* glTF is in metres, the room in centimetres */
    const model = new THREE.Group(); model.add(inner); model.scale.setScalar(100);
    const root = new THREE.Group(); root.add(model);
    const meshes = [], mats = new Set(), drop = [];
    inner.traverse(o => {
      /* its own lamps and cameras would light and frame the whole room */
      if (o.isLight || o.isCamera) { drop.push(o); return; }
      if (!o.isMesh) return;
      meshes.push(o); o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false;
      [].concat(o.material).forEach(m => { if (m) mats.add(m); });
    });
    drop.forEach(o => { if (o.parent) o.parent.remove(o); });
    if (!meshes.length) throw new Error('glb: no meshes');
    const max = opts.maxTex || 2048, materials = [...mats];
    materials.forEach(m => {
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap'].forEach(k => { if (m[k]) { this.shrink(m[k], max); if (k === 'map' || k === 'emissiveMap') m[k].anisotropy = maxAniso; } });
      /* lit like everything else in the room: the room's light presets reach it too */
      m.userData.envBase = 1; if ('envMapIntensity' in m) m.envMapIntensity = ENV_K; allMats.push(m);
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3(), bounds = () => { root.updateMatrixWorld(true); box.makeEmpty(); meshes.forEach(m => { if (m.visible) skinBoxOf(m, box); }); return box; };
    bounds(); if (box.isEmpty()) throw new Error('glb: empty');
    /* files come in any size (a figure modelled 20 m tall, a console in millimetres): what is not the size of something
       you would stand on a shelf starts at a hand's height, and from there it is yours to resize */
    const size = box.getSize(new V3()), big = Math.max(size.x, size.y, size.z);
    if (!(big > 4 && big < 90)) { model.scale.multiplyScalar(24 / (big || 1)); bounds(); }
    model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2); bounds();
    /* its first animation plays on a loop, the way EmuVR's animated props do */
    let anim = null;
    const clip = (gltf.animations || []).find(c => c && c.duration > 0);
    if (clip) { const mixer = new THREE.AnimationMixer(inner); mixer.clipAction(clip).play(); anim = { mixer, clips: { on: { dur: clip.duration } }, apply(c, t) { mixer.setTime(t); } }; }
    root.userData = { anchors: {}, lids: [], meshes, art: [], info: { name: opts.name || '', type: 'prop' }, size: box.getSize(new V3()), materials, anim, glb: true };
    return root;
  }
};
