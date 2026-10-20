import { PHOTO_MISSIONS } from './photoMissions';
import { SHOWCASE_PADLET_ACTIVITY } from './showcaseActivity';
import { getMissionOrder, withStandardFieldMission } from './standardMissions';
import type { ExperienceMode } from '../services/experience';
import { House, Mission, ParticipantState, GradeQuizItem, ScriptStep } from '../types';

export const STORY_TITLE = '장원 별밤학교';

export const HOUSES: House[] = [
  {
    id: 0,
    name: '용기의 별',
    color: '#e05345',
    animal: '사자',
    symbol: '♌',
    trait: '용기 · 도전 · 열정',
    motto: '두려움을 넘어 새로운 배움에 도전하는 불꽃'
  },
  {
    id: 1,
    name: '지혜의 별',
    color: '#4d9be6',
    animal: '독수리',
    symbol: '♒',
    trait: '지혜 · 탐구 · 호기심',
    motto: '깊은 밤하늘과 지식의 진실을 찾는 맑은 눈'
  },
  {
    id: 2,
    name: '리더십의 별',
    color: '#4ebc8a',
    animal: '뱀',
    symbol: '♧',
    trait: '리더십 · 결단 · 책임',
    motto: '친구의 목소리를 듣고 함께 길을 여는 별빛'
  },
  {
    id: 3,
    name: '성실의 별',
    color: '#e5b84c',
    animal: '오소리',
    symbol: '♡',
    trait: '성실 · 끈기 · 협력',
    motto: '작은 약속을 지키며 끝까지 함께 빛나는 별'
  }
];

const INITIAL_STATION_PLACES = PHOTO_MISSIONS.map(m => m.place);

const PLACES_STORAGE_KEY = 'jangwon-starlight-station-places-v1';

export function getStationPlaces(): string[] {
  try {
    const raw = localStorage.getItem(PLACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed.map((p, i) => {
          const val = String(p || INITIAL_STATION_PLACES[i]);
          const oldDefaults = [
            '교실 체험 공간 · 부스의 ZEP QUIZ QR 안내판', '운동장 · 가족 기념사진 공간',
            '의상대여 장소 · 운영본부', '마법학교 포토존 · 소품 안내 장소',
            '네컷사진 부스', 'AI 체험존', '행사장 · 가족이 함께 체험하는 곳'
          ];
          if (val === oldDefaults[i]) return INITIAL_STATION_PLACES[i];
          if (i === 0 && val === 'AI 성과공유 부스 · ZEP QUIZ') return INITIAL_STATION_PLACES[i];
          if (i === 5 && (val.includes('업사이클') || val.includes('리폼'))) {
            return INITIAL_STATION_PLACES[5];
          }
          return val;
        });
      }
    }
  } catch {}
  return [...INITIAL_STATION_PLACES];
}

export function saveStationPlaces(places: string[]) {
  const clean = Array.from({ length: 7 }, (_, i) => String(places[i] ?? INITIAL_STATION_PLACES[i]).trim());
  localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(clean));
}

export function getMissions(mode: ExperienceMode = 'standard'): Mission[] {
  const places = getStationPlaces();

  const missions = [
    {
      id: 0,
      title: '별자리 관찰·복원',
      lessonName: '천문 수업',
      starlight: '관찰의 별빛',
      photoTip: '별자리를 잇는 모습을 찍어요.',
      place: places[0],
      icon: '✧',
      speaker: '해리',
      speakers: ['해리', '덤블도어'],
      story: '밤하늘에 W 모양 별자리가 있어요. 이름은 카시오페이아자리예요. 화면에서 별 다섯 개를 이어 보고, 진짜 하늘에서도 찾아봐요. 구름이 많으면 안 보일 수도 있어요.',
      boothGuide: '별 다섯 개를 이어 보고, 별자리 활동하는 모습을 사진으로 찍어요.',
      question: '별 다섯 개가 W 모양을 만드는 별자리는?',
      options: ['카시오페이아자리', '오리온자리', '전갈자리'],
      answer: 0,
      unlockedClueTitle: '관찰 기록: W 모양 다섯 별',
      unlockedClueDesc: '천천히, 자세히 보면 숨은 별이 보여요.',
      hint: '알파벳 W를 떠올려 봐요!',
      alternativeActivity: '별자리 카드의 별 다섯 개를 손가락으로 하나씩 콕콕 짚어 봐요.',
      introLines: [
        ["해리", "{nameA}! 첫 번째 별빛 조각은 천문탑 꼭대기에 있대."],
        ["해리", "그런데 호그와트 계단은 마음대로 움직여!"],
        ["덤블도어", "(덜컹! 계단이 빙그르르 돌기 시작해요.)"],
        {
          kind: 'choice',
          speaker: "해리",
          text: "{nameA}, 어느 계단으로 갈까?",
          options: [
            { label: "별이 그려진 계단", replies: [["덤블도어", "좋은 눈이구나. 별 계단은 하늘로 이어진단다."]] },
            { label: "불이 켜진 계단", replies: [["해리", "밝아서 안 무서워! 천천히 올라가자."]] }
          ]
        },
        ["해리", "휴, 드디어 천문탑 꼭대기야!"],
        ["덤블도어", "어서 오렴, {nameA}. 별빛 조각이 하늘 어딘가에 숨었단다."],
        ["덤블도어", "별 다섯 개가 W 모양으로 길을 알려 줄 거야."],
        {
          kind: 'choice',
          speaker: "덤블도어",
          text: "W 별자리를 찾으면 무엇이라고 부를까?",
          options: [
            { label: "카시오페이아자리!", replies: [["덤블도어", "정답이란다. 아주 오래된 별자리지."]] },
            { label: "반짝반짝 W 별!", replies: [["해리", "하하, 그 이름도 좋다! 진짜 이름은 카시오페이아래."]] }
          ]
        },
        ["해리", "가족과 체험하고, 별자리 사진을 찍으면 조각이 돌아와!"]
      ],
      rewardLines: [
        ["해리", "와! 첫 번째 별빛 조각이 손에 쏙 들어왔어!"],
        ["덤블도어", "{nameA}, 서두르지 않고 잘 보았구나."],
        {
          kind: 'choice',
          speaker: "해리",
          text: "조각을 어디에 넣어 둘까?",
          options: [
            { label: "주머니에 꼭!", replies: [["해리", "좋아, 잃어버리지 않게 꼭 넣자."]] },
            { label: "별빛지도에 바로!", replies: [["덤블도어", "보렴, 지도에 별 하나가 켜졌구나."]] }
          ]
        }
      ]
    },
    {
      id: 1,
      title: '행성 탐험',
      lessonName: '천문 수업 · 행성 탐구',
      starlight: '탐구의 별빛',
      photoTip: '행성 모형을 보는 모습을 찍어요.',
      place: places[1],
      icon: '◉',
      speaker: '헤르미온느',
      speakers: ['헤르미온느'],
      story: '해님 둘레를 빙글빙글 도는 친구들을 행성이라고 해요. 행성 모형을 보고, 고리가 있는 행성을 찾아봐요.',
      boothGuide: '행성 모형을 살펴보고 특징을 찾아요. 탐구하는 모습을 사진으로 찍어요.',
      question: '커다란 고리를 두른 행성은?',
      options: ['수성', '토성', '화성'],
      answer: 1,
      unlockedClueTitle: '탐구 기록: 고리를 두른 토성',
      unlockedClueDesc: '잘 보고 “왜냐하면” 하고 말하면 탐구가 돼요.',
      hint: '훌라후프를 두른 것 같은 행성을 찾아봐요!',
      alternativeActivity: '고리가 있는 행성 모형을 가족과 함께 손가락으로 가리켜 봐요.',
      introLines: [
        ["헤르미온느", "{nameA}, 여기는 날개 달린 열쇠의 방이야!"],
        ["헤르미온느", "(파닥파닥! 열쇠 수백 개가 새처럼 날아다녀요.)"],
        ["헤르미온느", "별빛 조각이 든 상자는 딱 한 열쇠로만 열려."],
        ["헤르미온느", "책에서 읽었어. 그 열쇠에는 고리가 달려 있대."],
        {
          kind: 'choice',
          speaker: "헤르미온느",
          text: "어떤 열쇠를 잡을까?",
          options: [
            { label: "고리가 달린 열쇠", replies: [["헤르미온느", "맞아! 토성처럼 고리를 두른 열쇠야."]] },
            { label: "제일 반짝이는 열쇠", replies: [["헤르미온느", "반짝이지만 고리가 없네. 다시 보자! 저기 고리 열쇠다!"]] }
          ]
        },
        ["헤르미온느", "토성은 해님 둘레를 도는 행성이야. 커다란 고리가 있지."],
        {
          kind: 'choice',
          speaker: "헤르미온느",
          text: "열쇠를 어떻게 잡을까?",
          options: [
            { label: "빗자루를 타고!", replies: [["헤르미온느", "좋아! 천천히, 살살 다가가자."]] },
            { label: "헤르미온느랑 같이!", replies: [["헤르미온느", "둘이 하면 더 쉬워. 하나, 둘, 셋!"]] }
          ]
        },
        ["헤르미온느", "가족과 체험하고, 행성 사진을 찍으면 상자가 열려!"]
      ],
      rewardLines: [
        ["헤르미온느", "찰칵! 상자가 열렸어. 두 번째 조각이야!"],
        ["헤르미온느", "{nameA}, 고리를 보고 찾았구나. 그게 바로 탐구야!"],
        {
          kind: 'choice',
          speaker: "헤르미온느",
          text: "남은 열쇠들은 어떻게 할까?",
          options: [
            { label: "다시 날려 주자", replies: [["헤르미온느", "(열쇠들이 고맙다는 듯 빙글빙글 날아가요.)"]] },
            { label: "하나만 기념으로!", replies: [["헤르미온느", "하하, 마음속에 기념으로 간직하자."]] }
          ]
        }
      ]
    },
    {
      id: 2,
      title: '안전 약속 탐험',
      lessonName: '어둠의 마법 방어술',
      starlight: '추리의 별빛',
      photoTip: '안전 약속을 실천하는 모습을 찍어요.',
      place: places[2],
      icon: '☾',
      speaker: '스네이프',
      speakers: ['스네이프', '말포이'],
      story: '이 수업에서는 안전하게 지내는 법을 배워요. 들은 말이 맞는지 확인하는 것도 배워요. 무서운 마법은 없어요.',
      boothGuide: '안전 안내를 살펴보고, 활동하는 모습을 사진으로 찍어요.',
      question: '친구가 “저기 부스 문 닫았대!” 하고 말했어요. 어떻게 할까요?',
      options: ['선생님께 물어봐요', '다른 친구에게 바로 전해요', '혼자 뛰어가 봐요'],
      answer: 0,
      unlockedClueTitle: '추리 기록: 확인하고 말해요',
      unlockedClueDesc: '들은 말은 선생님께 물어보고 확인해요.',
      hint: '어두운 운동장에서는 뛰지 않아요. 모르는 건 누구에게 물어볼까요?',
      alternativeActivity: '안내판에서 오늘 하는 활동 하나를 찾아 가족에게 읽어 줘요.',
      introLines: [
        ["스네이프", "…{name}, 이 문 뒤에 세 번째 조각이 있다."],
        ["스네이프", "문은 머리가 셋 달린 커다란 강아지, 플러피가 지킨다."],
        ["말포이", "(으르릉… 컹컹컹!) 으악, 머리가 세 개야!"],
        ["말포이", "내가 들었는데, 고기를 주면 비켜 준대!"],
        {
          kind: 'choice',
          speaker: "스네이프",
          text: "{nameA}, 그 말을 믿겠나?",
          options: [
            { label: "맞는지 먼저 확인해요", replies: [["스네이프", "그렇다. 들은 말은 확인부터 해야 한다."]] },
            { label: "고기를 던져 봐요", replies: [["스네이프", "(플러피가 고기만 먹고 그대로 있어요.) …소문은 틀렸군."]] }
          ]
        },
        ["스네이프", "해그리드에게 물어보니, 플러피는 노래를 들으면 잠든다더군."],
        {
          kind: 'choice',
          speaker: "말포이",
          text: "{nameA}, 어떤 노래를 불러 줄까?",
          options: [
            { label: "자장자장 자장가", replies: [["말포이", "(플러피가 하품을 하며 스르르 잠들어요.)"]] },
            { label: "반짝반짝 작은 별", replies: [["말포이", "(플러피가 꼬리를 흔들다 쿨쿨 잠들어요.)"]] }
          ]
        },
        ["스네이프", "쉿. 뛰지 말고 살금살금 지나가도록."],
        ["스네이프", "가족과 체험하고, 활동하는 모습을 찍어 오면 문이 열린다."]
      ],
      rewardLines: [
        ["스네이프", "…세 번째 조각이다. 잘 확인하고 움직였군, {name}."],
        ["말포이", "너 덕분에 플러피가 잠들었어. 고마워."],
        {
          kind: 'choice',
          speaker: "말포이",
          text: "다음 문도…",
          options: [
            { label: "같이 가자!", replies: [["말포이", "…좋아. 같이 가자."]] },
            { label: "천천히 확인하며 가자", replies: [["스네이프", "그게 바로 나를 지키는 마법이다."]] }
          ]
        }
      ]
    },
    {
      id: 3,
      title: '도서 탐색',
      lessonName: '마법 도서관 수업',
      starlight: '지식의 별빛',
      photoTip: '책을 보는 모습을 찍어요.',
      place: places[3],
      icon: '▤',
      speaker: '헤르미온느',
      speakers: ['헤르미온느', '론'],
      story: '마법 도서관에 왔어요. 우주나 로봇, AI 이야기가 담긴 책을 한 권 골라 봐요.',
      boothGuide: '책을 한 권 골라 보고, 재미있었던 내용을 한 줄로 적어요. 책 보는 모습을 사진으로 찍어요.',
      activity: '우주나 AI 이야기 책을 골라 읽었어요.',
      notePrompt: '책 제목과 재미있었던 내용 한 줄 (가족이 대신 적어도 돼요)',
      unlockedClueTitle: '지식 기록: 책에서 찾은 이야기',
      unlockedClueDesc: '궁금하면 책에서 찾아보면 돼요.',
      hint: '책 표지에 별, 행성, 로봇 그림이 있는지 찾아봐요!',
      alternativeActivity: '마음에 드는 책 표지를 가족에게 보여 주고 그림을 소개해요.',
      introLines: [
        ["론", "{nameA}! 헤르미온느가 도서관으로 오래."],
        ["헤르미온느", "마법사의 돌이 무엇인지 책에서 찾아야 해."],
        ["론", "책이 너무 많아… 배고프다. 개구리 초콜릿 먹을래?"],
        {
          kind: 'choice',
          speaker: "론",
          text: "초콜릿 상자에 카드가 들어 있어! 볼래?",
          options: [
            { label: "카드를 본다", replies: [["론", "덤블도어 카드야! 뒤에 \"니콜라스 플라멜\"이래."]] },
            { label: "초콜릿을 먹는다", replies: [["론", "(폴짝! 초콜릿 개구리가 도망쳐요.) 앗, 카드만 남았다!"]] }
          ]
        },
        ["헤르미온느", "니콜라스 플라멜! 그 이름을 책에서 찾아보자."],
        {
          kind: 'choice',
          speaker: "헤르미온느",
          text: "어느 책장부터 볼까?",
          options: [
            { label: "커다란 옛날 책", replies: [["헤르미온느", "찾았다! 마법사의 돌을 만든 할아버지 마법사래."]] },
            { label: "그림이 많은 책", replies: [["론", "그림 속에 빨간 돌이 있어! 이게 마법사의 돌이야."]] }
          ]
        },
        ["헤르미온느", "궁금하면 책에서 찾으면 돼. 그게 진짜 마법이야."],
        ["헤르미온느", "가족과 체험하고, 책 보는 모습을 찍으면 조각이 나와!"]
      ],
      rewardLines: [
        ["헤르미온느", "책갈피 사이에서 네 번째 조각이 나왔어!"],
        ["론", "{nameA}, 너 덕분에 비밀을 알아냈어!"],
        {
          kind: 'choice',
          speaker: "론",
          text: "남은 초콜릿 카드는?",
          options: [
            { label: "모아서 보관할래", replies: [["론", "좋아! 나도 카드 모으는 거 좋아해."]] },
            { label: "론한테 줄래", replies: [["론", "진짜? 고마워! 너 최고야!"]] }
          ]
        }
      ]
    },
    {
      id: 4,
      title: 'AI 그림책·성과 전시',
      lessonName: '이야기 표현 수업',
      starlight: '표현의 별빛',
      photoTip: '작품을 보는 모습을 찍어요.',
      place: places[4],
      icon: '✎',
      speaker: '맥고나걸',
      speakers: ['맥고나걸', '론'],
      story: '형, 누나들이 만든 그림책과 작품이 있어요. 마음에 드는 그림을 찾고, 왜 좋은지 말해 봐요.',
      boothGuide: '작품을 보고 마음에 드는 그림을 말해요. 감상하는 모습을 사진으로 찍어요.',
      activity: '작품을 보고 마음에 드는 그림을 가족과 이야기했어요.',
      notePrompt: '마음에 든 그림과 그 까닭 (가족이 대신 적어도 돼요)',
      unlockedClueTitle: '표현 기록: 내 마음을 말해요',
      unlockedClueDesc: '“나는 이게 좋아요. 왜냐하면…” 하고 말하면 표현이 돼요.',
      hint: '“나는 ○○가 좋아요. 왜냐하면 ○○ 때문이에요.” 하고 말해 봐요.',
      alternativeActivity: '마음에 드는 그림 앞에서 그림 속 모습을 몸으로 따라 해 봐요.',
      introLines: [
        ["맥고나걸", "{name}, 이 방에는 거대한 마법 체스판이 있어요."],
        ["론", "우와, 말들이 우리보다 커! 이겨야 지나갈 수 있대."],
        ["맥고나걸", "체스는 내 생각을 말로 분명하게 알려 줘야 이길 수 있어요."],
        {
          kind: 'choice',
          speaker: "론",
          text: "{nameA}, 너는 어떤 말이 될래?",
          options: [
            { label: "말을 탄 기사", replies: [["론", "멋지다! 기사는 깡충깡충 뛰어서 움직여."]] },
            { label: "튼튼한 성", replies: [["론", "좋아! 성은 쭉쭉 곧게 움직여."]] }
          ]
        },
        ["론", "내가 작전을 말할게. 너도 생각을 말해 줘!"],
        {
          kind: 'choice',
          speaker: "론",
          text: "다음엔 어떻게 할까?",
          options: [
            { label: "친구를 지켜 주자", replies: [["맥고나걸", "훌륭해요. 서로 지켜 주면 더 강해져요."]] },
            { label: "앞으로 나가 보자", replies: [["론", "용감하다! 좋아, 같이 가자!"]] }
          ]
        },
        ["맥고나걸", "\"나는 이렇게 생각해요. 왜냐하면…\" 하고 말해 보세요."],
        ["론", "가족과 체험하고, 작품 보는 모습을 찍으면 체스 끝!"]
      ],
      rewardLines: [
        ["론", "체크메이트! 우리가 이겼어! 다섯 번째 조각이야!"],
        ["맥고나걸", "생각을 또박또박 말했군요. 훌륭해요, {name}."],
        {
          kind: 'choice',
          speaker: "맥고나걸",
          text: "이긴 기분을 한마디로 말해 볼까요?",
          options: [
            { label: "최고예요!", replies: [["론", "나도 최고야! 우리 팀 최고!"]] },
            { label: "같이 해서 좋아요!", replies: [["맥고나걸", "함께라서 이길 수 있었지요."]] }
          ]
        }
      ]
    },
    {
      id: 5,
      title: 'AI 체험부스',
      lessonName: '창의 마법 실습',
      starlight: '창의의 별빛',
      photoTip: 'AI 체험하는 모습을 찍어요.',
      place: places[5],
      icon: '✦',
      speaker: '론',
      speakers: ['론', '맥고나걸'],
      story: '가족과 함께 AI 체험을 해요. 어떤 체험인지는 현장 선생님이 알려 줘요. 해 보고 떠오른 생각을 말해요. (AI 활용 체험 콘텐츠는 현장 안내를 따릅니다)',
      boothGuide: '가족과 AI 체험을 하고, 체험 모습을 사진으로 찍어요. 떠오른 생각을 한 줄 적어요.',
      activity: '가족과 AI 체험을 하고 떠오른 생각을 나눴어요.',
      notePrompt: '해 본 체험과 떠오른 생각 (가족이 대신 적어도 돼요)',
      unlockedClueTitle: '창의 기록: 새로운 생각',
      unlockedClueDesc: '“이렇게 하면 어떨까?” 하고 생각하면 창의가 돼요.',
      hint: '“이걸로 무엇을 만들면 좋을까?” 하고 가족에게 물어봐요.',
      alternativeActivity: '다른 가족의 체험을 함께 보고, 재미있는 생각 하나를 말해요.',
      introLines: [
        ["맥고나걸", "{name}, 오늘은 변신술 수업이에요."],
        ["맥고나걸", "작은 물건을 다른 것으로 바꾸는 마법이지요."],
        ["론", "나는 저번에 성냥을 바늘로 바꾸려다… 연기만 났어. 헤헤."],
        {
          kind: 'choice',
          speaker: "맥고나걸",
          text: "{nameA}, 이 성냥을 무엇으로 바꿔 볼까요?",
          options: [
            { label: "반짝이는 별", replies: [["맥고나걸", "(성냥이 작은 별로 반짝 변해요.) 멋진 생각이에요!"]] },
            { label: "귀여운 강아지", replies: [["론", "(성냥이 꼬리를 흔들어요.) 우와, 살아 움직여!"]] }
          ]
        },
        ["맥고나걸", "오늘의 마법 도구는 AI예요. 새로운 생각을 돕지요."],
        {
          kind: 'choice',
          speaker: "론",
          text: "AI한테 무슨 마법을 부탁할래?",
          options: [
            { label: "그림 그려 줘!", replies: [["론", "좋아! 나는 용 그림 부탁할래!"]] },
            { label: "이야기 만들어 줘!", replies: [["맥고나걸", "어떤 이야기가 나올지 궁금하군요."]] }
          ]
        },
        ["맥고나걸", "어떻게 하는지는 현장 선생님이 알려 주실 거예요."],
        ["론", "가족과 체험하고, 체험하는 모습을 찍으면 조각이 변신해!"]
      ],
      rewardLines: [
        ["론", "(펑!) 성냥이 여섯 번째 별빛 조각으로 변했어!"],
        ["맥고나걸", "{nameA}, 새로운 생각이 마법을 만들었어요."],
        {
          kind: 'choice',
          speaker: "론",
          text: "다음엔 무엇으로 바꿔 보고 싶어?",
          options: [
            { label: "무지개!", replies: [["론", "무지개라니, 나도 해 볼래!"]] },
            { label: "맛있는 케이크!", replies: [["론", "케이크! 그건 꼭 성공하고 싶다!"]] }
          ]
        }
      ]
    },
    {
      id: 6,
      title: '의상·가족 포토존',
      lessonName: '협력 마법 실습',
      starlight: '협력의 별빛',
      photoTip: '가족과 함께 찍어요.',
      place: places[6],
      icon: '▣',
      speaker: '해그리드',
      speakers: ['해그리드', '해리'],
      story: '마법 옷을 입고 가족과 사진을 찍어요. 오늘 가족과 함께해서 좋았던 일을 한 줄로 남겨요. (포토존 모습은 현장에 따라 달라질 수 있어요)',
      boothGuide: '가족과 함께 사진을 찍고, 오늘 좋았던 일을 한 줄로 적어요.',
      activity: '가족과 함께 포토존에서 사진을 찍었어요.',
      notePrompt: '오늘 가족과 함께해서 좋았던 일 (가족이 대신 적어도 돼요)',
      unlockedClueTitle: '협력 기록: 우리 가족 사진',
      unlockedClueDesc: '함께하면 더 즐거워요.',
      hint: '가족과 손을 잡거나 어깨동무를 해 봐요!',
      alternativeActivity: '옷 입기가 어려우면 가족과 손잡은 사진도 좋아요.',
      introLines: [
        ["해그리드", "어이, {nameA}! 쉿, 비밀 하나 알려 줄까?"],
        ["해그리드", "내 오두막에서 용 알이 깨어났단다!"],
        ["해리", "(꼬물꼬물) 우와, 아기 용이야! 너무 작다!"],
        {
          kind: 'choice',
          speaker: "해그리드",
          text: "{nameA}, 아기 용 이름을 지어 줄래?",
          options: [
            { label: "노버트!", replies: [["해그리드", "노버트! 딱 맞는 이름이구나."]] },
            { label: "별빛이!", replies: [["해그리드", "별빛이라… 정말 예쁜 이름이야!"]] }
          ]
        },
        ["해리", "그런데 아기 용은 금방 커져서 넓은 곳에 살아야 한대."],
        ["해그리드", "용 친구들이 사는 곳으로 보내 줘야 해. 혼자서는 못 해."],
        {
          kind: 'choice',
          speaker: "해리",
          text: "어떻게 옮길까?",
          options: [
            { label: "가족이 다 같이 들자", replies: [["해그리드", "허허, 다 같이 들면 하나도 안 무겁지!"]] },
            { label: "살금살금 조용히", replies: [["해리", "좋아, 아기 용이 깨지 않게 조용히!"]] }
          ]
        },
        ["해리", "떠나기 전에 다 같이 기념사진을 찍자!"],
        ["해그리드", "가족과 체험하고, 가족 사진을 찍어 오렴!"]
      ],
      rewardLines: [
        ["해그리드", "(아기 용이 일곱 번째 조각을 툭 떨어뜨려요.)"],
        ["해그리드", "허허, 고맙다는 인사구나! 모두 웃는 얼굴이 참 좋다."],
        {
          kind: 'choice',
          speaker: "해리",
          text: "{nameA}, 아기 용한테 인사하자!",
          options: [
            { label: "잘 가, 또 만나!", replies: [["해리", "(아기 용이 날개를 파닥이며 손을 흔들어요.)"]] },
            { label: "건강하게 자라!", replies: [["해그리드", "꼭 그럴 거란다. 네 덕분이야."]] }
          ]
        }
      ]
    }
  ].map((mission, index) => ({
    ...mission,
    ...(mode === 'junior' && index === 0 ? {
      lessonName: SHOWCASE_PADLET_ACTIVITY.title,
      story: PHOTO_MISSIONS[0].description,
      usesZepQuiz: false,
      externalActivity: SHOWCASE_PADLET_ACTIVITY,
    } : {}),
    title: PHOTO_MISSIONS[index].title,
    photoTip: PHOTO_MISSIONS[index].tip,
    unlockedClueTitle: `${mission.starlight} · ${PHOTO_MISSIONS[index].title} 인증`,
    unlockedClueDesc: PHOTO_MISSIONS[index].tip,
    boothGuide: PHOTO_MISSIONS[index].description,
    photoDescription: PHOTO_MISSIONS[index].description,
    photoFrameGuide: PHOTO_MISSIONS[index].frameGuide,
    place: places[index],
    hint: PHOTO_MISSIONS[index].frameGuide,
    introLines: mission.introLines.map((line: any, i: number) => i === mission.introLines.length - 1 && Array.isArray(line) ? [line[0], index === 0 ? '패들렛에 별밤학교에 남기는 한마디를 쓰고, 인증샷을 올려 줘!' : '현장에서 가족과 체험하고, 사진을 남겨 줘!'] : line)
  } as Mission));
  return mode === 'junior' ? missions : missions.map(withStandardFieldMission);
}

export function getOrderedMissions(mode: ExperienceMode = 'standard'): Mission[] {
  const missions = getMissions(mode);
  return getMissionOrder(mode).map(id => missions[id]);
}

export const INTRO_DIALOGUE: ScriptStep[] = [
    ["헤드위그", "(부엉! 하얀 올빼미 헤드위그가 창문으로 날아 들어와요.)"],
    ["헤드위그", "(헤드위그가 {name}에게 편지 한 통을 내밀어요.)"],
    {
      kind: 'choice',
      speaker: "해그리드",
      text: "{nameA}, 편지가 왔구나! 어떻게 할래?",
      options: [
        { label: "편지를 열어 본다", replies: [["해그리드", "그래, 열어 보렴! 장원 별밤학교 입학 편지란다!"]] },
        { label: "헤드위그를 쓰다듬는다", replies: [["헤드위그", "(헤드위그가 기분 좋게 눈을 깜빡여요.)"], ["해그리드", "헤드위그가 너를 좋아하는구나! 이건 입학 편지란다."]] }
      ]
    },
    ["해그리드", "기차를 타고 마법학교로 가자! 9와 4분의 3 승강장이야."],
    {
      kind: 'choice',
      speaker: "해리",
      text: "{nameA}, 벽을 지나가야 승강장이 나와. 어떻게 할래?",
      options: [
        { label: "눈을 꼭 감고 달린다", replies: [["해리", "(슈욱!) 와, 정말 통과했어!"]] },
        { label: "해리 손을 잡고 간다", replies: [["해리", "같이 가니까 하나도 안 무섭다!"]] }
      ]
    },
    ["맥고나걸", "{name}, 장원 별밤학교 입학을 축하해요."],
    ["덤블도어", "어서 오렴, {nameA}. 나는 교장 덤블도어란다."],
    ["덤블도어", "우리 학교에는 소중한 마법사의 돌이 있단다."],
    ["덤블도어", "별빛지도가 반짝반짝 빛나며 그 돌을 지켜 주지."],
    ["볼드모트", "흐흐… 그 돌은 내가 가져가겠다."],
    ["볼드모트", "별빛지도야, 깜깜해져라! 조각들아, 흩어져라!"],
    ["해리", "앗, 별빛 조각 일곱 개가 학교 곳곳으로 날아갔어!"],
    {
      kind: 'choice',
      speaker: "해리",
      text: "{nameA}, 어떡하지?",
      options: [
        { label: "같이 조각을 찾자!", replies: [["해리", "좋아! 너랑 함께라면 할 수 있어!"]] },
        { label: "선생님께 물어보자", replies: [["덤블도어", "좋은 생각이구나. 일곱 곳을 알려 주마."]] }
      ]
    },
    ["덤블도어", "조각을 다 모으면 지도가 다시 켜지고, 돌도 안전해진단다."],
    ["해그리드", "밖은 어두우니까 엄마 아빠 손 꼭 잡고 걸어가자!"],
    ["헤드위그", "(어려우면 헤드위그가 힌트 쪽지를 물어다 줄 거예요.)"],
    ["해리", "자, {nameA}! 지도에서 먼저 찾을 곳을 골라 봐!"]
  ];

export const FINALE_DIALOGUE: ScriptStep[] = [
    ["해리", "{nameA}! 별빛 조각 일곱 개를 다 모았어!"],
    ["헤드위그", "(헤드위그가 기뻐서 빙글빙글 날아요.)"],
    ["해리", "그런데 마지막 방에 커다란 거울이 있어."],
    ["덤블도어", "이건 소망의 거울이란다. 마음속 바람을 보여 주지."],
    {
      kind: 'choice',
      speaker: "덤블도어",
      text: "{nameA}, 거울에 무엇이 보이길 바라니?",
      options: [
        { label: "가족과 웃는 모습", replies: [["덤블도어", "참 따뜻한 바람이구나."]] },
        { label: "친구들과 별 보는 모습", replies: [["덤블도어", "곧 그 바람이 이루어질 거란다."]] }
      ]
    },
    ["해리", "(반짝!) 내 주머니에 빨간 돌이 들어왔어! 마법사의 돌이야!"],
    ["볼드모트", "그 돌을 내놔라! 별빛과 어둠의 마법 대결이다!"],
    ["해리", "{nameA}, 모은 별빛으로 마법을 쓰자! 같이 싸우자!"],
    { kind: 'battle' },
    ["해리", "볼드모트가 멀리 사라졌어!"],
    ["덤블도어", "{nameA}, 마법사의 돌은 무사하단다."],
    ["덤블도어", "돌을 욕심내지 않고 서로 도운 마음이 돌을 지켰지."],
    ["말포이", "…저기, {nameA}."],
    ["말포이", "나도 같이 하고 싶어. 다음엔 나랑도 같이 하자."],
    {
      kind: 'choice',
      speaker: "말포이",
      text: "…괜찮아?",
      options: [
        { label: "좋아, 친구 하자!", replies: [["말포이", "헤헤… 고마워!"]] },
        { label: "같이 별 보러 가자!", replies: [["말포이", "응! 같이 가자!"]] }
      ]
    },
    ["덤블도어", "마지막 별빛은 상자 안에 없습니다. 고개를 들어 하늘을 바라보세요."],
    ["해그리드", "자, 엄마 아빠 손 잡고 진짜 별을 보러 가자!"],
    ["해리", "{nameA}, 하늘에서 W 모양 별자리를 같이 찾아보자!"]
  ];

// -------------------------------------------------------------
// Grade-Level Quizzes Structure (Grade 1~6, 10 Questions each = 60 Total)
// Structured for Admin authoring & Unregistered Status Tracking
// -------------------------------------------------------------
const GRADE_QUIZZES_STORAGE_KEY = 'jangwon-starlight-grade-quizzes-v1';

export function createDefaultGradeQuizzes(): GradeQuizItem[] {
  const items: GradeQuizItem[] = [];

  for (let g = 1; g <= 6; g++) {
    for (let q = 0; q < 10; q++) {
      const boothIndex = q % 7;
      let questionTitle = `${g}학년 부스 퀴즈 0${q + 1}`;
      let questionText = `${g}학년 수준의 탐구 질문입니다. 현장 부스의 안내 패널을 읽고 알맞은 답을 선택하세요.`;
      let options = ['선택지 1', '선택지 2', '선택지 3'];
      let answer = 0;
      let explanation = `${g}학년 학생의 눈높이에 맞춘 개념 설명입니다.`;
      let hint = `현장 부스 안내판의 핵심 단어를 찾아보세요.`;
      let altAct = `현장 안내판을 손으로 짚으며 가족과 함께 질문을 천천히 읽어보세요.`;
      let isReg = false;

      // Sample established questions for primary booths per grade
      if (q === 0) {
        questionTitle = `${g}학년 카시오페이아 관찰`;
        questionText = `가을철 북쪽 밤하늘에서 W 또는 M 모양을 그리는 별자리는 무엇일까요?`;
        options = ['카시오페이아자리', '오리온자리', '전갈자리'];
        answer = 0;
        explanation = `가을철 북동쪽 하늘에서 가장 뚜렷하게 보이는 다섯 별의 길잡이 별자리입니다.`;
        hint = `알파벳 W 모양을 떠올려 보세요.`;
        altAct = `성도 판의 다섯 별을 손가락으로 이어보세요.`;
        isReg = true;
      } else if (q === 1) {
        questionTitle = `${g}학년 고리 행성 탐구`;
        questionText = `태양계에서 거대하고 아름다운 고리를 가진 행성은 무엇일까요?`;
        options = ['지구', '토성', '금성'];
        answer = 1;
        explanation = `토성은 얼음과 암석으로 이루어진 화려한 고리를 지니고 있습니다.`;
        hint = `흙 토(土) 자를 쓰는 행성이에요.`;
        altAct = `행성 모형에서 고리가 달린 행성을 찾아보세요.`;
        isReg = true;
      }

      items.push({
        id: `G${g}-${String(q + 1).padStart(2, '0')}`,
        grade: g,
        questionIndex: q,
        boothIndex,
        title: questionTitle,
        question: questionText,
        options,
        answer,
        explanation,
        hint,
        alternativeActivity: altAct,
        isRegistered: isReg
      });
    }
  }

  return items;
}

export function getGradeQuizzes(): GradeQuizItem[] {
  try {
    const raw = localStorage.getItem(GRADE_QUIZZES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 60) {
        return parsed;
      }
    }
  } catch {}
  return createDefaultGradeQuizzes();
}

export function saveGradeQuizzes(items: GradeQuizItem[]): void {
  try {
    localStorage.setItem(GRADE_QUIZZES_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function getGradeQuizStatus(): { registeredCount: number; pendingCount: number; total: number } {
  const all = getGradeQuizzes();
  const registeredCount = all.filter(q => q.isRegistered).length;
  return {
    registeredCount,
    pendingCount: all.length - registeredCount,
    total: all.length
  };
}

// -------------------------------------------------------------
// Latecomer Summary & Offline Mission Sheet Guidance
// -------------------------------------------------------------
export const LATECOMER_SUMMARY_GUIDE = {
  title: '늦게 도착한 학생과 가족을 위한 빠른 탐험 안내',
  summary: '헤드위그가 입학 편지를 가져왔어요. 학교의 마법사의 돌을 지키는 별빛지도가 깜깜해졌어요. 일곱 수업에서 별빛을 하나씩 모으면 지도가 다시 반짝여요.',
  steps: [
    '① [탐험 지도]에서 01~07 수업 중 원하는 곳을 자유롭게 먼저 방문하세요. (순서 상관 없음)',
    '② 부스 안내판의 현장 코드를 확인하고 미션을 수행한 뒤 사진을 기기에 저장하세요.',
    '③ 서로 다른 7개 수업을 모두 완료하면 최종장과 포트폴리오·설문이 열리고, 전문가 천체관측으로 이어집니다.'
  ]
};

export const OFFLINE_PRINTED_SHEET_GUIDE = {
  title: '기기 미소지 / 네트워크 장애 시 수기 기록 안내',
  desc: '스마트폰이 없거나 배터리 방전, 접속 장애가 발생한 학생은 운동장 접수처에서 종이 [인쇄 미션지]를 수령하여 운영 요원의 확인 도장을 받고 수기로 탐험에 정상 참여할 수 있습니다. 수기 완료 기록도 동일하게 피날레 천체관측 및 기념품 수령 대상입니다.'
};

// -------------------------------------------------------------
// Admin Codes & ZEP Links Storage
// -------------------------------------------------------------
const ADMIN_CODES_KEY = 'jangwon-starlight-admin-codes-v1';
const ADMIN_ZEP_LINKS_KEY = 'jangwon-starlight-admin-zep-links-v1';

export function getAdminCodes(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_CODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed.map(c => String(c ?? ''));
      }
    }
  } catch {}
  return ['', '', '', '', '', '', ''];
}

export function saveAdminCodes(codes: string[]) {
  const clean = Array.from({ length: 7 }, (_, i) => String(codes[i] ?? '').trim().toUpperCase());
  localStorage.setItem(ADMIN_CODES_KEY, JSON.stringify(clean));
}

export function getAdminZepLinks(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_ZEP_LINKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed.map(c => String(c ?? '').trim());
      }
    }
  } catch {}
  return ['', '', '', '', '', '', ''];
}

export function saveAdminZepLinks(links: string[]) {
  const clean = Array.from({ length: 7 }, (_, i) => String(links[i] ?? '').trim());
  localStorage.setItem(ADMIN_ZEP_LINKS_KEY, JSON.stringify(links));
}

export function getMissionZepLink(index: number): string {
  const links = getAdminZepLinks();
  return links[index] || '';
}

export function validateStationCode(
  input: string,
  state: ParticipantState,
  targetMissionIndex?: number
): { ok: boolean; index?: number; message?: string } {
  const codes = getAdminCodes();
  const trimmedInput = String(input ?? '').trim().toUpperCase();

  const activeMissionIndex = typeof targetMissionIndex === 'number'
    ? targetMissionIndex
    : (typeof state.selectedMissionIndex === 'number' ? state.selectedMissionIndex : 0);

  if (activeMissionIndex < 0 || activeMissionIndex >= 7) {
    return { ok: false, message: '유효한 부스를 먼저 선택해 주세요.' };
  }

  if (state.completed.includes(activeMissionIndex)) {
    return { ok: false, message: '이미 별빛 조각을 획득한 부스입니다.' };
  }

  const expectedCode = codes[activeMissionIndex];

  if (!expectedCode || expectedCode.trim() === '') {
    return {
      ok: false,
      message: '이 부스의 현장 코드가 아직 운영진에 의해 설정되지 않았습니다. 관리자 운영실에서 코드를 설정해 주세요.'
    };
  }

  if (!trimmedInput) {
    return { ok: false, message: '현장 안내판의 코드를 입력해 주세요.' };
  }

  if (trimmedInput !== expectedCode) {
    const matchedOtherIndex = codes.findIndex(c => c && c.trim() !== '' && c === trimmedInput);
    if (matchedOtherIndex !== -1 && matchedOtherIndex !== activeMissionIndex) {
      return {
        ok: false,
        message: `입력하신 코드는 다른 부스(${matchedOtherIndex + 1}번 부스)의 코드입니다. 현재 선택된 ${activeMissionIndex + 1}번 부스의 코드를 입력해 주세요.`
      };
    }
    return { ok: false, message: '현장 코드가 올바르지 않습니다. 안내판을 다시 확인해 주세요.' };
  }

  return { ok: true, index: activeMissionIndex };
}
