import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENT_CONSTELLATIONS } from '../src/data/eventConstellations';
import { CONSTELLATION_SOURCE, HIP_CATALOG, CONSTELLATION_HIP_PATHS } from '../src/data/constellationReference';
import { constellationCenter, projectConstellation } from '../src/services/constellationProjection';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/astronomy/${name}`, import.meta.url), 'utf8');
const source = JSON.parse(fixture('modern-iau-selected.json'));
const parseHip = (text: string) => new Map(text.split('\n').flatMap(line => {
  const fields = line.split('\t').map(value => value.trim());
  return fields.length === 5 && /^\d+$/.test(fields[0])
    ? [[Number(fields[0]), { raDegrees: Number(fields[1]), dec: Number(fields[2]), mag: Number(fields[3]), hd: Number(fields[4]) }] as const]
    : [];
}));
const primary = parseHip(fixture('hipparcos-esa-1997.tsv'));
const mirror = parseHip(fixture('hipparcos-harvard-mirror.tsv'));
const bsc = new Map(fixture('bright-star-catalogue.tsv').split('\n').flatMap(line => {
  const fields = line.split('\t');
  return fields.length === 3 && /^\s*\d+\s*$/.test(fields[0])
    ? [[Number(fields[1]), { hr: Number(fields[0]), name: fields[2] }] as const] : [];
}));
let checks = 0;
function check(name: string, fn: () => void) { fn(); checks++; console.log(`PASS: ${name}`); }
const edge = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)].join(':');
const sorted = (values: Iterable<string | number>) => [...values].sort();
const close = (a: number, b: number, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

check('the ten complete figures match the pinned primary paths and all 109 unique HIP entries', () => {
  assert.equal(source.source, CONSTELLATION_SOURCE.figureSourceUrl);
  assert.match(CONSTELLATION_SOURCE.figureCommit, /^[a-f0-9]{40}$/);
  assert.equal(CONSTELLATION_SOURCE.figureLicense, 'CC BY-SA 4.0');
  assert.deepEqual(EVENT_CONSTELLATIONS.map(c => [c.iauCode, c.stars.length]), [
    ['Cyg', 10], ['Lyr', 6], ['Aql', 11], ['Peg', 13], ['And', 16],
    ['Aqr', 16], ['Psc', 15], ['PsA', 8], ['Cas', 5], ['Cep', 10],
  ]);
  const allHips = new Set<number>();
  for (const c of EVENT_CONSTELLATIONS) {
    const original = source.constellations.find((s: { id: string }) => s.id.endsWith(` ${c.iauCode}`));
    assert.ok(original, c.id);
    assert.deepEqual(CONSTELLATION_HIP_PATHS[c.iauCode], original.lines);
    const sourceHips = new Set<number>(original.lines.flat());
    assert.equal(new Set(c.stars.map(s => s.hip)).size, c.stars.length, c.id);
    assert.deepEqual(sorted(c.stars.map(s => s.hip)), sorted(sourceHips), c.id);
    c.stars.forEach(s => allHips.add(s.hip));
  }
  assert.equal(allHips.size, 109);
  assert.equal(Object.keys(HIP_CATALOG).length, 109);
  assert.equal(EVENT_CONSTELLATIONS.reduce((total, c) => total + c.stars.length, 0), 110);
});

check('every displayed coordinate and V magnitude matches ESA Hipparcos and its independent mirror', () => {
  assert.equal(primary.size, 109);
  assert.deepEqual(primary, mirror);
  assert.equal(CONSTELLATION_SOURCE.coordinateFrame, 'ICRS');
  assert.equal(CONSTELLATION_SOURCE.coordinateEpoch, 'J1991.25');
  for (const s of Object.values(HIP_CATALOG)) {
    const original = primary.get(s.hip)!;
    assert.ok(original, `missing HIP ${s.hip}`);
    close(s.ra * 15, original.raDegrees);
    close(s.dec, original.dec);
    close(s.mag, original.mag);
    assert.equal(s.hd, original.hd);
    assert.equal(s.hr, bsc.get(s.hd)!.hr);
  }
});

check('all star designations match Yale BSC, with correct Greek component numbers and constellation ownership', () => {
  const greek: Record<string, string> = { Alp:'α', Bet:'β', Gam:'γ', Del:'δ', Eps:'ε', Zet:'ζ', Eta:'η', The:'θ', Iot:'ι', Kap:'κ', Lam:'λ', Mu:'μ', Nu:'ν', Xi:'ξ', Omi:'ο', Pi:'π', Rho:'ρ', Sig:'σ', Tau:'τ', Ups:'υ', Phi:'φ', Chi:'χ', Psi:'ψ', Ome:'ω' };
  const superscript = (s: string) => [...s].map(n => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)]).join('');
  for (const s of Object.values(HIP_CATALOG)) {
    const raw = bsc.get(s.hd)!.name;
    const bayer = raw.slice(3, 6).trim();
    const number = raw.slice(0, 3).trim();
    const component = raw.slice(6, 7).trim();
    const constellation = raw.slice(7, 10);
    assert.equal(s.designation, `${bayer ? greek[bayer] + superscript(component) : number} ${constellation}`, `HIP ${s.hip}`);
    assert.ok(s.name.length > 0);
  }
  assert.equal(HIP_CATALOG[677].designation, 'α And', 'the shared Great Square corner belongs to Andromeda');
  assert.equal(HIP_CATALOG[102488].designation, 'ε Cyg');
  assert.match(HIP_CATALOG[102488].name, /알자나/);
  assert.doesNotMatch(HIP_CATALOG[102488].name, /기에나|Gienah/i);
  assert.equal(HIP_CATALOG[91919].designation, 'ε¹ Lyr');
  assert.equal(HIP_CATALOG[92791].designation, 'δ² Lyr');
  assert.equal(HIP_CATALOG[110960].designation, 'ζ¹ Aqr');
});

check('every complete graph has exactly the source edges without omitted branches or invented bridges', () => {
  for (const c of EVENT_CONSTELLATIONS) {
    const original = source.constellations.find((s: { id: string }) => s.id.endsWith(` ${c.iauCode}`));
    const wantedEdges = new Set<string>();
    for (const path of original.lines) for (let i = 1; i < path.length; i++) wantedEdges.add(edge(path[i - 1], path[i]));
    const actual = c.lines.map(([a, b]) => {
      assert.ok(a !== b && a >= 0 && b >= 0 && a < c.stars.length && b < c.stars.length, c.id);
      return edge(c.stars[a].hip, c.stars[b].hip);
    });
    assert.equal(new Set(actual).size, c.lines.length, `no duplicate undirected edges: ${c.id}`);
    assert.deepEqual(sorted(actual), sorted(wantedEdges), c.id);
    const reached = new Set([0]);
    for (let round = 0; round < c.stars.length; round++) {
      for (const [a, b] of c.lines) if (reached.has(a) || reached.has(b)) { reached.add(a); reached.add(b); }
    }
    assert.equal(reached.size, c.stars.length, `all stars participate: ${c.id}`);
    assert.equal(new Set(c.stars.map(s => s.id)).size, c.stars.length, `stable unique IDs: ${c.id}`);
  }
  const ids = new Set(EVENT_CONSTELLATIONS.flatMap(c => c.stars.map(s => s.id)));
  for (const id of ['deneb', 'vega', 'altair', 'alpheratz', 'fomalhaut', 'cas-alpha', 'aqr-beta', 'cep-gamma']) assert.ok(ids.has(id), id);
});

check('the gnomonic layout preserves one physical scale and places every source star inside the chart', () => {
  for (const c of EVENT_CONSTELLATIONS) {
    const expected = projectConstellation(c.stars);
    c.stars.forEach((s, i) => {
      assert.ok(Number.isFinite(s.puzzleX) && Number.isFinite(s.puzzleY), c.id);
      assert.ok(s.puzzleX >= 12 - 1e-10 && s.puzzleX <= 88 + 1e-10, c.id);
      assert.ok(s.puzzleY >= 12 - 1e-10 && s.puzzleY <= 88 + 1e-10, c.id);
      close(s.puzzleX, expected[i].puzzleX);
      close(s.puzzleY, expected[i].puzzleY);
    });
    const center = constellationCenter(c.stars);
    close(c.centerRa, center.ra);
    close(c.centerDec, center.dec);
  }
  const cross = projectConstellation([{ ra:23.9, dec:0 }, { ra:0.1, dec:0 }, { ra:0, dec:1.5 }, { ra:0, dec:-1.5 }]);
  assert.ok(cross[0].puzzleX > cross[1].puzzleX, 'east increases toward the left across RA zero');
  assert.ok(cross[2].puzzleY < cross[3].puzzleY, 'north is up');
  close(cross[0].puzzleX - cross[1].puzzleX, cross[3].puzzleY - cross[2].puzzleY);
  const polar = projectConstellation([{ ra:23.5, dec:85 }, { ra:.5, dec:85 }, { ra:0, dec:88 }]);
  assert.ok(polar.every(p => Number.isFinite(p.puzzleX) && Number.isFinite(p.puzzleY)));
  const origin = constellationCenter([{ ra:23.9, dec:0 }, { ra:.1, dec:0 }]);
  assert.ok(origin.ra < .01 || origin.ra > 23.99, 'RA-zero center does not average to 12h');
  assert.deepEqual(projectConstellation([{ ra:2, dec:3 }]), [{ puzzleX:50, puzzleY:50 }]);
  assert.throws(() => projectConstellation([]));
  assert.throws(() => projectConstellation([{ ra:0, dec:91 }]));
  assert.throws(() => projectConstellation([{ ra:0, dec:0 }, { ra:12, dec:0 }]));
  assert.throws(() => projectConstellation([{ ra:0, dec:0 }], 50));
});

console.log(`ALL ${checks} CONSTELLATION REFERENCE CHECKS PASSED`);
