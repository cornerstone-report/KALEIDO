import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node tools/inspect-pe.mjs <portable-executable>');
const b = fs.readFileSync(source);
const u16 = (o) => b.readUInt16LE(o);
const u32 = (o) => b.readUInt32LE(o);
const i32 = (o) => b.readInt32LE(o);
const cstr = (o) => { let e = o; while (e < b.length && b[e]) e++; return b.toString('ascii', o, e); };

if (b.toString('ascii', 0, 2) !== 'MZ') throw new Error('Not an MZ executable');
const pe = u32(0x3c);
if (b.toString('ascii', pe, pe + 4) !== 'PE\0\0') throw new Error('No PE header');
const coff = pe + 4;
const sectionCount = u16(coff + 2);
const timestamp = u32(coff + 4);
const optionalSize = u16(coff + 16);
const opt = coff + 20;
const magic = u16(opt);
const is64 = magic === 0x20b;
const imageBase = is64 ? Number(b.readBigUInt64LE(opt + 24)) : u32(opt + 28);
const entryRva = u32(opt + 16);
const resourceDir = opt + (is64 ? 112 : 96) + 8 * 2;
const resourceRva = u32(resourceDir);
const resourceSize = u32(resourceDir + 4);
const importDir = opt + (is64 ? 112 : 96) + 8;
const importRva = u32(importDir);
const sections = [];
let s = opt + optionalSize;
for (let n = 0; n < sectionCount; n++, s += 40) {
  sections.push({ name: cstr(s), virtualSize: u32(s + 8), virtualAddress: u32(s + 12), rawSize: u32(s + 16), rawOffset: u32(s + 20), characteristics: `0x${u32(s + 36).toString(16)}` });
}
const rvaToOffset = (rva) => {
  for (const x of sections) if (rva >= x.virtualAddress && rva < x.virtualAddress + Math.max(x.virtualSize, x.rawSize)) return x.rawOffset + rva - x.virtualAddress;
  return rva < (sections[0]?.rawOffset ?? 0) ? rva : null;
};
const imports = [];
const importFunctions = {};
if (importRva) {
  for (let o = rvaToOffset(importRva); o !== null && u32(o) !== 0; o += 20) {
    const library = cstr(rvaToOffset(u32(o + 12)));
    imports.push(library);
    const functions = [];
    const thunkRva = u32(o) || u32(o + 16);
    for (let t = rvaToOffset(thunkRva), n = 0; t !== null; t += is64 ? 8 : 4, n++) {
      const value = is64 ? Number(b.readBigUInt64LE(t)) : u32(t);
      if (!value) break;
      functions.push(value & (is64 ? 0x8000000000000000 : 0x80000000) ? `#${value & 0xffff}` : cstr(rvaToOffset(value) + 2));
    }
    importFunctions[library] = functions;
  }
}
const typeNames = new Map([[1,'CURSOR'],[2,'BITMAP'],[3,'ICON'],[4,'MENU'],[5,'DIALOG'],[6,'STRING'],[7,'FONTDIR'],[8,'FONT'],[9,'ACCELERATOR'],[10,'RCDATA'],[11,'MESSAGETABLE'],[12,'GROUP_CURSOR'],[14,'GROUP_ICON'],[16,'VERSION'],[17,'DLGINCLUDE'],[19,'PLUGPLAY'],[20,'VXD'],[21,'ANICURSOR'],[22,'ANIICON'],[23,'HTML'],[24,'MANIFEST']]);
const readResourceName = (v) => {
  if (!(v & 0x80000000)) return v;
  const o = resourceBase + (v & 0x7fffffff);
  const len = u16(o);
  return b.toString('utf16le', o + 2, o + 2 + len * 2);
};
const resources = [];
let resourceBase = resourceRva ? rvaToOffset(resourceRva) : null;
if (resourceBase !== null) {
  const walk = (offset, trail = []) => {
    const named = u16(offset + 12), ids = u16(offset + 14);
    for (let n = 0; n < named + ids; n++) {
      const entry = offset + 16 + n * 8;
      const key = readResourceName(u32(entry));
      const target = u32(entry + 4);
      const next = [...trail, key];
      if (target & 0x80000000) walk(resourceBase + (target & 0x7fffffff), next);
      else {
        const data = resourceBase + target;
        const rva = u32(data), size = u32(data + 4), codePage = u32(data + 8);
        resources.push({ type: typeNames.get(next[0]) ?? String(next[0]), typeId: next[0], name: next[1] ?? null, language: next[2] ?? null, rva: `0x${rva.toString(16)}`, fileOffset: rvaToOffset(rva), size, codePage });
      }
    }
  };
  walk(resourceBase);
}
const readWideField = (o) => {
  const first = u16(o);
  if (first === 0) return { value: null, next: o + 2 };
  if (first === 0xffff) return { value: `#${u16(o + 2)}`, next: o + 4 };
  let e = o; while (u16(e) !== 0) e += 2;
  return { value: b.toString('utf16le', o, e), next: e + 2 };
};
const align4 = (o) => (o + 3) & ~3;
const stringTable = (r) => {
  let o = r.fileOffset, id = (Number(r.name) - 1) * 16;
  const values = [];
  for (let n = 0; n < 16; n++, id++) {
    const len = u16(o); o += 2;
    if (len) values.push({ id, text: b.toString('utf16le', o, o + len * 2) });
    o += len * 2;
  }
  return values;
};
const dialog = (r) => {
  let o = r.fileOffset, isExtended = u16(o) === 1 && u16(o + 2) === 0xffff;
  let style, count, title;
  if (isExtended) {
    style = u32(o + 12); count = u16(o + 16); o += 26;
  } else {
    style = u32(o); count = u16(o + 8); o += 18;
  }
  o = readWideField(o).next; o = readWideField(o).next;
  ({ value: title, next: o } = readWideField(o));
  if (style & 0x40) {
    o += isExtended ? 6 : 2;
    o = readWideField(o).next;
  }
  const controls = [];
  for (let n = 0; n < count; n++) {
    o = align4(o);
    let id, x, y, cx, cy, controlStyle;
    if (isExtended) {
      controlStyle = u32(o + 8); x = i32(o + 12) & 0xffff; y = i32(o + 14) & 0xffff; cx = i32(o + 16) & 0xffff; cy = i32(o + 18) & 0xffff; id = u32(o + 20); o += 24;
    } else {
      controlStyle = u32(o); x = i32(o + 8) & 0xffff; y = i32(o + 10) & 0xffff; cx = i32(o + 12) & 0xffff; cy = i32(o + 14) & 0xffff; id = u16(o + 16); o += 18;
    }
    const cls = readWideField(o); o = cls.next;
    const text = readWideField(o); o = text.next;
    const extra = u16(o); o += 2 + extra;
    controls.push({ id, class: cls.value, text: text.value, x, y, cx, cy, style: `0x${controlStyle.toString(16)}` });
  }
  return { id: r.name, title, extended: isExtended, controls };
};
const stringTables = resources.filter((r) => r.typeId === 6).flatMap(stringTable);
const dialogs = resources.filter((r) => r.typeId === 5).map(dialog);
const manifests = resources.filter((r) => r.typeId === 24).map((r) => b.toString('utf8', r.fileOffset, r.fileOffset + r.size));
const ascii = new Set();
for (let i = 0; i < b.length;) {
  let j = i; while (j < b.length && b[j] >= 0x20 && b[j] <= 0x7e) j++;
  if (j - i >= 4) {
    const value = b.toString('ascii', i, j);
    if (value.length <= 300 && /[A-Za-z]{3}/.test(value)) ascii.add(value);
  }
  i = j === i ? i + 1 : j;
}
const utf16le = new Set();
for (let i = 0; i + 7 < b.length; i++) {
  let j = i;
  while (j + 1 < b.length && b[j] >= 0x20 && b[j] <= 0x7e && b[j + 1] === 0) j += 2;
  if (j - i >= 8) {
    const value = b.toString('utf16le', i, j);
    if (value.length <= 300 && /[A-Za-z]{3}/.test(value)) utf16le.add(value);
  }
}
const output = { source: path.basename(source), bytes: b.length, pe: { architecture: is64 ? 'PE32+' : 'PE32', machine: `0x${u16(coff).toString(16)}`, timestamp: new Date(timestamp * 1000).toISOString(), imageBase: `0x${imageBase.toString(16)}`, entryRva: `0x${entryRva.toString(16)}`, sections, imports, importFunctions, resourceDirectory: resourceRva ? { rva: `0x${resourceRva.toString(16)}`, size: resourceSize, fileOffset: resourceBase } : null }, resources, stringTables, dialogs, manifests, strings: { ascii: [...ascii].sort(), utf16le: [...utf16le].sort() } };
console.log(JSON.stringify(output, null, 2));
