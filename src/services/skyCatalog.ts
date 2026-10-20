/**
 * 행사에서 선택한 10개 별자리의 밝은 별 목록과 별자리 선.
 * 좌표는 ESA Hipparcos ICRS 적경(시)·적위(도), 기준 epoch J1991.25입니다.
 * 세차·고유운동·대기 굴절은 반영하지 않습니다. 행성과 달은 포함하지 않습니다.
 */
import { CONSTELLATIONS } from './celestialMath';

export interface CatalogStar {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mag: number;
  con: string; // 별자리 이름
}

export interface CatalogFigure {
  name: string;
  lines: [string, string][]; // star id pairs
}

function buildCatalog(): { stars: CatalogStar[]; figures: CatalogFigure[] } {
  const stars: CatalogStar[] = [];
  const figures: CatalogFigure[] = [];
  for (const c of CONSTELLATIONS) {
    for (const s of c.stars) {
      stars.push({ id: s.id, name: s.name, ra: s.ra, dec: s.dec, mag: s.mag, con: c.koreanName });
    }
    figures.push({
      name: c.koreanName,
      lines: c.lines.map(([a, b]) => [c.stars[a].id, c.stars[b].id] as [string, string])
    });
  }
  return { stars: [...new Map(stars.map(s => [s.id, s])).values()], figures };
}

export const SKY_CATALOG = buildCatalog();

/* -------------------------------------------------------------------------- */
/* 방향 수학 — 지평좌표(고도·방위) ↔ ENU 벡터, 기기 방향 → 카메라 기준 축      */
/* -------------------------------------------------------------------------- */

export type Vec3 = [number, number, number]; // [East, North, Up]
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function altAzToVec(altDeg: number, azDeg: number): Vec3 {
  const alt = altDeg * D2R;
  const az = azDeg * D2R;
  return [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)];
}

export function vecToAltAz(v: Vec3): { alt: number; az: number } {
  const [e, n, u] = v;
  const alt = Math.asin(Math.max(-1, Math.min(1, u))) * R2D;
  let az = Math.atan2(e, n) * R2D;
  if (az < 0) az += 360;
  return { alt, az };
}

export interface CameraBasis {
  forward: Vec3; // 카메라가 보는 방향
  right: Vec3; // 화면 오른쪽
  up: Vec3; // 화면 위쪽
}

/**
 * W3C DeviceOrientation (alpha: 북 기준 절대값, beta, gamma)을 카메라 축으로 변환합니다.
 * R = Rz(alpha)·Rx(beta)·Ry(gamma) 는 기기 좌표 → 지구(ENU) 좌표 회전입니다.
 * 후면 카메라는 기기 -Z 방향을 봅니다.
 */
export function basisFromDeviceOrientation(alphaDeg: number, betaDeg: number, gammaDeg: number): CameraBasis {
  const a = alphaDeg * D2R, b = betaDeg * D2R, g = gammaDeg * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  // Columns of R
  const col0: Vec3 = [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg]; // device X
  const col1: Vec3 = [-sa * cb, ca * cb, sb]; // device Y
  const col2: Vec3 = [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg]; // device Z
  return {
    forward: [-col2[0], -col2[1], -col2[2]],
    right: col0,
    up: col1
  };
}

/** 센서 없이 손가락으로 돌려 보는 수동 모드용 축 (기울기 없음) */
export function basisFromAltAz(altDeg: number, azDeg: number): CameraBasis {
  const forward = altAzToVec(altDeg, azDeg);
  const az = azDeg * D2R;
  const right: Vec3 = [Math.cos(az), -Math.sin(az), 0];
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0]
  ];
  return { forward, right, up };
}

/** 화면 회전(가로 모드 등)과 방위 보정(heading offset)을 적용합니다. */
export function adjustBasis(basis: CameraBasis, screenAngleDeg: number, headingOffsetDeg: number): CameraBasis {
  const rotZ = (v: Vec3): Vec3 => {
    // 위쪽(Up) 축을 기준으로 시계 방향(방위 증가) 회전
    const t = -headingOffsetDeg * D2R;
    const c = Math.cos(t), s = Math.sin(t);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  };
  let { forward, right, up } = basis;
  forward = rotZ(forward); right = rotZ(right); up = rotZ(up);
  if (screenAngleDeg) {
    const t = screenAngleDeg * D2R;
    const c = Math.cos(t), s = Math.sin(t);
    const r2: Vec3 = [right[0] * c - up[0] * s, right[1] * c - up[1] * s, right[2] * c - up[2] * s];
    const u2: Vec3 = [right[0] * s + up[0] * c, right[1] * s + up[1] * c, right[2] * s + up[2] * c];
    right = r2; up = u2;
  }
  return { forward, right, up };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * 원근(gnomonic) 투영. 화면 중심 기준 픽셀 좌표를 돌려주며, 카메라 뒤쪽이면 null.
 * focalPx = (화면 높이/2) / tan(세로 화각/2)
 */
export function projectToScreen(v: Vec3, basis: CameraBasis, focalPx: number): { x: number; y: number } | null {
  const depth = dot(v, basis.forward);
  if (depth <= 0.05) return null;
  return { x: (dot(v, basis.right) / depth) * focalPx, y: (-dot(v, basis.up) / depth) * focalPx };
}

export function angularDistanceDeg(a: Vec3, b: Vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * R2D;
}
