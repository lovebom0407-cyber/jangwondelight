import type { Mission, ScriptStep } from '../types';
import type { ExperienceMode } from '../services/experience';
import { SHOWCASE_PADLET_ACTIVITY } from './showcaseActivity';

// Display order only. IDs remain the keys for saved photos, progress and rewards.
const STANDARD_ORDER = [1, 2, 3, 4, 5, 0, 6] as const;
const JUNIOR_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export function getMissionOrder(mode: ExperienceMode = 'standard'): readonly number[] {
  return mode === 'junior' ? JUNIOR_ORDER : STANDARD_ORDER;
}

export function getMissionNumber(id: number, mode: ExperienceMode = 'standard'): number {
  return getMissionOrder(mode).indexOf(id) + 1;
}

type FieldMission = Pick<Mission, 'title' | 'lessonName' | 'starlight' | 'place' | 'visitLabel' | 'story' | 'photoTip' | 'photoDescription' | 'photoFrameGuide'> & {
  usesZepQuiz?: boolean;
  astronomyResources?: boolean;
  zepActivity?: Mission['zepActivity'];
  externalActivity?: Mission['externalActivity'];
};

const DETAILS: Record<number, FieldMission> = {
  1: {
    title: '별밤학교 둘러보기', lessonName: '별밤학교 둘러보기', starlight: '협력의 별빛',
    place: '행사장 아무곳이나', visitLabel: '행사장 아무곳이나',
    story: '가족과 별밤학교를 천천히 둘러봐요. 함께 가 보고 싶은 곳을 고르고, 행사장에서 즐거운 모습을 남겨요.',
    photoTip: '행사장 어디에서든 가족과 함께한 모습을 찍어요.',
    photoDescription: '행사장 아무곳이나 가족과 함께 둘러보고, 함께 온 가족과 학생이 같은 사진에 나오도록 기념사진을 찍어요.',
    photoFrameGuide: '학교나 행사 장식을 배경으로 학생과 가족이 함께 보이면 돼요. 다른 가족의 얼굴은 포함하지 않도록 해요.',
  },
  2: {
    title: '의상대여 체험', lessonName: '어둠의 마법 방어술', starlight: '추리의 별빛',
    place: '의상대여존&운영본부', visitLabel: '의상대여존&운영본부 부스 방문',
    story: '의상대여존&운영본부에서 의상과 소품을 살펴봐요. 운영 선생님 안내를 듣고 안전하게 체험해요.',
    photoTip: '의상을 고르거나 빌리는 모습을 찍어요.',
    photoDescription: '의상대여존&운영본부에서 망토나 소품을 고르거나 전달받는 모습을 찍어요. 대여하지 않을 때는 준비된 의상을 살펴보는 모습도 좋아요.',
    photoFrameGuide: '의상이나 대여 장소와 참여하는 모습이 함께 보이면 좋아요. 운영본부 선생님 안내를 따라요.',
  },
  3: {
    title: 'AI 활용 그림책 감상하기 · AI OCEANS 체험해보기', lessonName: '마법 도서관 수업', starlight: '지식의 별빛',
    place: 'AI 체험존', visitLabel: 'AI 체험존 부스 방문',
    story: 'AI 체험존에서 AI를 활용해 만든 그림책을 감상하고, AI OCEANS도 체험해 봐요. 가족과 기억에 남은 장면을 이야기해요.',
    photoTip: '그림책을 감상하거나 AI OCEANS를 체험하는 모습을 찍어요.',
    photoDescription: 'AI 체험존에 방문해 AI 활용 그림책을 감상하고 AI OCEANS를 체험해 봐요. 학생이나 가족이 그림책을 보거나 AI OCEANS를 체험하는 모습을 활동 인증샷으로 남겨요.',
    photoFrameGuide: '그림책 또는 AI OCEANS 체험 화면과 참여하는 모습이 함께 보이면 좋아요. 전시 자료와 체험 기기는 현장 안내에 따라 다뤄요.',
    zepActivity: {
      title: '그림책·AI OCEANS ZEP QUIZ',
      description: 'AI 체험존에 비치된 ZEP QUIZ QR로 그림책 및 AI OCEANS 관련 퀴즈를 풀어요. 퀴즈에 참여하는 모습을 별도의 활동 인증샷으로 올려요.',
      separatePhoto: true,
      photoTip: '그림책·AI OCEANS 관련 ZEP QUIZ를 푸는 모습을 찍어요.',
      frameGuide: '퀴즈에 참여하는 학생이나 가족과 기기 화면을 함께 담아요. QR 코드 자체 사진이나 점수·정답 화면은 필요하지 않아요.',
    },
  },
  4: {
    title: '별빛 초상화 만들기', lessonName: '별빛 초상화 만들기', starlight: '표현의 별빛',
    place: '네컷 사진 부스', visitLabel: '네컷 사진 부스 방문',
    story: '네컷 사진 부스에서 우리 가족의 표정과 포즈를 정해요. 사진 속에 오늘의 별빛 초상화를 남겨요.',
    photoTip: '네컷사진을 찍는 모습 또는 완성한 사진을 찍어요.',
    photoDescription: '네컷 사진 부스에서 촬영을 준비하는 모습, 함께 포즈를 취하는 모습, 완성된 네컷사진 중 하나를 촬영해요.',
    photoFrameGuide: '네컷 사진 부스나 완성한 네컷사진이 보이면 돼요. 촬영 중에는 업체 안내를 따라요.',
  },
  5: {
    title: '원하는 마법 표식 주문하기 · 천문 사전지식 ZEP QUIZ', lessonName: '창의 마법 실습', starlight: '창의의 별빛',
    place: '페이스페인팅 부스', visitLabel: '페이스페인팅 부스 방문',
    story: '페이스페인팅 부스에서 천문 사전지식 ZEP QUIZ에 참여해요. 취향에 맞는 타투 또는 페이스페인팅도 체험한 뒤 인증샷을 남겨요.',
    photoTip: '취향에 맞는 타투 또는 페이스페인팅 후 인증샷 찍기',
    photoDescription: '페이스페인팅 부스를 방문해 취향에 맞는 타투 또는 페이스페인팅을 선택하고, 체험 후 완성한 마법 표식이 보이도록 활동 인증샷을 찍어요.',
    photoFrameGuide: '완성된 타투 또는 페이스페인팅이 보이도록 찍어요. 학생과 마법 표식을 함께 담고, 체험 방법은 현장 선생님 안내를 따라요.',
    astronomyResources: true,
    zepActivity: {
      title: '천문 사전지식 ZEP QUIZ',
      description: '이 부스에 비치된 천문 사전지식 ZEP QUIZ QR을 휴대폰 기본 카메라로 비춰 가족과 퀴즈를 풀어요. ZEP QUIZ 인증샷 탭에서 퀴즈 참여 사진을 남기고, 체험 인증샷 탭에는 타투 또는 페이스페인팅 후 사진을 올려요.',
      separatePhoto: true,
      photoTip: '천문 사전지식 ZEP QUIZ를 푸는 모습을 찍어요.',
      frameGuide: '퀴즈에 참여하는 학생이나 가족과 기기 화면을 함께 담아요. QR 코드 자체 사진이나 점수·정답 화면은 필요하지 않아요.',
    },
  },
  0: {
    title: '천체관측 체험', lessonName: '천문수업', starlight: '관찰의 별빛',
    place: '천체관측 부스 · 19:50 이후', visitLabel: '천체관측 부스 방문 (19:50 이후)',
    story: '19:50 이후 천체관측 부스에서 전문가와 밤하늘을 만나요. 망원경으로 천체를 관측하는 모습을 활동 인증샷으로 남겨요.',
    photoTip: '천체관측하는 모습을 인증샷으로 찍어 올려요.',
    photoDescription: '19:50 이후 천체관측 부스에서 전문가 안내에 따라 망원경으로 밤하늘을 관측하고, 학생이나 가족이 천체관측하는 모습을 사진으로 찍어 올려요.',
    photoFrameGuide: '망원경과 관측하는 학생 또는 가족이 함께 보이도록 찍어요. 플래시는 끄고, 관측과 이동을 방해하지 않도록 동행 가족에게 촬영을 부탁해요.',
    usesZepQuiz: false, astronomyResources: true,
  },
  6: {
    title: SHOWCASE_PADLET_ACTIVITY.title, lessonName: '협력 마법 실습', starlight: '협력의 별빛',
    place: 'AI 성과공유 부스', visitLabel: 'AI 성과공유 부스 방문 · 패들렛 작성',
    story: 'AI 성과공유 부스에서 가족과 오늘의 추억을 이야기하고, 패들렛에 장원 별밤학교에 남기는 한마디를 작성해요.',
    photoTip: '패들렛에 한마디를 쓰는 모습이나 내가 올린 글의 화면을 인증샷으로 남겨요.',
    photoDescription: 'AI 성과공유 부스를 방문해 아래 패들렛 링크를 열고, 장원 별밤학교에 남기는 한마디를 작성해 게시해요. 이 앱으로 돌아와 글을 쓰는 모습이나 내가 올린 글의 화면을 인증샷으로 올려요.',
    photoFrameGuide: '가족과 한마디를 작성하는 모습 또는 내가 게시한 글이 보이도록 찍어요. 다른 가족의 얼굴이나 글은 사진에 포함하지 않도록 해요.',
    usesZepQuiz: false,
    externalActivity: SHOWCASE_PADLET_ACTIVITY,
  },
};

export function withStandardFieldMission(mission: Mission): Mission {
  const detail = DETAILS[mission.id];
  const speaker = mission.speaker;
  const introLines: ScriptStep[] = [
    [speaker, '{nameA}, 이곳에도 별빛 조각이 숨어 있어!'],
    [speaker, `오늘의 수업은 ${detail.lessonName}.`],
    [speaker, `${detail.place}에서 현장 선생님 안내를 따라 줘.`],
    [speaker, detail.photoTip],
    {
      kind: 'choice', speaker, text: '가족과 어떻게 체험해 볼까?',
      options: [
        { label: '함께 천천히 살펴볼게요', replies: [[speaker, '좋아! 안전하게 둘러보고, 사진으로 기억하자.']] },
        { label: '서로 도우며 해 볼게요', replies: [[speaker, '함께하면 더 즐거워. 현장 선생님 안내도 듣자.']] },
      ],
    },
    [speaker, '가족과 차례를 지키고, 서로 도우며 체험하자.'],
    [speaker, detail.externalActivity ? '패들렛에 별밤학교에 남기는 한마디를 쓰고, 인증샷을 올려 줘!' : detail.usesZepQuiz || detail.zepActivity ? '현장 ZEP QUIZ와 체험에 참여하고, 활동사진을 남겨 줘!' : '가족과 체험하고, 활동하는 모습을 사진으로 남겨 줘!'],
  ];
  return {
    ...mission, ...detail,
    boothGuide: detail.photoDescription!,
    unlockedClueTitle: `${detail.starlight} · ${detail.title} 인증`,
    unlockedClueDesc: detail.photoTip,
    hint: detail.photoFrameGuide,
    activity: detail.photoTip,
    notePrompt: '가족과 체험하며 기억에 남은 일을 한 줄 적어 봐요.',
    alternativeActivity: detail.photoFrameGuide,
    introLines,
    rewardLines: [
      [speaker, '{nameA}, 별빛 조각이 다시 반짝이고 있어!'],
      [speaker, `${detail.starlight}을 모았어. 가족과 함께해서 더 빛나!`],
      {
        kind: 'choice', speaker, text: '오늘의 조각은 어떻게 기억할까?',
        options: [
          { label: '가족과 사진으로 남길래요', replies: [[speaker, '좋아! 사진 속에 함께한 시간이 반짝일 거야.']] },
          { label: '친구에게 이야기할래요', replies: [[speaker, '네 이야기를 들으면 친구도 즐거워할 거야.']] },
        ],
      },
      [speaker, '이제 다른 수업도 골라서 체험해 보자!'],
    ],
  };
}
