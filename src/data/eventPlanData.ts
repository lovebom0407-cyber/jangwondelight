import { DutyAssignment, EventScheduleItem } from '../types';

export const OFFICIAL_EVENT_TITLE = '장원 별밤학교';
export const OFFICIAL_EVENT_DATE = '2026-10-21(수)';
export const OFFICIAL_EVENT_PLACE = '장원초등학교 (운동장 및 특별교실)';
export const OFFICIAL_INVITATION_TARGET = '장원초·흥전초 학생 및 가족, 2027학년도 예비 초1 및 가족';

export const EXTERNAL_APPLICATION_URL = 'https://gw1.kr/F0A1w';
export const EXTERNAL_APPLICATION_DEADLINE = '2026-10-14(수)까지';
export const EXTERNAL_APPLICATION_GUIDE = '외부 신청 시스템(https://gw1.kr/F0A1w)에서 [비회원 → 인증번호로 참가신청하기]를 선택하여 정식 참가 신청을 완료해 주세요. (앱 프로필 입력은 당일 현장 활동용이며 참가 신청을 대신하지 않습니다)';

/**
 * Confirmed Schedule based on 10/6 Operational Plan & 10/7 Staff Notification
 * Strictly separates 本校 사전프로그램 and 가족프로그램.
 * Does NOT arbitrarily fabricate an unconfirmed end time.
 */
export const OFFICIAL_SCHEDULE: EventScheduleItem[] = [
  {
    timeStr: '15:40 ~',
    title: '장원초 본교학생 사전프로그램',
    category: '사전프로그램',
    target: '장원초 재학생',
    desc: '전문가 지도하에 안전한 태양 흑점 관찰 및 천체망원경 분해·조립 기초 실습을 진행합니다.',
    safetyNote: '★ 태양 관측 시에는 반드시 공인된 [태양관측 전용 필터]를 장착한 망원경만 사용해야 하며 맨눈이나 일반 망원경으로 절대 태양을 보지 않습니다.'
  },
  {
    timeStr: '17:00 ~',
    title: '가족 프로그램 개막 및 입학식',
    category: '가족프로그램',
    target: '장원초·흥전초 학생 및 동반 보호자',
    desc: '보호자 동반 등록 확인, 낡은 마법 분류모자 기숙사 배정, 해리·헤르미온느·론과 함께하는 탐험 안내가 시작됩니다.',
    safetyNote: '모든 학생은 안전을 위해 반드시 성인 보호자와 동행하여 참여합니다.'
  },
  {
    timeStr: '입학식 직후 (자유 탐험)',
    title: '별빛 보물찾기 (7개 부스 자유 선택)',
    category: '자유부스',
    target: '학생 및 가족 전체',
    desc: '7개 배움 부스를 원하는 순서대로 자유롭게 방문하여 활동을 수행하고 인증샷을 남겨 별지도의 기록을 되찾습니다.',
    safetyNote: '부스 간 이동 시 뛰지 않고 안전 요원의 안내에 따릅니다.'
  },
  {
    timeStr: '체험 중 자유 이용',
    title: '가족 바비큐 먹거리 나눔 (선택 체험)',
    category: '선택체험',
    target: '참여 가족 전체',
    desc: '따뜻한 모닥불과 함께하는 가족 바비큐 나눔입니다. (음식 섭취는 선택 체험이며 7개 별빛 조각 수집의 필수 조건이 아닙니다.)',
    safetyNote: '화기 주변에서는 어린이의 단독 접근을 금지하며 안전 장갑과 집게를 사용합니다.'
  },
  {
    timeStr: '체험 중 자유 이용',
    title: '페이스페인팅 체험 (선택 체험)',
    category: '선택체험',
    target: '희망 학생 및 가족',
    desc: '학부모회 협조로 진행되는 별밤 마법 페이스페인팅입니다. (피부 접촉 활동은 선택 체험이며 7조각 필수 조건이 아닙니다.)'
  },
  {
    timeStr: '자유 탐험 후 모임',
    title: '교실 속 별밤여행 & 성과공유',
    category: '가족프로그램',
    target: '참여 가족 전체',
    desc: '디지털·AI 성과공유 영상과 6학년 AI 그림책을 감상하며 말포이와 화해하고 7개 기록을 한자리에 모읍니다.'
  },
  {
    timeStr: '19:50 ~ 21:00 (기상에 따라 변경)',
    title: '전문가 천체관측 피날레',
    category: '가족프로그램',
    target: '참여 가족 전체',
    desc: '“마지막 별빛은 상자 안에 없습니다. 고개를 들어 하늘을 바라보세요.” 학교 운동장에서 천체망원경으로 카시오페이아와 신비로운 밤하늘 천체를 직접 관측합니다.',
    safetyNote: '야간 보온 의류(외투)를 착용하고 망원경 조작은 전문 강사의 지시에 따릅니다.'
  }
];

/**
 * Confirmed Actual Booths
 * AI 체험부스: AI 활용 체험 콘텐츠 / 다양한 AI 체험 활동 / 가족이 함께 즐기는 체험 (세부 도구·활동은 운영자 설정/현장 안내).
 * Digital AI Showcase, Photo Zone with disclaimer.
 * Food trucks removed per latest user instructions!
 */
export const ACTUAL_BOOTHS_INFO = [
  {
    index: 0,
    title: '별자리 관찰·복원 (천문 수업)',
    character: '해리·덤블도어',
    desc: '카시오페이아자리 별 잇기와 실제 관찰 안내로 관찰의 별빛을 얻습니다.'
  },
  {
    index: 1,
    title: '행성 탐험 (천문 수업 · 행성 탐구)',
    character: '헤르미온느',
    desc: '행성을 비교하고 근거를 들어 설명하며 탐구의 별빛을 얻습니다.'
  },
  {
    index: 2,
    title: '안전 약속 탐험 (어둠의 마법 방어술)',
    character: '스네이프·말포이',
    desc: '현장 안내에서 안전한 행동을 찾아 실천하며 추리의 별빛을 얻습니다.'
  },
  {
    index: 3,
    title: '도서 탐색 (마법 도서관 수업)',
    character: '헤르미온느·론',
    desc: '우주·AI 관련 책과 자료를 찾아 읽고 지식의 별빛을 얻습니다.'
  },
  {
    index: 4,
    title: 'AI 그림책·성과 전시 (이야기 표현 수업)',
    character: '맥고나걸·론',
    desc: '전시 작품을 감상하고 생각을 기록하며 표현의 별빛을 얻습니다.'
  },
  {
    index: 5,
    title: 'AI 체험부스 (창의 마법 실습)',
    character: '론·맥고나걸',
    desc: 'AI 활용 체험 콘텐츠 / 다양한 AI 체험 활동 / 가족이 함께 즐기는 체험 (세부 AI 도구 및 활동은 운영자 설정 또는 현장 안내를 따릅니다. 기존 머그컵 및 폐재료 리폼 필수활동은 완전히 대체되었습니다).'
  },
  {
    index: 6,
    title: '의상·가족 포토존 (협력 마법 실습)',
    character: '해그리드·해리',
    desc: '의상을 착용하고 가족 인증사진과 기억 한 문장을 남기며 협력의 별빛을 얻습니다. (*안내된 포토존 시안은 예시 도안이며 현장 여건에 따라 변경될 수 있습니다)'
  }
];

/**
 * Official Safety & Facilities Notice
 */
export const SAFETY_AND_FACILITY_GUIDELINES = {
  guardianAccompaniment: '안전사고 예방을 위해 학생 단독 참가는 불가하며, 모든 활동은 반드시 성인 보호자 동반 하에 진행됩니다.',
  registrationAndHandover: '운동장 접수처에서 등록 확인 후 패스포트와 리플릿을 수령하며, 귀가 시에도 접수처에서 안전 확인 후 귀가합니다.',
  indoorSlippers: '1층 도서관은 개방하지 않으며 화장실만 이용합니다. 실내에서는 안내된 실내화 또는 덧신을 착용합니다.',
  rainAlternativePlan: '우천·강풍 또는 관측이 어려운 경우 운영진의 변경 안내를 따라 주세요. 앱에서는 실내에서도 천문 자료·영상과 별자리 연습을 이용할 수 있습니다.',
  healthAndEmergency: '운영본부는 의상대여 장소입니다. 응급 상황은 운영본부에 계신 보건 선생님께 즉시 알려 주세요.',
  unconfirmedNotice: '미확정 장소, 긴급 연락처, 세부 분 단위 시간표는 학교 현장 운영진 설정 필요에 따라 공란으로 유지되며 당일 현장 방송으로 고지됩니다.'
};

/**
 * Confirmed Admin Duty Assignments (10/7 업무분장안 확정 내역)
 * Roles/contacts editable only by admin; student private list / emergency contacts not exposed publicly.
 */
export const INITIAL_DUTY_ASSIGNMENTS: DutyAssignment[] = [
  { id: 'duty-01', dept: '연구', task: '행사 기획 총괄, 전체 프로그램 운영 및 총괄 조정', status: '확정', notes: '운영실' },
  { id: 'duty-02', dept: '교무', task: '방송 진행, 프로그램 시간 및 변동 사항 실시간 안내 방송', status: '확정', notes: '방송실' },
  { id: 'duty-03', dept: '행정실', task: '전기 시설, 야외 조명 및 음향 전력선 안전 점검', status: '확정', notes: '행정실' },
  { id: 'duty-04', dept: '교무행정사', task: '실내 덧신, 신발 보관 물품 및 배부 물품 관리 지원', status: '확정', notes: '접수처' },
  { id: 'duty-05', dept: '학부모회', task: '운영 부스 2동 설치 협조, 테이블·의자 대여 관리, 페이스페인팅 진행 협조', status: '협조협의', notes: '학부모회' },
  { id: 'duty-06', dept: '보건', task: '응급 처치실 운영, 구급약품 구비, 학생 및 가족 안전·보건 대응', status: '확정', notes: '보건실' },
  { id: 'duty-07', dept: '1학년', task: '유치원 및 1학년 학생·가족 동선 안내 및 안전 보호', status: '확정', notes: '1학년 연구실' },
  { id: 'duty-08', dept: '2학년', task: '별빛 보물찾기 7개 부스 스탬프 패스포트 확인 및 지도', status: '확정', notes: '2학년 연구실' },
  { id: 'duty-09', dept: '3학년', task: '디지털·AI 성과공유 영상 상영 부스 운영 및 기술 지원', status: '확정', notes: '3학년 연구실' },
  { id: 'duty-10', dept: '4학년', task: '페이스페인팅 부스 질서 유지 및 재료 안내 지원', status: '확정', notes: '4학년 연구실' },
  { id: 'duty-11', dept: '5학년', task: 'AI 체험존(AI 도구 및 기술 시연) 부스 진행 및 안내', status: '확정', notes: '5학년 연구실' },
  { id: 'duty-12', dept: '특수', task: '운동장 접수 안내, 이동 약자 지원 및 패스포트 배부', status: '확정', notes: '접수처' },
  { id: 'duty-13', dept: '영양', task: '가족 바비큐 먹거리 위생 점검, 식재료 및 배식 지원', status: '확정', notes: '급식실' },
  { id: 'duty-14', dept: '전교직원', task: '행사 전 시설 설치, 테이블·의자 세팅, 행사 후 철거 및 정리정돈', status: '확정', notes: '전교직원' },
  { id: 'duty-15', dept: '6학년/과학', task: '천체관측 전문가 지원 및 망원경 조작 보조 (제안 상태)', status: '담당미정', notes: '천체관측지원은 제안 상태이므로 담당미정 표기' }
];

export const DUTY_STORAGE_KEY = 'jangwon-starlight-duty-assignments-v1';

export function getDutyAssignments(): DutyAssignment[] {
  try {
    const raw = localStorage.getItem(DUTY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_DUTY_ASSIGNMENTS;
}

export function saveDutyAssignments(assignments: DutyAssignment[]): void {
  try {
    localStorage.setItem(DUTY_STORAGE_KEY, JSON.stringify(assignments));
  } catch {}
}
