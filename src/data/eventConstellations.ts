import type { ConstellationDef } from '../services/celestialMath';
import { constellationCenter, projectConstellation } from '../services/constellationProjection';
import { CONSTELLATION_HIP_PATHS, HIP_CATALOG, type IauConstellationCode } from './constellationReference';

/** All vertices/edges of the selected IAU-published S&T figures, without schematic distortion.
 * “All” refers to each figure's stars, not every catalogued star within the IAU boundary.
 * Figure adaptations: CC BY-SA 4.0; credits and coordinate epoch in constellationReference.ts.
 */
type FigureMeta = Omit<ConstellationDef, 'stars' | 'lines' | 'centerRa' | 'centerDec' | 'iauCode'> & {
  iauCode: IauConstellationCode;
  hipOrder: number[];
};
const FIGURES: FigureMeta[] = [
  {
    "id": "cygnus",
    "koreanName": "백조자리",
    "englishName": "Cygnus",
    "region": "west",
    "seasonTag": "서쪽 · 여름철 대삼각형",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "서쪽에서 밝은 데네브를 찾고, 큰 십자가처럼 뻗은 북십자 모양을 따라가요. 실제 방향은 시각별 계산을 확인해요.",
    "mythology": "날개를 펼친 백조가 은하수를 따라 나는 모습으로 전해져요.",
    "significance": "데네브는 베가·알타이르와 여름철 대삼각형을 이뤄요. 북십자는 정식 별자리 이름이 아니라 백조자리의 별무리 모양이에요.",
    "iauCode": "Cyg",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/cyg.gif",
    "hipOrder": [
      102098,
      100453,
      95947,
      102488,
      97165,
      95853,
      94779,
      99848,
      103413,
      104732
    ]
  },
  {
    "id": "lyra",
    "koreanName": "거문고자리",
    "englishName": "Lyra",
    "region": "west",
    "seasonTag": "서쪽 · 여름철 대삼각형",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "밝은 베가를 먼저 찾아요. 그 곁의 작은 평행사변형을 찾으면 거문고 모양을 떠올릴 수 있어요.",
    "mythology": "아름다운 음악을 들려주던 오르페우스의 작은 하프로 전해져요.",
    "significance": "베가는 직녀성으로도 불리며 여름철 대삼각형의 꼭짓점 하나예요. 주변의 어두운 별은 불빛에 가려질 수 있어요.",
    "iauCode": "Lyr",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/lyr.gif",
    "hipOrder": [
      91262,
      91919,
      91971,
      92420,
      93194,
      92791
    ]
  },
  {
    "id": "aquila",
    "koreanName": "독수리자리",
    "englishName": "Aquila",
    "region": "west",
    "seasonTag": "서쪽 · 여름철 대삼각형",
    "isPrimaryTarget": false,
    "difficulty": "중급",
    "findingGuide": "알타이르와 양옆의 가까운 별을 찾아요. 베가·데네브까지 넓게 이어 보며 여름철 대삼각형을 완성해요.",
    "mythology": "날개를 편 독수리의 모습을 상상한 별자리예요.",
    "significance": "알타이르는 견우성으로도 불려요. 여름철 대삼각형은 세 별자리에 걸쳐 있는 길잡이 별무리예요.",
    "iauCode": "Aql",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/aql.gif",
    "hipOrder": [
      97649,
      97278,
      98036,
      95501,
      93747,
      99473,
      93805,
      97804,
      93244,
      93429,
      96468
    ]
  },
  {
    "id": "pegasus",
    "koreanName": "페가수스자리",
    "englishName": "Pegasus",
    "region": "autumn",
    "seasonTag": "머리 위~남쪽 · 가을 별자리",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "높은 하늘에서 큰 사각형을 찾아요. 사각형 한 모서리의 알페라츠에서 안드로메다자리로 이어져요.",
    "mythology": "날개 달린 말 페가수스의 몸을 큰 사각형으로 상상해요.",
    "significance": "페가수스 대사각형의 알페라츠는 정식으로 안드로메다자리에 속해요. 별무리 모양과 별자리의 영역은 다를 수 있어요.",
    "iauCode": "Peg",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/peg.gif",
    "hipOrder": [
      113963,
      113881,
      677,
      1067,
      107315,
      109410,
      112158,
      112748,
      112440,
      109176,
      107354,
      109427,
      112029
    ]
  },
  {
    "id": "andromeda",
    "koreanName": "안드로메다자리",
    "englishName": "Andromeda",
    "region": "autumn",
    "seasonTag": "머리 위~남쪽 · 가을 별자리",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "대사각형의 알페라츠에서 미라크와 알마크 쪽으로 별의 줄을 따라가요. 미라크 위쪽의 뮤 근처에서 M31을 찾아봐요.",
    "mythology": "카시오페이아와 케페우스의 딸 안드로메다의 이야기에서 이름을 얻었어요.",
    "significance": "안드로메다은하 M31은 별 하나가 아니라 수많은 별이 모인 은하예요. 달빛·조명에 따라 맨눈으로 찾기 어려워 쌍안경이나 망원경이 도움돼요.",
    "iauCode": "And",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/and.gif",
    "hipOrder": [
      677,
      3092,
      5447,
      9640,
      4436,
      113726,
      116631,
      116805,
      116584,
      2912,
      3881,
      5434,
      7607,
      3031,
      3693,
      4463
    ]
  },
  {
    "id": "aquarius",
    "koreanName": "물병자리",
    "englishName": "Aquarius",
    "region": "autumn",
    "seasonTag": "머리 위~남쪽 · 가을 별자리",
    "isPrimaryTarget": false,
    "difficulty": "중급",
    "findingGuide": "페가수스 대사각형 아래쪽에서 물병의 작은 Y 모양 별무리를 찾아요. 밝은 별이 적어 어두운 곳에서 천천히 살펴봐요.",
    "mythology": "하늘에서 물병의 물을 쏟는 사람의 모습으로 전해져요.",
    "significance": "눈에 잘 띄는 밝은 별이 많지 않아요. 지도에서 물병의 Y 모양을 연습한 뒤 전문가와 비교해 봐요.",
    "iauCode": "Aqr",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/aqr.gif",
    "hipOrder": [
      106278,
      109074,
      110395,
      110960,
      111497,
      110672,
      112961,
      113136,
      102618,
      109139,
      110003,
      114724,
      115033,
      115438,
      114341,
      112716
    ]
  },
  {
    "id": "pisces",
    "koreanName": "물고기자리",
    "englishName": "Pisces",
    "region": "autumn",
    "seasonTag": "머리 위~남쪽 · 가을 별자리",
    "isPrimaryTarget": false,
    "difficulty": "중급",
    "findingGuide": "페가수스 사각형 곁의 작은 고리 모양부터 찾아요. 길게 이어진 줄이 알레샤에서 만나 V처럼 갈라져요.",
    "mythology": "두 물고기가 끈으로 이어져 있는 모습으로 전해져요.",
    "significance": "전체 모습이 넓고 별이 어두워요. 작은 고리와 연결 줄을 나눠 찾으면 모양을 이해하기 쉬워요.",
    "iauCode": "Psc",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/psc.gif",
    "hipOrder": [
      114971,
      115738,
      116928,
      116771,
      118268,
      4906,
      9487,
      7097,
      5586,
      5742,
      6193,
      8198,
      7884,
      3786,
      115830
    ]
  },
  {
    "id": "piscis_austrinus",
    "koreanName": "남쪽물고기자리",
    "englishName": "Piscis Austrinus",
    "region": "autumn",
    "seasonTag": "머리 위~남쪽 · 가을 별자리",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "남쪽 낮은 하늘에서 홀로 밝게 빛나는 포말하우트를 먼저 찾아요. 주변 산과 건물 때문에 가려질 수 있어요.",
    "mythology": "물병자리 아래에서 물을 받아 마시는 물고기의 모습으로 전해져요.",
    "significance": "포말하우트는 가을 하늘의 밝은 길잡이예요. 도계에서는 높이 뜨지 않으므로 고도 계산과 현장의 산마루를 함께 확인해요.",
    "iauCode": "PsA",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/psa.gif",
    "hipOrder": [
      113368,
      113246,
      112948,
      111188,
      111954,
      109285,
      107380,
      107608
    ]
  },
  {
    "id": "cassiopeia",
    "region": "north",
    "koreanName": "카시오페이아자리",
    "englishName": "Cassiopeia",
    "seasonTag": "북쪽 · 길잡이 별자리",
    "isPrimaryTarget": true,
    "difficulty": "기초",
    "findingGuide": "북쪽 하늘에서 W 모양으로 이어진 다섯 별을 찾아요. 시간에 따라 기울기가 달라지므로 지도와 비교해요.",
    "mythology": "에티오피아의 허영심 많은 왕비 카시오페이아가 포세이돈의 벌을 받아 의자에 거꾸로 매달려 북극 주위를 돕니다.",
    "significance": "가을철 저녁 도계읍 하늘에서 산마루 위 높이 떠올라 북쪽 방향을 찾는 데 도움이 되는 별자리입니다.",
    "iauCode": "Cas",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/cas.gif",
    "hipOrder": [
      746,
      3179,
      4427,
      6686,
      8886
    ]
  },
  {
    "id": "cepheus",
    "region": "north",
    "koreanName": "케페우스자리",
    "englishName": "Cepheus",
    "seasonTag": "북쪽 · 길잡이 별자리",
    "isPrimaryTarget": false,
    "difficulty": "초급",
    "findingGuide": "카시오페이아 옆에서, 뾰족한 지붕을 가진 찌그러진 오각형 집 모양을 찾으면 케페우스자리입니다.",
    "mythology": "에티오피아의 국왕이자 카시오페이아의 남편, 안드로메다 공주의 아버지입니다.",
    "significance": "세페이드 변광성 연구에 이름을 남긴 별자리예요. 별이 밝아졌다 어두워지는 주기를 연구하는 데 중요해요.",
    "iauCode": "Cep",
    "chartUrl": "https://iauarchive.eso.org/static/public/constellations/gif/cep.gif",
    "hipOrder": [
      105199,
      106032,
      116727,
      112724,
      109492,
      102422,
      110991,
      109857,
      107259,
      101093
    ]
  }
];

export const EVENT_CONSTELLATIONS: ConstellationDef[] = FIGURES.map(({ hipOrder, ...meta }) => {
  const catalogStars = hipOrder.map(hip => HIP_CATALOG[hip]);
  const positions = projectConstellation(catalogStars);
  const center = constellationCenter(catalogStars);
  const indexByHip = new Map(hipOrder.map((hip, index) => [hip, index]));
  const edges = new Set<string>();
  const lines: [number, number][] = [];
  for (const path of CONSTELLATION_HIP_PATHS[meta.iauCode]) {
    for (let i = 1; i < path.length; i++) {
      const a = indexByHip.get(path[i - 1])!, b = indexByHip.get(path[i])!;
      const key = [Math.min(a, b), Math.max(a, b)].join(':');
      if (a !== b && !edges.has(key)) { edges.add(key); lines.push([a, b]); }
    }
  }
  return {
    ...meta,
    centerRa: center.ra,
    centerDec: center.dec,
    stars: catalogStars.map((star, index) => ({ ...star, ...positions[index] })),
    lines,
  };
});
