/** Equatorial tangent-plane chart: celestial north up, east left.
 * A single scale preserves the physical shape; RA is never stretched independently.
 */
export interface EquatorialPoint { ra: number; dec: number }

export function constellationCenter(points: readonly EquatorialPoint[]): EquatorialPoint {
  if (!points.length) throw new Error('A constellation needs at least one star.');
  const toRad = Math.PI / 180;
  let x = 0, y = 0, z = 0;
  for (const point of points) {
    if (!Number.isFinite(point.ra) || !Number.isFinite(point.dec) || Math.abs(point.dec) > 90) {
      throw new Error('Invalid equatorial coordinates.');
    }
    const a = point.ra * 15 * toRad, d = point.dec * toRad;
    x += Math.cos(d) * Math.cos(a);
    y += Math.cos(d) * Math.sin(a);
    z += Math.sin(d);
  }
  const length = Math.hypot(x, y, z);
  if (length < 1e-10) throw new Error('Stars do not have a unique chart center.');
  return {
    ra: ((Math.atan2(y, x) / toRad / 15) + 24) % 24,
    dec: Math.asin(Math.max(-1, Math.min(1, z / length))) / toRad,
  };
}

export function projectConstellation(
  points: readonly EquatorialPoint[],
  padding = 12,
): { puzzleX: number; puzzleY: number }[] {
  if (!Number.isFinite(padding) || padding < 0 || padding >= 50) throw new Error('Invalid chart padding.');
  const center = constellationCenter(points), toRad = Math.PI / 180;
  const d0 = center.dec * toRad;
  const projected = points.map(point => {
    const da = (point.ra - center.ra) * 15 * toRad;
    const d = point.dec * toRad;
    const denominator = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(da);
    if (denominator <= 1e-8) throw new Error('Star is outside this tangent-plane chart.');
    return {
      x: -Math.cos(d) * Math.sin(da) / denominator,
      y: -(Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(da)) / denominator,
    };
  });
  const xs = projected.map(point => point.x), ys = projected.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  const scale = span > 0 ? (100 - padding * 2) / span : 1;
  return projected.map(point => ({
    puzzleX: 50 + (point.x - (minX + maxX) / 2) * scale,
    puzzleY: 50 + (point.y - (minY + maxY) / 2) * scale,
  }));
}
