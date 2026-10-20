/**
 * Astronomical Calculation Service for Dogye Starlight Night School
 * Real Local Sidereal Time, Hour Angle, Altitude, and Azimuth calculations
 * for Gangwon Samcheok Dogye-eup (37.228° N, 129.057° E).
 */

export interface ObserverLocation {
  name: string;
  latitude: number; // degrees North
  longitude: number; // degrees East
  elevationMeters: number;
}

export const DOGYE_LOCATION: ObserverLocation = {
  name: '강원도 삼척시 도계읍 일대 (장원초 기준 근사 좌표)',
  latitude: 37.2281, // 37° 13' 41" N
  longitude: 129.0572, // 129° 03' 26" E
  elevationMeters: 230
};

export const DEFAULT_OBSERVATION_TIME_STR = '2026-10-21T20:00:00+09:00';

export interface StarPoint {
  hip: number;
  designation: string;
  id: string;
  name: string;
  ra: number; // Right Ascension in hours (0..24)
  dec: number; // Declination in degrees (-90..+90)
  mag: number; // Apparent magnitude (smaller = brighter)
  // Normalized 2D puzzle coords within constellation bounding box (0..100)
  puzzleX: number;
  puzzleY: number;
}

export interface ConstellationDef {
  iauCode: import('../data/constellationReference').IauConstellationCode;
  chartUrl: string;
  id: 'cygnus' | 'lyra' | 'aquila' | 'pegasus' | 'andromeda' | 'aquarius' | 'pisces' | 'piscis_austrinus' | 'cassiopeia' | 'cepheus';
  region: 'west' | 'autumn' | 'north';
  koreanName: string;
  englishName: string;
  seasonTag: string;
  isPrimaryTarget: boolean; // Cassiopeia is the festival primary target!
  difficulty: '기초' | '초급' | '중급';
  centerRa: number; // hours
  centerDec: number; // degrees
  stars: StarPoint[];
  lines: [number, number][]; // pairs of indices into stars array
  findingGuide: string;
  mythology: string;
  significance: string;
}

export { EVENT_CONSTELLATIONS as CONSTELLATIONS } from '../data/eventConstellations';

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in hours (0..24).
 */
export function calculateGMST(date: Date): number {
  // Julian Date
  const timeMs = date.getTime();
  const jd = timeMs / 86400000.0 + 2440587.5;
  const d = jd - 2451545.0; // days since J2000.0 (2000 Jan 1.5)

  // GMST approximation formula (Astronomical Almanac)
  let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  if (gmst < 0) gmst += 24;
  return gmst;
}

/**
 * Calculates Local Sidereal Time (LST) in hours (0..24) for given longitude in degrees.
 */
export function calculateLST(date: Date, longitudeDeg: number = DOGYE_LOCATION.longitude): number {
  const gmst = calculateGMST(date);
  let lst = (gmst + longitudeDeg / 15.0) % 24;
  if (lst < 0) lst += 24;
  return lst;
}

/**
 * Converts Equatorial Coordinates (RA, Dec) to Horizontal Coordinates (Altitude, Azimuth).
 * raHours: 0..24
 * decDeg: -90..+90
 * lstHours: 0..24
 * latDeg: -90..+90
 *
 * Returns:
 * altitude: -90..+90 degrees (- means below horizon)
 * azimuth: 0..360 degrees measured from true North clockwise (North=0, East=90, South=180, West=270)
 */
export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  lstHours: number,
  latDeg: number
): { altitude: number; azimuth: number } {
  const degToRad = Math.PI / 180.0;
  const radToDeg = 180.0 / Math.PI;

  // Hour Angle in degrees (-180..+180)
  let haDeg = (lstHours - raHours) * 15.0;
  while (haDeg > 180) haDeg -= 360;
  while (haDeg < -180) haDeg += 360;

  const haRad = haDeg * degToRad;
  const decRad = decDeg * degToRad;
  const latRad = latDeg * degToRad;

  // Sin(alt) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(ha)
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = altRad * radToDeg;

  // Azimuth calculation
  // cos(alt)*cos(az) = cos(lat)*sin(dec) - sin(lat)*cos(dec)*cos(ha)
  // cos(alt)*sin(az) = -cos(dec)*sin(ha)
  const cosAlt = Math.cos(altRad);
  let azDeg = 0;

  if (Math.abs(cosAlt) > 1e-6) {
    const y = -Math.cos(decRad) * Math.sin(haRad);
    const x = Math.cos(latRad) * Math.sin(decRad) - Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad);
    azDeg = Math.atan2(y, x) * radToDeg;
    if (azDeg < 0) azDeg += 360;
  }

  return {
    altitude: Math.round(altDeg * 10) / 10,
    azimuth: Math.round(azDeg * 10) / 10
  };
}

export type VisibilityRating = '고도 높음 (관측 유리)' | '고도 중간' | '지평선 근처 (가려질 수 있음)' | '지평선 아래';

/** 지형 차폐 고도: 실측 자료가 없는 가정값입니다. */
export const ASSUMED_TERRAIN_MASK_DEG = 15;
export const TERRAIN_MASK_IS_ASSUMPTION = true;

export interface ConstellationObservationStatus {
  altitude: number;
  azimuth: number;
  compassDirection: string; // e.g. "북동 (NE)", "북 (N)"
  rating: VisibilityRating;
  isObscuredByMountains: boolean;
  advice: string;
}

export function getCompassDirection(azimuth: number): string {
  if (azimuth >= 337.5 || azimuth < 22.5) return '북 (N)';
  if (azimuth >= 22.5 && azimuth < 67.5) return '북동 (NE)';
  if (azimuth >= 67.5 && azimuth < 112.5) return '동 (E)';
  if (azimuth >= 112.5 && azimuth < 157.5) return '남동 (SE)';
  if (azimuth >= 157.5 && azimuth < 202.5) return '남 (S)';
  if (azimuth >= 202.5 && azimuth < 247.5) return '남서 (SW)';
  if (azimuth >= 247.5 && azimuth < 292.5) return '서 (W)';
  return '북서 (NW)';
}

export function calculateObservationStatus(
  constellation: ConstellationDef,
  date: Date,
  location: ObserverLocation = DOGYE_LOCATION
): ConstellationObservationStatus {
  const lst = calculateLST(date, location.longitude);
  const { altitude, azimuth } = equatorialToHorizontal(
    constellation.centerRa,
    constellation.centerDec,
    lst,
    location.latitude
  );

  const direction = getCompassDirection(azimuth);
  let rating: VisibilityRating = '지평선 아래';
  let isObscuredByMountains = false;
  let advice = '';

  if (altitude < 0) {
    rating = '지평선 아래';
    advice = '현재 시각에는 지평선 아래에 있어 관측할 수 없습니다.';
  } else if (altitude < 18) {
    rating = '지평선 근처 (가려질 수 있음)';
    isObscuredByMountains = true;
    advice = `계산 고도 ${altitude}°로 낮아 주변 산이나 건물에 가려질 수 있습니다. (지형 차폐 약 ${ASSUMED_TERRAIN_MASK_DEG}°는 실측 자료가 없는 가정값)`;
  } else if (altitude < 35) {
    rating = '고도 중간';
    advice = `계산 고도 ${altitude}°입니다. 운동장 가운데처럼 트인 곳에서 찾아보세요. 실제로 보이는지는 날씨·조명에 따라 달라집니다.`;
  } else {
    rating = '고도 높음 (관측 유리)';
    advice = `계산 고도 ${altitude}°로 높아 지형에 가릴 가능성은 낮습니다. 다만 구름·불빛 등 하늘 상태에 따라 보이지 않을 수 있습니다.`;
  }

  return {
    altitude,
    azimuth,
    compassDirection: direction,
    rating,
    isObscuredByMountains,
    advice
  };
}


/**
 * 북극성(작은곰자리 α) 단일 별 좌표.
 * 작은곰자리 "중심 좌표"(centerRa/centerDec)와 혼동하지 않도록 별도로 계산합니다.
 */
export const POLARIS = { name: '북극성 (작은곰자리 α)', ra: 2.53, dec: 89.26 };

export function calculateStarPosition(
  ra: number,
  dec: number,
  date: Date,
  location: ObserverLocation = DOGYE_LOCATION
): { altitude: number; azimuth: number; compassDirection: string } {
  const lst = calculateLST(date, location.longitude);
  const { altitude, azimuth } = equatorialToHorizontal(ra, dec, lst, location.latitude);
  return { altitude, azimuth, compassDirection: getCompassDirection(azimuth) };
}
