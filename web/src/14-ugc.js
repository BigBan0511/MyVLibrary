
/* =====================================================================
   UGC: EmuVR's user-made objects (.ugc) read straight in the page.
   A .ugc is a Unity 2018 asset bundle: LZ4 blocks holding a serialized
   file (with its type trees) and a .resS with the texture data. We read
   the hierarchy, meshes, materials and textures and build three.js
   objects, keeping the named points the mod brings (socket_media is
   where the medium goes; on a TV, screen_mesh is where the picture
   goes) and the console's own animations (opening, closing, taking the
   medium in, giving it back, powering on), which EmuVR keeps as Mecanim
   clips listed by its GameSystemState script. The same reading serves
   EmuVR's own consoles (see EMUVR), which only change where the objects
   come from.
   Nothing leaves your computer: the files are kept in this browser.
   ===================================================================== */
const UGC = (() => {
  const UNITY_COMMON = 'AABB|AnimationClip|AnimationCurve|AnimationState|Array|Base|BitField|bitset|bool|char|ColorRGBA|Component|data|deque|double|dynamic_array|FastPropertyName|first|float|Font|GameObject|Generic Mono|GradientNEW|GUID|GUIStyle|int|list|long long|map|Matrix4x4f|MdFour|MonoBehaviour|MonoScript|m_ByteSize|m_Curve|m_EditorClassIdentifier|m_EditorHideFlags|m_Enabled|m_ExtensionPtr|m_GameObject|m_Index|m_IsArray|m_IsStatic|m_MetaFlag|m_Name|m_ObjectHideFlags|m_PrefabInternal|m_PrefabParentObject|m_Script|m_StaticEditorFlags|m_Type|m_Version|Object|pair|PPtr<Component>|PPtr<GameObject>|PPtr<Material>|PPtr<MonoBehaviour>|PPtr<MonoScript>|PPtr<Object>|PPtr<Prefab>|PPtr<Sprite>|PPtr<TextAsset>|PPtr<Texture>|PPtr<Texture2D>|PPtr<Transform>|Prefab|Quaternionf|Rectf|RectInt|RectOffset|second|set|short|size|SInt16|SInt32|SInt64|SInt8|staticvector|string|TextAsset|TextMesh|Texture|Texture2D|Transform|TypelessData|UInt16|UInt32|UInt64|UInt8|unsigned int|unsigned long long|unsigned short|vector|Vector2f|Vector3f|Vector4f|m_ScriptingClassIdentifier|Gradient|Type*|int2_storage|int3_storage|BoundsInt|m_CorrespondingSourceObject|m_PrefabInstance|m_PrefabAsset'.split('|');
  const COMMON = new Map(); { let off = 0; for (const s of UNITY_COMMON) { COMMON.set(off, s); off += s.length + 1; } }
  const utf8 = new TextDecoder('utf-8');

  /* ---------- a small binary reader ---------- */
  class Rd {
    constructor(u8, little = false) { this.u = u8; this.v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.p = 0; this.le = little; }
    u8() { return this.u[this.p++]; } bool() { return this.u[this.p++] !== 0; } i8() { return this.v.getInt8(this.p++); }
    u16() { const x = this.v.getUint16(this.p, this.le); this.p += 2; return x; } i16() { const x = this.v.getInt16(this.p, this.le); this.p += 2; return x; }
    u32() { const x = this.v.getUint32(this.p, this.le); this.p += 4; return x; } i32() { const x = this.v.getInt32(this.p, this.le); this.p += 4; return x; }
    i64() { const x = this.v.getBigInt64(this.p, this.le); this.p += 8; return x; } u64() { const x = this.v.getBigUint64(this.p, this.le); this.p += 8; return x; }
    f32() { const x = this.v.getFloat32(this.p, this.le); this.p += 4; return x; } f64() { const x = this.v.getFloat64(this.p, this.le); this.p += 8; return x; }
    bytes(n) { const b = this.u.subarray(this.p, this.p + n); this.p += n; return b; }
    cstr() { let e = this.p; while (e < this.u.length && this.u[e] !== 0) e++; const s = utf8.decode(this.u.subarray(this.p, e)); this.p = e + 1; return s; }
    align(n = 4) { this.p = (this.p + n - 1) & ~(n - 1); }
  }

  /* ---------- LZ4 block ---------- */
  function lz4(src, outSize) {
    const dst = new Uint8Array(outSize); let i = 0, o = 0; const n = src.length;
    while (i < n) {
      const tok = src[i++]; let lit = tok >> 4;
      if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
      dst.set(src.subarray(i, i + lit), o); i += lit; o += lit;
      if (i >= n) break;
      const off = src[i] | (src[i + 1] << 8); i += 2;
      let ml = tok & 15; if (ml === 15) { let b; do { b = src[i++]; ml += b; } while (b === 255); } ml += 4;
      let s = o - off; if (off >= ml) { dst.copyWithin(o, s, s + ml); o += ml; } else while (ml--) dst[o++] = dst[s++];
    }
    return dst;
  }
  function unpack(data, flags, size) {
    const c = flags & 0x3f;
    if (c === 0) return data;
    if (c === 2 || c === 3) return lz4(data, size);
    throw new Error(c === 1 ? 'Este .ugc usa compresión LZMA, que todavía no se puede leer aquí.' : 'Compresión desconocida en el .ugc.');
  }

  /* ---------- the bundle: a list of named files ---------- */
  function readBundle(u8) {
    const r = new Rd(u8, false), sig = r.cstr();
    if (sig !== 'UnityFS') throw new Error('No parece un .ugc de EmuVR (no es un paquete de Unity).');
    const ver = r.u32(); r.cstr(); r.cstr(); r.i64();
    const cSize = r.u32(), uSize = r.u32(), flags = r.u32();
    if (ver >= 7) r.align(16);
    let info;
    if (flags & 0x80) info = unpack(u8.subarray(u8.length - cSize), flags, uSize);
    else { info = unpack(r.bytes(cSize), flags, uSize); }
    if (ver >= 7 && (flags & 0x200)) r.align(16);
    const ir = new Rd(info, false); ir.p += 16;
    const blocks = []; for (let n = ir.i32(), k = 0; k < n; k++) blocks.push({ u: ir.u32(), c: ir.u32(), f: ir.u16() });
    const nodes = []; for (let n = ir.i32(), k = 0; k < n; k++) nodes.push({ off: Number(ir.i64()), size: Number(ir.i64()), flags: ir.u32(), path: ir.cstr() });
    const total = blocks.reduce((a, b) => a + b.u, 0), data = new Uint8Array(total); let o = 0;
    for (const b of blocks) { data.set(unpack(r.bytes(b.c), b.f, b.u), o); o += b.u; }
    const files = new Map(); nodes.forEach(nd => files.set(nd.path, data.subarray(nd.off, nd.off + nd.size)));
    return files;
  }

  /* ---------- the serialized file: types with their trees, and the objects ---------- */
  function readTree(r, version) {
    const n = r.i32(), sLen = r.i32(), size = version >= 19 ? 32 : 24, flat = [];
    for (let k = 0; k < n; k++) {
      const nd = { ver: r.u16(), level: r.u8(), flags: r.u8(), tOff: r.u32(), nOff: r.u32(), byteSize: r.i32(), index: r.i32(), meta: r.i32(), kids: [] };
      if (version >= 19) r.p += 8; flat.push(nd);
    }
    const sb = r.bytes(sLen), str = off => { if (off & 0x80000000) return COMMON.get(off & 0x7fffffff) || ''; let e = off; while (e < sb.length && sb[e]) e++; return utf8.decode(sb.subarray(off, e)); };
    const stack = [];
    for (const nd of flat) { nd.type = str(nd.tOff); nd.name = str(nd.nOff); while (stack.length > nd.level) stack.pop(); if (stack.length) stack[stack.length - 1].kids.push(nd); stack.push(nd); }
    if (version >= 21) { const d = r.i32(); r.p += d * 4; }
    return flat[0];
  }
  /* trees: when the file does not carry its own (a game's data, not a bundle), they are lent from outside */
  function readSerialized(u8, trees) {
    const h = new Rd(u8, false); h.u32(); h.u32(); const version = h.u32(); const dataOffset = h.u32();
    if (version < 14 || version > 22) throw Object.assign(new Error('Versión de Unity no soportada ({0}).'), { arg: version });
    const little = h.u8() === 0; h.p += 3;
    let metaSize = 0, fileSize = 0, dataOff = dataOffset;
    if (version >= 22) { metaSize = h.u32(); fileSize = Number(h.i64()); dataOff = Number(h.i64()); h.i64(); }
    const r = new Rd(u8, little); r.p = h.p;
    r.cstr(); r.i32(); const typeTree = r.bool();
    const types = [], hex = b => Array.from(b, x => (x < 16 ? '0' : '') + x.toString(16)).join('');
    for (let n = r.i32(), k = 0; k < n; k++) {
      const t = { cls: r.i32() }; if (version >= 16) r.bool(); if (version >= 17) r.i16();
      if ((version < 16 && t.cls < 0) || (version >= 16 && t.cls === 114)) t.script = hex(r.bytes(16));
      r.p += 16; if (typeTree) t.tree = readTree(r, version); else if (trees) t.tree = trees(t); types.push(t);
    }
    if (!typeTree && !trees) throw new Error('El .ugc no trae la descripción de sus tipos.');
    const objects = new Map();
    for (let n = r.i32(), k = 0; k < n; k++) {
      r.align(4); const id = r.i64().toString(), start = version >= 22 ? Number(r.i64()) : r.u32(), size = r.u32(), ti = r.i32();
      objects.set(id, { id, start: start + dataOff, size, type: types[ti] });
    }
    return { u8, little, objects };
  }
  const ALIGN = 0x4000;
  function readValue(nd, r) {
    let align = (nd.meta & ALIGN) !== 0, v;
    switch (nd.type) {
      case 'SInt8': v = r.i8(); break; case 'UInt8': case 'char': v = r.u8(); break; case 'bool': v = r.bool(); break;
      case 'short': case 'SInt16': v = r.i16(); break; case 'unsigned short': case 'UInt16': v = r.u16(); break;
      case 'int': case 'SInt32': v = r.i32(); break; case 'unsigned int': case 'UInt32': case 'Type*': v = r.u32(); break;
      case 'long long': case 'SInt64': v = r.i64().toString(); break; case 'unsigned long long': case 'UInt64': case 'FileSize': v = r.u64().toString(); break;
      case 'float': v = r.f32(); break; case 'double': v = r.f64(); break;
      case 'string': { const l = r.i32(); v = l > 0 ? utf8.decode(r.bytes(l)) : ''; r.align(4); break; }
      case 'TypelessData': v = r.bytes(r.i32()); break;
      case 'pair': v = [readValue(nd.kids[0], r), readValue(nd.kids[1], r)]; break;
      default:
        if (nd.kids.length && nd.kids[0].type === 'Array') {
          if (nd.kids[0].meta & ALIGN) align = true;
          const size = r.i32(), sub = nd.kids[0].kids[1];
          if (sub.type === 'UInt8' || sub.type === 'char' || sub.type === 'SInt8') { v = r.bytes(size); if (sub.meta & ALIGN) align = true; }
          else { v = new Array(size); const subAlign = (sub.meta & ALIGN) !== 0; for (let k = 0; k < size; k++) v[k] = subAlign ? readFields(sub, r) : readValue(sub, r); if (subAlign) align = true; }
        } else { v = {}; for (const k of nd.kids) v[k.name] = readValue(k, r); }
    }
    if (align) r.align(4);
    return v;
  }
  /* an array element of an aligned type: read as usual, the array aligns once at its end */
  function readFields(nd, r) { return readValue(nd._na || (nd._na = Object.assign({}, nd, { meta: 0 })), r); }
  function readObject(sf, id) {
    const ob = sf.objects.get(String(id)); if (!ob || !ob.type.tree) return null;
    if (!ob.data) { const r = new Rd(sf.u8.subarray(ob.start, ob.start + ob.size), sf.little); ob.data = readValue(ob.type.tree, r); ob.data.__cls = ob.type.cls; }
    return ob.data;
  }

  /* ---------- meshes ---------- */
  const VFMT = { 0: [4, 'f32'], 1: [2, 'f16'], 2: [1, 'u8n'], 3: [1, 's8n'], 4: [2, 'u16n'], 5: [2, 's16n'], 6: [1, 'u8'], 7: [1, 's8'], 8: [2, 'u16'], 9: [2, 's16'], 10: [4, 'u32'], 11: [4, 's32'] };
  function half(h) { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, f = h & 1023; return e === 0 ? s * Math.pow(2, -14) * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + f / 1024); }
  function meshData(me, little) {
    if (me.m_MeshCompression) throw new Error('Una malla del .ugc está comprimida y todavía no se puede leer.');
    const vd = me.m_VertexData, n = vd.m_VertexCount, raw = vd.m_DataSize, chans = vd.m_Channels;
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const streams = []; let off = 0;
    for (let s = 0, sc = 1 + Math.max(...chans.map(c => c.stream)); s < sc; s++) {
      let stride = 0; chans.forEach(c => { if (c.stream === s && c.dimension > 0) stride += (c.dimension & 15) * VFMT[c.format][0]; });
      streams.push({ off, stride }); off += n * stride; off = (off + 15) & ~15;
    }
    const read = (c) => {
      const dim = c.dimension & 15, [sz, kind] = VFMT[c.format], st = streams[c.stream], out = new Float32Array(n * dim);
      for (let i = 0; i < n; i++) for (let d = 0; d < dim; d++) {
        const p = st.off + i * st.stride + c.offset + d * sz; let x;
        switch (kind) {
          case 'f32': x = dv.getFloat32(p, little); break; case 'f16': x = half(dv.getUint16(p, little)); break;
          case 'u8n': x = dv.getUint8(p) / 255; break; case 's8n': x = Math.max(-1, dv.getInt8(p) / 127); break;
          case 'u16n': x = dv.getUint16(p, little) / 65535; break; case 's16n': x = Math.max(-1, dv.getInt16(p, little) / 32767); break;
          case 'u8': x = dv.getUint8(p); break; case 's8': x = dv.getInt8(p); break; case 'u16': x = dv.getUint16(p, little); break;
          case 's16': x = dv.getInt16(p, little); break; case 'u32': x = dv.getUint32(p, little); break; default: x = dv.getInt32(p, little);
        }
        out[i * dim + d] = x;
      }
      return { arr: out, dim };
    };
    const ch = i => chans[i] && chans[i].dimension > 0 ? read(chans[i]) : null;
    const ib = me.m_IndexBuffer, idv = new DataView(ib.buffer, ib.byteOffset, ib.byteLength), wide = me.m_IndexFormat === 1;
    const subs = me.m_SubMeshes.map(sm => {
      const first = sm.firstByte / (wide ? 4 : 2), cnt = sm.indexCount, base = sm.baseVertex || 0, tri = [];
      const at = i => (wide ? idv.getUint32((first + i) * 4, little) : idv.getUint16((first + i) * 2, little)) + base;
      if (sm.topology === 0) for (let i = 0; i < cnt; i++) tri.push(at(i));
      else if (sm.topology === 1) for (let i = 0; i + 2 < cnt; i++) { const a = at(i), b = at(i + 1), c = at(i + 2); if (a === b || b === c || a === c) continue; if (i & 1) tri.push(b, a, c); else tri.push(a, b, c); }
      else if (sm.topology === 2) for (let i = 0; i + 3 < cnt; i += 4) { const a = at(i), b = at(i + 1), c = at(i + 2), d = at(i + 3); tri.push(a, b, c, a, c, d); }
      return tri;
    });
    return { n, pos: ch(0), nrm: ch(1), uv: ch(4), col: ch(3), subs };
  }

  /* ---------- textures: one mip level, decoded to RGBA (rows bottom-first, as Unity keeps them) ---------- */
  function rgb565(c) { return [((c >> 11) & 31) * 255 / 31, ((c >> 5) & 63) * 255 / 63, (c & 31) * 255 / 31]; }
  function dxt(src, w, h, five) {
    const out = new Uint8Array(w * h * 4), bw = Math.max(1, (w + 3) >> 2), bh = Math.max(1, (h + 3) >> 2), bs = five ? 16 : 8, col = [[0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]], al = new Uint8Array(8);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      let p = (by * bw + bx) * bs, alo = 0, ahi = 0;
      if (five) {
        al[0] = src[p]; al[1] = src[p + 1];
        for (let k = 2; k < 8; k++) al[k] = al[0] > al[1] ? ((8 - k) * al[0] + (k - 1) * al[1]) / 7 : k < 6 ? ((6 - k) * al[0] + (k - 1) * al[1]) / 5 : k === 6 ? 0 : 255;
        alo = src[p + 2] | (src[p + 3] << 8) | (src[p + 4] << 16); ahi = src[p + 5] | (src[p + 6] << 8) | (src[p + 7] << 16); p += 8;
      }
      const c0 = src[p] | (src[p + 1] << 8), c1 = src[p + 2] | (src[p + 3] << 8), a = rgb565(c0), b = rgb565(c1);
      col[0][0] = a[0]; col[0][1] = a[1]; col[0][2] = a[2]; col[1][0] = b[0]; col[1][1] = b[1]; col[1][2] = b[2]; col[3][3] = 255;
      if (c0 > c1 || five) for (let k = 0; k < 3; k++) { col[2][k] = (2 * a[k] + b[k]) / 3; col[3][k] = (a[k] + 2 * b[k]) / 3; }
      else { for (let k = 0; k < 3; k++) { col[2][k] = (a[k] + b[k]) / 2; col[3][k] = 0; } col[3][3] = 0; }
      const bits = src[p + 4] | (src[p + 5] << 8) | (src[p + 6] << 16) | (src[p + 7] << 24);
      for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const x = bx * 4 + px, y = by * 4 + py; if (x >= w || y >= h) continue;
        const k = py * 4 + px, cc = col[(bits >>> (k * 2)) & 3], o = (y * w + x) * 4;
        out[o] = cc[0]; out[o + 1] = cc[1]; out[o + 2] = cc[2]; out[o + 3] = five ? al[k < 8 ? (alo >> (k * 3)) & 7 : (ahi >> ((k - 8) * 3)) & 7] : cc[3];
      }
    }
    return out;
  }
  /* BC7 (what EmuVR's own textures use): eight modes, each block split into one to three subsets */
  const BC7M = [[3, 4, 0, 0, 4, 0, 1, 0, 3, 0], [2, 6, 0, 0, 6, 0, 0, 1, 3, 0], [3, 6, 0, 0, 5, 0, 0, 0, 2, 0], [2, 6, 0, 0, 7, 0, 1, 0, 2, 0],
    [1, 0, 2, 1, 5, 6, 0, 0, 2, 3], [1, 0, 2, 0, 7, 8, 0, 0, 2, 2], [1, 0, 0, 0, 7, 7, 1, 0, 4, 0], [2, 6, 0, 0, 5, 5, 1, 0, 2, 0]];  /* subsets, partition, rotation and index-selection bits, colour and alpha bits, p-bits per endpoint or shared, index bits */
  const BC7W = [0, 0, [0, 21, 43, 64], [0, 9, 18, 27, 37, 46, 55, 64], [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64]];
  const BC7P2 = [0xcccc, 0x8888, 0xeeee, 0xecc8, 0xc880, 0xfeec, 0xfec8, 0xec80, 0xc800, 0xffec, 0xfe80, 0xe800, 0xffe8, 0xff00, 0xfff0, 0xf000, 0xf710, 0x008e, 0x7100, 0x08ce, 0x008c, 0x7310, 0x3100, 0x8cce, 0x088c, 0x3110, 0x6666, 0x366c, 0x17e8, 0x0ff0, 0x718e, 0x399c, 0xaaaa, 0xf0f0, 0x5a5a, 0x33cc, 0x3c3c, 0x55aa, 0x9696, 0xa55a, 0x73ce, 0x13c8, 0x324c, 0x3bdc, 0x6996, 0xc33c, 0x9966, 0x0660, 0x0272, 0x04e4, 0x4e40, 0x2720, 0xc936, 0x936c, 0x39c6, 0x639c, 0x9336, 0x9cc6, 0x817e, 0xe718, 0xccf0, 0x0fcc, 0x7744, 0xee22];
  const BC7P3 = [0xaa685050, 0x6a5a5040, 0x5a5a4200, 0x5450a0a8, 0xa5a50000, 0xa0a05050, 0x5555a0a0, 0x5a5a5050, 0xaa550000, 0xaa555500, 0xaaaa5500, 0x90909090, 0x94949494, 0xa4a4a4a4, 0xa9a59450, 0x2a0a4250, 0xa5945040, 0x0a425054, 0xa5a5a500, 0x55a0a0a0, 0xa8a85454, 0x6a6a4040, 0xa4a45000, 0x1a1a0500, 0x0050a4a4, 0xaaa59090, 0x14696914, 0x69691400, 0xa08585a0, 0xaa821414, 0x50a4a450, 0x6a5a0200, 0xa9a58000, 0x5090a0a8, 0xa8a09050, 0x24242424, 0x00aa5500, 0x24924924, 0x24499224, 0x50a50a50, 0x500aa550, 0xaaaa4444, 0x66660000, 0xa5a0a5a0, 0x50a050a0, 0x69286928, 0x44aaaa44, 0x66666600, 0xaa444444, 0x54a854a8, 0x95809580, 0x96969600, 0xa85454a8, 0x80959580, 0xaa141414, 0x96960000, 0xaaaa1414, 0xa05050a0, 0xa0a5a5a0, 0x96000000, 0x40804080, 0xa9a8a9a8, 0xaaaaaa44, 0x2a4a5254];
  const BC7A2 = 'fffffffffffffffff282288f28228822ff6828ff28222ff66268ff22fffff22f', BC7A3 = '3f38f8f38f3ff3f88f8f6f6f6f5f3f383f388ff33f386fa8538f866a8f5ffaf88ff33f5a6aa889faf63ff85ff3f6f6f83ff35f5f5f8f5faf5faf8fdff3cf3f38';
  function bc7(src, w, h) {
    const out = new Uint8Array(w * h * 4), bw = Math.max(1, (w + 3) >> 2), bh = Math.max(1, (h + 3) >> 2), E = [0, 1, 2, 3, 4, 5].map(() => [0, 0, 0, 0]), P = [], I1 = new Uint8Array(16), I2 = new Uint8Array(16), px = [0, 0, 0, 0];
    let base = 0, pos = 0;
    const bits = n => { let v = 0; for (let i = 0; i < n; i++, pos++) v |= ((src[base + (pos >> 3)] >> (pos & 7)) & 1) << i; return v; };
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      base = (by * bw + bx) * 16; pos = 0;
      let mode = 0; while (mode < 8 && !bits(1)) mode++;
      if (mode === 8) continue;
      const [ns, pb, rb, isb, cb, ab, epb, spb, ib, ib2] = BC7M[mode], part = bits(pb), rot = bits(rb), sel = bits(isb);
      for (let c = 0; c < 3; c++) for (let i = 0; i < ns * 2; i++) E[i][c] = bits(cb);
      for (let i = 0; i < ns * 2; i++) E[i][3] = ab ? bits(ab) : 255;
      P.length = 0;
      if (epb) for (let i = 0; i < ns * 2; i++) P.push(bits(1));
      if (spb) for (let s = 0; s < ns; s++) { const p = bits(1); P.push(p, p); }
      for (let i = 0; i < ns * 2; i++) for (let c = 0; c < 4; c++) {
        if (c === 3 && !ab) continue;
        let n = c === 3 ? ab : cb, v = E[i][c]; if (P.length) { v = (v << 1) | P[i]; n++; }
        E[i][c] = ((v << (8 - n)) | (v >> (2 * n - 8))) & 255;
      }
      const sub = i => ns === 1 ? 0 : ns === 2 ? (BC7P2[part] >> i) & 1 : (BC7P3[part] >>> (2 * i)) & 3;
      const anchor = s => s === 0 ? 0 : ns === 2 ? parseInt(BC7A2[part], 16) : parseInt(BC7A3[part * 2 + s - 1], 16);
      for (let i = 0; i < 16; i++) I1[i] = bits(i === anchor(sub(i)) ? ib - 1 : ib);
      if (ib2) for (let i = 0; i < 16; i++) I2[i] = bits(i === 0 ? ib2 - 1 : ib2);
      for (let i = 0; i < 16; i++) {
        const x = bx * 4 + (i & 3), y = by * 4 + (i >> 2); if (x >= w || y >= h) continue;
        const s = sub(i), e0 = E[s * 2], e1 = E[s * 2 + 1];
        const [ci, wc, ai, wa] = !ib2 ? [I1[i], BC7W[ib], I1[i], BC7W[ib]] : sel ? [I2[i], BC7W[ib2], I1[i], BC7W[ib]] : [I1[i], BC7W[ib], I2[i], BC7W[ib2]];
        for (let c = 0; c < 4; c++) { const k = c === 3 ? wa[ai] : wc[ci]; px[c] = ((64 - k) * e0[c] + k * e1[c] + 32) >> 6; }
        if (rot) { const t = px[3]; px[3] = px[rot - 1]; px[rot - 1] = t; }
        const o = (y * w + x) * 4; out[o] = px[0]; out[o + 1] = px[1]; out[o + 2] = px[2]; out[o + 3] = px[3];
      }
    }
    return out;
  }
  /* the mip level that fits, still compressed (a copy: it can be kept on its own); res reads the texture's data when it lives outside */
  function texture(res, t, maxSize) {
    const fmt = t.m_TextureFormat, bpp = { 1: 1, 3: 3, 4: 4, 5: 4, 14: 4 }[fmt], block = { 10: 8, 12: 16, 25: 16 }[fmt];
    if (!bpp && !block) return null;
    let data = t['image data'];
    if ((!data || !data.length) && t.m_StreamData && t.m_StreamData.size) { data = res(t.m_StreamData); if (!data) return null; }
    let w = t.m_Width, h = t.m_Height, off = 0;
    const levelSize = (w, h) => block ? Math.max(1, (w + 3) >> 2) * Math.max(1, (h + 3) >> 2) * block : w * h * bpp;
    for (let mip = 0; mip < (t.m_MipCount || 1) - 1 && Math.max(w, h) > maxSize; mip++) { off += levelSize(w, h); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
    const src = data.slice(off, off + levelSize(w, h));
    if (src.length < levelSize(w, h)) return null;
    return { w, h, fmt, src, name: t.m_Name };
  }
  /* decoded to RGBA the first time a material needs it */
  function pixels(img) {
    if (img.rgba) return img;
    const { w, h, fmt, src } = img, block = fmt === 10 || fmt === 12 || fmt === 25;
    let rgba;
    if (fmt === 25) rgba = bc7(src, w, h);
    else if (block) rgba = dxt(src, w, h, fmt === 12);
    else {
      rgba = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        if (fmt === 4) { rgba[i * 4] = src[i * 4]; rgba[i * 4 + 1] = src[i * 4 + 1]; rgba[i * 4 + 2] = src[i * 4 + 2]; rgba[i * 4 + 3] = src[i * 4 + 3]; }
        else if (fmt === 5) { rgba[i * 4] = src[i * 4 + 1]; rgba[i * 4 + 1] = src[i * 4 + 2]; rgba[i * 4 + 2] = src[i * 4 + 3]; rgba[i * 4 + 3] = src[i * 4]; }
        else if (fmt === 14) { rgba[i * 4] = src[i * 4 + 2]; rgba[i * 4 + 1] = src[i * 4 + 1]; rgba[i * 4 + 2] = src[i * 4]; rgba[i * 4 + 3] = src[i * 4 + 3]; }
        else if (fmt === 3) { rgba[i * 4] = src[i * 3]; rgba[i * 4 + 1] = src[i * 3 + 1]; rgba[i * 4 + 2] = src[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
        else { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = src[i]; }
      }
    }
    Object.defineProperty(img, 'rgba', { value: rgba, configurable: true });   /* not kept when the model is stored */
    return img;
  }

  /* ---------- animations: Unity's muscle clips (streamed, dense and constant curves) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(s) { let c = 0xFFFFFFFF; for (const x of new TextEncoder().encode(s)) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  /* a streamed clip is a list of frames; each frame holds, per curve, the cubic that runs from that time on */
  function streamedKeys(words, count) {
    const dv = new DataView(new Uint32Array(words).buffer), keys = Array.from({ length: count }, () => []); let p = 0;
    while (p + 8 <= dv.byteLength) {
      const t = dv.getFloat32(p, true), n = dv.getInt32(p + 4, true); p += 8;
      for (let k = 0; k < n && p + 20 <= dv.byteLength; k++, p += 20) { const i = dv.getInt32(p, true); if (keys[i]) keys[i].push({ t, c: [dv.getFloat32(p + 4, true), dv.getFloat32(p + 8, true), dv.getFloat32(p + 12, true), dv.getFloat32(p + 16, true)] }); }
    }
    return keys;
  }
  function clipData(a) {
    if (!a || !a.m_MuscleClip) return null;
    const mc = a.m_MuscleClip, cd = mc.m_Clip.data || mc.m_Clip, sc = cd.m_StreamedClip, dc = cd.m_DenseClip, cc = cd.m_ConstantClip;
    const C = { sN: sc.curveCount, dN: dc.m_CurveCount, frames: dc.m_FrameCount, rate: dc.m_SampleRate || 60, begin: dc.m_BeginTime || 0, dense: dc.m_SampleArray || [], constant: cc.data || [], streamed: streamedKeys(sc.data || [], sc.curveCount) };
    const binds = []; let idx = 0;
    for (const b of a.m_ClipBindingConstant.genericBindings) {
      if (b.isPPtrCurve) continue;
      binds.push({ path: b.path >>> 0, attr: b.attribute >>> 0, type: b.typeID, idx });
      idx += b.typeID === 4 ? (b.attribute === 2 ? 4 : b.attribute <= 4 ? 3 : 1) : 1;
    }
    return { name: a.m_Name, start: mc.m_StartTime || 0, dur: Math.max(.05, (mc.m_StopTime || 0) - (mc.m_StartTime || 0)), C, binds };
  }
  function curveAt(C, i, t) {
    if (i < C.sN) {
      const ks = C.streamed[i]; let k = ks[0]; for (const q of ks) { if (q.t <= t) k = q; else break; } if (!k) return 0;
      const c = k.c; if (!(k.t > -1e30)) return c[3]; const d = t - k.t; return ((c[0] * d + c[1]) * d + c[2]) * d + c[3];
    }
    i -= C.sN;
    if (i < C.dN) { const f = Math.min(Math.max((t - C.begin) * C.rate, 0), C.frames - 1), f0 = Math.floor(f), f1 = Math.min(C.frames - 1, f0 + 1), u = f - f0; return C.dense[f0 * C.dN + i] * (1 - u) + C.dense[f1 * C.dN + i] * u; }
    return C.constant[i - C.dN] ?? 0;
  }
  const ISACTIVE = crc32('m_IsActive'), DEG = Math.PI / 180, _eu = new THREE.Euler();
  /* the clips find their objects by the CRC of the path from the animated root */
  function makeAnim(A, top, byGo) {
    const hashes = new Map(), walk = (o, path) => { hashes.set(crc32(path), o); o.children.forEach(ch => { if (ch.userData.unity) walk(ch, path ? path + '/' + ch.name : ch.name); }); };
    walk(top, '');
    const clips = {};
    for (const k of ['open', 'close', 'insert', 'remove', 'on', 'off']) {
      if (!A[k]) continue;
      const c = Object.assign({}, A[k], { binds: A[k].binds.map(b => Object.assign({}, b, { node: hashes.get(b.path) || null })) });   /* the parsed clip stays plain data */
      if (c.binds.some(b => b.node)) clips[k] = c;
    }
    /* Unity's Euler angles turn Z, then X, then Y: three.js calls that order YXZ */
    function apply(c, t) {
      t = c.start + Math.min(Math.max(t, 0), c.dur);
      for (const b of c.binds) {
        const o = b.node; if (!o) continue; const v = k => curveAt(c.C, b.idx + k, t);
        if (b.type === 4) {
          if (b.attr === 1) o.position.set(v(0), v(1), v(2));
          else if (b.attr === 2) o.quaternion.set(v(0), v(1), v(2), v(3)).normalize();
          else if (b.attr === 3) o.scale.set(v(0), v(1), v(2));
          else if (b.attr === 4) o.quaternion.setFromEuler(_eu.set(v(0) * DEG, v(1) * DEG, v(2) * DEG, 'YXZ'));
        } else if (b.type === 1 && b.attr === ISACTIVE) o.visible = v(0) > .5;
      }
    }
    return { clips, apply, spindle: byGo.get(A.spindle) || null, axis: A.axis, needsMedia: A.needsMedia, hideClosed: A.hideClosed };
  }

  /* ---------- read everything a model needs ---------- */
  /* S is where the objects come from: a .ugc, or EmuVR's own data (see EMUVR). It gives the objects by id
     (only those of its own file: pointers to other files are left out), the ids of a class, the name of the
     script behind a MonoBehaviour and the bytes a texture keeps outside. */
  const pid = p => p && !p.m_FileID && p.m_PathID && p.m_PathID !== '0' ? p.m_PathID : null;
  function assemble(S, opts = {}) {
    const get = id => { try { return id ? S.get(id) : null; } catch (e) { return null; } };
    const tfs = new Map(S.ids(4).map(id => [id, get(id)]).filter(e => e[1]));
    const comps = new Map();
    for (const c of [33, 23, 108]) S.ids(c).forEach(id => { const d = get(id); if (!d) return; const go = d.m_GameObject.m_PathID; if (!comps.has(go)) comps.set(go, {}); comps.get(go)[c] = d; });
    /* the scripts EmuVR attaches: Socket marks where the medium goes, GameSystemState says which clip opens,
       closes, takes the medium in..., UGCInfo and GameSystem say what the model is */
    const mono = new Map();
    for (const id of S.ids(114)) { const d = get(id), k = d && S.script(id, d); if (!k) continue; if (!mono.has(k)) mono.set(k, []); mono.get(k).push(d); }
    const texCache = new Map(), maxSize = opts.maxTex || 1024;
    const tex = id => { if (!id) return null; if (!texCache.has(id)) { const t = get(id); let img = null; try { img = t ? texture(S.res, t, maxSize) : null; } catch (e) { console.warn('UGC texture', e); } texCache.set(id, img); } return texCache.get(id); };
    const matCache = new Map();
    const material = id => {
      if (matCache.has(id)) return matCache.get(id);
      const m = get(id); if (!m) return null;
      const sh = get(pid(m.m_Shader));
      const props = m.m_SavedProperties, texs = {}, fl = {}, col = {};
      props.m_TexEnvs.forEach(([k, v]) => { const t = pid(v.m_Texture); if (t) texs[k] = t; });
      props.m_Floats.forEach(([k, v]) => { fl[k] = v; }); props.m_Colors.forEach(([k, v]) => { col[k] = v; });
      const out = { name: m.m_Name, shader: (sh && sh.m_ParsedForm && sh.m_ParsedForm.m_Name) || '', keywords: m.m_ShaderKeywords || '', fl, col, tex: {} };
      for (const k of ['_MainTex', '_BumpMap', '_SpecGlossMap', '_MetallicGlossMap', '_EmissionMap']) if (texs[k]) out.tex[k] = tex(texs[k]);
      if (!out.tex._BumpMap && texs._NormalMap) out.tex._BumpMap = tex(texs._NormalMap);   /* EmuVR's own shaders call it so */
      matCache.set(id, out); return out;
    };
    const sockets = new Map((mono.get('Socket') || []).map(d => [d.m_GameObject.m_PathID, { female: !!d.isFemale, type: d.typeData || '', free: [d.freeRotationX, d.freeRotationY, d.freeRotationZ].map(Boolean) }]));
    const node = t => {
      const go = get(t.m_GameObject.m_PathID), cs = comps.get(t.m_GameObject.m_PathID) || {};
      const n = { name: go ? go.m_Name : '', go: t.m_GameObject.m_PathID, active: go ? go.m_IsActive !== false : true, p: t.m_LocalPosition, q: t.m_LocalRotation, s: t.m_LocalScale, kids: [] };
      const me = cs[33] && get(pid(cs[33].m_Mesh));
      if (me) { n.mesh = meshData(me, S.little); n.meshName = me.m_Name; n.mats = (cs[23] ? cs[23].m_Materials : []).map(p => pid(p) ? material(pid(p)) : null); n.visible = !cs[23] || !!cs[23].m_Enabled; }
      if (cs[108]) n.light = { color: cs[108].m_Color, intensity: cs[108].m_Intensity, range: cs[108].m_Range };
      if (sockets.has(n.go)) n.sock = sockets.get(n.go);
      n.kids = (t.m_Children || []).map(ch => tfs.get(pid(ch))).filter(Boolean).map(node);
      return n;
    };
    const top = opts.root ? [tfs.get(opts.root)].filter(Boolean) : [...tfs.values()].filter(t => !pid(t.m_Father));
    const roots = top.map(node), inside = new Set(); { const w = n => { inside.add(n.go); n.kids.forEach(w); }; roots.forEach(w); }
    const mine = k => (mono.get(k) || []).filter(d => inside.has(d.m_GameObject.m_PathID));
    let anim = null;
    const d = mine('GameSystemState')[0];
    if (d) {
      const clip = p => { const c = get(pid(p)); if (!c || c.__cls !== 74) return null; try { return clipData(c); } catch (e) { console.warn('UGC clip', e); return null; } };
      anim = { root: d.m_GameObject.m_PathID, open: clip(d.openAnimation), close: clip(d.closeAnimation), insert: clip(d.insertAnimation), remove: clip(d.removeAnimation), on: clip(d.onAnimation), off: clip(d.offAnimation),
        spindle: pid(d.discSpindle), axis: d.spindleAxis || null, needsMedia: !!d.needsMediaToClose, hideClosed: !!d.hideMediaWhileClosed };
    }
    const info = mine('UGCInfo')[0], sys = mine('GameSystem')[0];
    return { roots, anim, info: { name: info ? info.name : opts.name || '', type: info ? info.type : sys ? 'system' : '', system: sys ? sys.systemName : '' } };
  }
  function parse(buf, opts = {}) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), files = readBundle(u8);
    const cab = [...files.entries()].find(([k]) => !/\.(resS|resource)$/.test(k));
    if (!cab) throw new Error('El .ugc no contiene ningún objeto.');
    const sf = readSerialized(cab[1]), all = [...sf.objects.values()], scripts = new Map();
    const S = {
      little: sf.little, get: id => readObject(sf, id), ids: c => all.filter(o => o.type.cls === c).map(o => o.id),
      script(id, d) { const s = pid(d.m_Script); if (!s) return ''; if (!scripts.has(s)) { let n = ''; try { n = readObject(sf, s).m_ClassName; } catch (e) { } scripts.set(s, n); } return scripts.get(s); },
      res(sd) { const name = String(sd.path).split('/').pop(), r = files.get(name) || [...files.entries()].find(([k]) => k.endsWith('.resS'))?.[1]; return r ? r.subarray(Number(sd.offset), Number(sd.offset) + sd.size) : null; }
    };
    return assemble(S, opts);
  }

  /* ---------- three.js objects ---------- */
  function dataTex(img, srgb) {
    img = pixels(img);
    const t = new THREE.DataTexture(img.rgba, img.w, img.h, THREE.RGBAFormat); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = maxAniso; if (srgb) t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; return t;
  }
  function remap(img, fn) { img = pixels(img); const o = new Uint8Array(img.rgba.length), s = img.rgba; for (let i = 0; i < s.length; i += 4) fn(s, o, i); return { w: img.w, h: img.h, rgba: o }; }
  function makeMaterial(m, made) {
    if (!m) return new THREE.MeshStandardMaterial({ color: '#888888', roughness: .6 });
    if (made.has(m)) return made.get(m);
    const c = m.col._Color || { r: 1, g: 1, b: 1, a: 1 }, fl = m.fl, T = m.tex;
    const mat = new THREE.MeshStandardMaterial({ name: m.name, color: new THREE.Color(c.r, c.g, c.b), roughness: 1 - (fl._Glossiness ?? .5), metalness: fl._Metallic || 0 });
    mat.userData.envBase = 1; mat.envMapIntensity = ENV_K; allMats.push(mat);
    if (T._MainTex) mat.map = dataTex(T._MainTex, true);
    if (T._BumpMap) {
      /* Unity packs normal maps as DXT5nm (X in alpha, Y in green): rebuild an ordinary one */
      const s = pixels(T._BumpMap).rgba; let rs = 0; for (let i = 0; i < s.length; i += 400) rs += s[i]; const packed = rs / (s.length / 400) > 240;
      mat.normalMap = dataTex(remap(T._BumpMap, (s, o, i) => { const x = (packed ? s[i + 3] * s[i] / 255 : s[i]) / 127.5 - 1, y = s[i + 1] / 127.5 - 1, z = Math.sqrt(Math.max(0, 1 - x * x - y * y)); o[i] = (x + 1) * 127.5; o[i + 1] = (y + 1) * 127.5; o[i + 2] = (z + 1) * 127.5; o[i + 3] = 255; }));
      mat.normalScale.set(fl._BumpScale ?? 1, fl._BumpScale ?? 1);
    }
    if (/Autodesk/i.test(m.shader) && T._SpecGlossMap) {
      /* Autodesk Interactive keeps roughness in red; three.js reads it from green */
      mat.roughnessMap = dataTex(remap(T._SpecGlossMap, (s, o, i) => { o[i] = 0; o[i + 1] = s[i]; o[i + 2] = 0; o[i + 3] = 255; })); mat.roughness = 1;
    } else if (T._MetallicGlossMap || T._SpecGlossMap) {
      const g = T._MetallicGlossMap || T._SpecGlossMap, sc = fl._GlossMapScale ?? 1, metal = !!T._MetallicGlossMap;
      const t = dataTex(remap(g, (s, o, i) => { o[i] = 0; o[i + 1] = 255 - s[i + 3] * sc; o[i + 2] = metal ? s[i] : 0; o[i + 3] = 255; }));
      mat.roughnessMap = t; mat.roughness = 1; if (metal) { mat.metalnessMap = t; mat.metalness = 1; }
    }
    if (T._EmissionMap && /_EMISSION/.test(m.keywords)) { const e = m.col._EmissionColor || { r: 1, g: 1, b: 1 }; mat.emissiveMap = dataTex(T._EmissionMap, true); mat.emissive = new THREE.Color(Math.min(1, e.r), Math.min(1, e.g), Math.min(1, e.b)); }
    if ((fl._Mode || 0) >= 2) { mat.transparent = true; mat.opacity = c.a; mat.depthWrite = false; }
    made.set(m, mat); return mat;
  }
  function geometry(md) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(md.pos.arr, 3));
    if (md.nrm) g.setAttribute('normal', new THREE.BufferAttribute(md.nrm.arr, 3));
    if (md.uv) { const uv = md.uv.dim === 2 ? md.uv.arr : md.uv.arr.filter((_, i) => i % md.uv.dim < 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
    const all = [].concat(...md.subs), idx = md.n > 65535 ? new Uint32Array(all) : new Uint16Array(all); g.setIndex(new THREE.BufferAttribute(idx, 1));
    let start = 0; md.subs.forEach((s, i) => { g.addGroup(start, s.length, i); start += s.length; });
    if (!md.nrm) g.computeVertexNormals();
    return g;
  }
  /* the model in centimetres, facing the room (+Z), standing on y = 0; anchors in userData */
  function build(parsed) {
    const made = new Map(), anchors = {}, lids = [], meshes = [], byGo = new Map();
    /* the medium's place is the female Socket EmuVR attaches; older or hand-made models only name it */
    let scripted = false; { const w = n => { if (n.sock && n.sock.female) scripted = true; n.kids.forEach(w); }; parsed.roots.forEach(w); }
    const mk = n => {
      const o = new THREE.Group(); o.name = n.name; o.visible = n.active; o.userData.unity = true; byGo.set(n.go, o);
      o.position.set(n.p.x, n.p.y, n.p.z); o.quaternion.set(n.q.x, n.q.y, n.q.z, n.q.w); o.scale.set(n.s.x, n.s.y, n.s.z);
      if (n.mesh && n.mesh.pos) {
        const mats = n.mesh.subs.map((_, i) => makeMaterial(n.mats[i] || n.mats[0], made));
        const m = new THREE.Mesh(geometry(n.mesh), mats.length === 1 ? mats[0] : mats); m.name = n.meshName || n.name; m.castShadow = m.receiveShadow = true; m.visible = n.visible !== false;
        o.add(m); meshes.push(m); if (/lid|tapa/i.test(n.name)) lids.push(o);
        /* TVs and monitors: the game is shown on the child called screen_mesh (or whatever wears the kit's Screen material) */
        if (/screen_mesh/i.test(n.name) || (!anchors.screen && (n.mats || []).some(mt => mt && /^screen$/i.test(mt.name || '')))) anchors.screen = m;
      }
      if (scripted ? n.sock && n.sock.female && (!anchors.socket || /socket_media/i.test(n.name)) : /socket_media/i.test(n.name) || (!anchors.socket && /socket/i.test(n.name) && !/_av|cable|plug|controller/i.test(n.name) && !n.mesh)) { anchors.socket = o; anchors.sock = n.sock || null; }
      if (n.light) anchors.light = { obj: o, color: n.light.color };
      n.kids.forEach(k => o.add(mk(k)));
      return o;
    };
    const model = new THREE.Group(); parsed.roots.forEach(r => model.add(mk(r)));
    /* Unity is left-handed: mirror X so the front, which EmuVR models put at +Z, still faces the room */
    const root = new THREE.Group(); model.scale.set(-100, 100, 100); root.add(model);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3(); meshes.forEach(m => { if (m.visible) box.expandByObject(m); });
    if (!box.isEmpty()) { model.position.y -= box.min.y; model.position.x -= (box.min.x + box.max.x) / 2; model.position.z -= (box.min.z + box.max.z) / 2; }
    root.updateMatrixWorld(true); box.setFromObject(model);
    const anim = parsed.anim ? makeAnim(parsed.anim, byGo.get(parsed.anim.root) || model.children[0], byGo) : null;
    root.userData = { anchors, lids, meshes, info: parsed.info || {}, size: box.getSize(new V3()), materials: [...made.values()], anim: anim && Object.keys(anim.clips).length ? anim : null };
    return root;
  }
  function dispose(root) {
    if (!root) return;
    root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    (root.userData.materials || []).forEach(m => { ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(k => { if (m[k]) m[k].dispose(); }); unM(m); });
  }
  return { parse, assemble, build, dispose, readBundle, readSerialized, readObject, pid };
})();
