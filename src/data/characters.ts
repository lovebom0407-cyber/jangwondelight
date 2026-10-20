import { CharacterName } from '../types';

/**
 * 장원 별밤학교 캐릭터 레지스트리 (단일 관리 지점) — 마법사의 돌 등장인물 10종
 * (도비는 마법사의 돌에 나오지 않아 2026-10-09 이야기에서 제외. 이미지 파일은 남겨 둠)
 * - 모든 대화 화자(CharacterName)는 반드시 이 레지스트리의 항목과 연결됩니다.
 * - 이미지는 public/assets/characters/{id}.png 원본 PNG를 그대로 사용합니다.
 * - face.x / face.y 는 원본 이미지(1024×1536) 기준 얼굴 중심의 비율 좌표(0~1)로,
 *   모바일 대화 화면의 얼굴 확대 원형 프레임에만 사용합니다. 전신 표시는 object-fit: contain.
 */
export type CharacterId =
  | 'harry'
  | 'hermione'
  | 'ron'
  | 'draco'
  | 'voldemort'
  | 'dumbledore'
  | 'mcgonagall'
  | 'hagrid'
  | 'hedwig'
  | 'dobby'
  | 'snape';

export interface CharacterProfile {
  id: CharacterId;
  name: CharacterName;
  fullName: string;
  role: string;
  lessons: string;
  desc: string;
  accent: string;
  face: { x: number; y: number; zoom: number };
}

/** 힌트 도우미 (힌트를 봐도 보상 불이익 없음) */
export const HINT_HELPER: CharacterName = '헤드위그';

export const CHARACTERS: CharacterProfile[] = [
  {
    id: 'harry',
    name: '해리',
    fullName: '해리',
    role: '탐험 · 별 관찰',
    lessons: '01 천문 수업 · 07 협력 마법 실습',
    desc: '마법학교에 처음 온 씩씩한 친구예요. 별을 찾고, 가족 사진을 함께 찍어요.',
    accent: '#d9a441',
    face: { x: 0.43, y: 0.09, zoom: 4.6 }
  },
  {
    id: 'hermione',
    name: '헤르미온느',
    fullName: '헤르미온느',
    role: '책 · 행성 탐구',
    lessons: '02 행성 탐구 · 04 마법 도서관 수업',
    desc: '책을 아주 좋아하는 똑똑한 친구예요. “왜 그럴까?” 하고 같이 알아봐요.',
    accent: '#4d9be6',
    face: { x: 0.44, y: 0.14, zoom: 4.0 }
  },
  {
    id: 'ron',
    name: '론',
    fullName: '론',
    role: '함께하기 · AI 체험',
    lessons: '04 · 05 · 06 수업',
    desc: '재미있고 다정한 친구예요. 새로운 도구를 써 보는 걸 좋아해요.',
    accent: '#e0703a',
    face: { x: 0.47, y: 0.105, zoom: 4.6 }
  },
  {
    id: 'draco',
    name: '말포이',
    fullName: '말포이',
    role: '처음엔 혼자, 나중엔 함께',
    lessons: '03 어둠의 마법 방어술',
    desc: '처음엔 혼자 일등 하고 싶어 해요. 마지막엔 “같이 하자”고 말해요.',
    accent: '#4ebc8a',
    face: { x: 0.54, y: 0.07, zoom: 4.6 }
  },
  {
    id: 'voldemort',
    name: '볼드모트',
    fullName: '볼드모트',
    role: '마법사의 돌을 노리는 그림자',
    lessons: '처음 이야기 · 마지막 이야기',
    desc: '마법사의 돌을 가져가고 싶어 해요. 별빛이 모이면 멀리 사라져요. 화면 속 이야기일 뿐이에요.',
    accent: '#9b7ad8',
    face: { x: 0.48, y: 0.08, zoom: 4.4 }
  },
  {
    id: 'dumbledore',
    name: '덤블도어',
    fullName: '덤블도어',
    role: '마법학교 교장 선생님',
    lessons: '처음 이야기 · 01 천문 수업 · 마지막 이야기',
    desc: '마법사의 돌을 지키는 교장 선생님이에요. 별빛을 모아 달라고 부탁해요.',
    accent: '#e8d6a8',
    face: { x: 0.52, y: 0.125, zoom: 3.8 }
  },
  {
    id: 'mcgonagall',
    name: '맥고나걸',
    fullName: '맥고나걸',
    role: '입학 · 표현 수업 선생님',
    lessons: '입학 · 05 이야기 표현 수업 · 06 창의 마법 실습',
    desc: '입학을 도와주는 선생님이에요. 내 생각을 말하는 수업을 해요.',
    accent: '#3f9a6a',
    face: { x: 0.48, y: 0.135, zoom: 4.4 }
  },
  {
    id: 'hagrid',
    name: '해그리드',
    fullName: '해그리드',
    role: '길 안내 · 가족 사진',
    lessons: '처음 이야기 · 07 협력 마법 실습',
    desc: '덩치는 크지만 마음은 따뜻한 길잡이예요. “엄마 아빠 손 꼭 잡고 걷자!”',
    accent: '#b9824a',
    face: { x: 0.46, y: 0.085, zoom: 3.6 }
  },
  {
    id: 'hedwig',
    name: '헤드위그',
    fullName: '헤드위그',
    role: '입학 편지 · 힌트 쪽지',
    lessons: '처음 이야기 · 모든 수업의 힌트',
    desc: '하얀 올빼미예요. 입학 편지를 가져오고, 어려울 땐 힌트 쪽지를 물어다 줘요.',
    accent: '#f1ece0',
    face: { x: 0.6, y: 0.15, zoom: 2.4 }
  },
  {
    id: 'snape',
    name: '스네이프',
    fullName: '스네이프',
    role: '어둠의 마법 방어술 선생님',
    lessons: '03 어둠의 마법 방어술',
    desc: '조금 엄격한 선생님이에요. 서두르지 말고 바르게 생각하라고 알려 줘요.',
    accent: '#7d6aa8',
    face: { x: 0.52, y: 0.095, zoom: 4.4 }
  }
];

const BY_NAME = new Map<string, CharacterProfile>(CHARACTERS.map(c => [c.name, c]));
const BY_ID = new Map<string, CharacterProfile>(CHARACTERS.map(c => [c.id, c]));

export function getCharacterByName(name: string): CharacterProfile | undefined {
  return BY_NAME.get(name);
}

export function getCharacterById(id: string): CharacterProfile | undefined {
  return BY_ID.get(id);
}

/** Vite BASE_URL 기준 상대 경로 (배포 위치와 무관하게 동작) */
export function getCharacterImageSrc(id: CharacterId): string {
  let base = '/';
  try {
    base = (import.meta as any).env?.BASE_URL || '/';
  } catch {}
  return `${base}assets/characters/${id}.png`;
}
