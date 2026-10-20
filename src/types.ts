export interface House {
  id: number;
  name: string;
  color: string;
  animal: string;
  symbol: string;
  trait: string;
  motto: string;
}

export type CharacterName =
  | '해리'
  | '헤르미온느'
  | '론'
  | '말포이'
  | '볼드모트'
  | '덤블도어'
  | '맥고나걸'
  | '해그리드'
  | '헤드위그'
  | '도비'
  | '스네이프';

export type DialogueLine = [speaker: CharacterName, line: string];

/** 선택지 (시뮬레이션 게임처럼 아이가 고르면 캐릭터가 다르게 대답) */
export interface ChoiceOption {
  label: string;
  replies: DialogueLine[];
}
export interface ChoiceStep {
  kind: 'choice';
  speaker: CharacterName;
  text: string;
  options: ChoiceOption[];
}
/** 볼드모트 마법 대결 미니게임 (대본 중간에 끼워 넣음) */
export interface BattleStep {
  kind: 'battle';
}
export type ScriptStep = DialogueLine | ChoiceStep | BattleStep;

export interface Mission {
  id: number;
  title: string;
  place: string;
  visitLabel?: string;
  usesZepQuiz?: boolean;
  astronomyResources?: boolean;
  externalActivity?: {
    title: string;
    url: string;
    prompt: string;
    steps: string[];
  };
  zepActivity?: {
    title: string;
    description: string;
    separatePhoto?: boolean;
    photoTip?: string;
    frameGuide?: string;
  };
  icon: string;
  story: string;
  boothGuide: string;
  speaker: CharacterName; // 대표 화자 (지도·안내 카드)
  speakers: CharacterName[]; // 수업 담당 화자 (레지스트리 연결)
  lessonName: string; // 앱 속 수업명 (예: 천문 수업)
  starlight: string; // 획득 별빛 이름 (예: 관찰의 별빛)
  photoDescription?: string;
  photoFrameGuide?: string;
  photoTip: string; // 인증샷으로 찍을 것 (한 줄)
  question?: string;
  options?: string[];
  answer?: number;
  activity?: string;
  notePrompt?: string;
  unlockedClueTitle: string;
  unlockedClueDesc: string;
  introLines: ScriptStep[];
  rewardLines: ScriptStep[];
  hint?: string;
  alternativeActivity?: string;
}

export type ZepSubmissionStatus =
  | 'localDraft'
  | 'submitPending'
  | 'reviewPending'
  | 'approved'
  | 'rejected';

export type MissionStatus = 'not_started' | 'in_progress' | 'pending_verification' | 'completed';

export interface GradeQuizItem {
  id: string; // e.g. 'G1-01'
  grade: number; // 1..6
  questionIndex: number; // 0..9 (10 questions per grade)
  boothIndex: number; // 0..6
  title: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  hint: string;
  alternativeActivity: string;
  isRegistered: boolean;
}

export interface DutyAssignment {
  id: string;
  dept: string;
  task: string;
  status: '확정' | '협조협의' | '담당미정' | '운영진설정필요';
  contact?: string;
  notes?: string;
}

export interface EventScheduleItem {
  timeStr: string;
  title: string;
  category: '사전프로그램' | '가족프로그램' | '자유부스' | '선택체험';
  target: string;
  desc: string;
  safetyNote?: string;
}

export interface MissionRecord {
  status?: MissionStatus;
  selectedOption?: number;
  dialogueCursor?: number;
  completedAt?: string;
  capturedAt?: string;
  evidenceId?: string;
  quizActivityEvidenceId?: string;
  quizActivityCapturedAt?: string;
  quizActivityConfirmedAt?: string;
  uploadStatus?: 'pending' | 'uploaded' | 'failed';
  uploadError?: string | null;
  fileId?: string;
  userNote?: string;
  zepQuizSubmitted?: boolean;
  zepQuizStatus?: ZepSubmissionStatus;
  zepQuizEvidenceId?: string;
  zepQuizCapturedAt?: string;
  zepQuizNote?: string;
  zepQrUrl?: string; // 현장 ZEP QUIZ QR 촬영으로 확인한 링크
  zepQrScannedAt?: string;
  usedAlternativeActivity?: boolean;
  usedHint?: boolean;
  masterSkip?: boolean; // 마스터(테스트) 모드로 인증샷 없이 받은 별빛
}

export interface CustomConstellationData {
  name: string;
  story: string;
  stars: { x: number; y: number; name?: string }[];
  lines: [number, number][];
  createdAt?: string;
}

export interface ObservatoryProgressState {
  completedConstellations: string[]; // list of constellation IDs: 'cassiopeia', 'ursa_minor', etc.
  customConstellation?: CustomConstellationData;
  lastViewedConstellation?: string;
  lastObservationDate?: string;
  lastObservationHour?: number;
}

export interface ParticipantStoryState {
  introDone: boolean;
  finaleDone: boolean;
  scene: {
    kind: 'intro' | 'arrival' | 'reward' | 'finale';
    index: number;
    cursor: number;
  } | null;
  inspected?: Record<number, number[]>; // preserved for legacy migration
  deduced?: Record<number, boolean>;   // preserved for legacy migration
  evidence: number[];                 // indices of completed missions whose digital clues are unlocked
}

export interface ParticipantState {
  houseAssignmentRevision?: string;
  sortingPhotoSkipped?: boolean; // explicit camera-unavailable fallback, never automatic
  sortingPhotoCapturedAt?: string;
  experienceMode?: import('./services/experience').ExperienceMode;
  fieldObservation?: { target: string; note: string; recordedAt: string };
  cloudPhotoConsent?: boolean; // 과거 기록 이관용. 기기 저장 전용 버전에서는 항상 false.
  participantId: string;
  participantCode?: string; // Stable short ID for ZEP nickname (e.g. BW-7482)
  name: string;
  school?: '장원초' | '흥전초' | '기타' | string;
  grade?: '1학년' | '2학년' | '3학년' | '4학년' | '5학년' | '6학년' | '유치원' | '가족' | string;
  classroom?: string; // '1' or kindergarten class name, without the trailing 반
  family: string;
  house: number | null; // 0..3
  photo: string | null; // dataURL for sorting portrait
  completed: number[];  // set of completed mission indices in any order
  selectedMissionIndex: number | null; // currently selected booth index (0..6)
  unlocked: number | null; // currently unlocked mission index
  pendingMission: number | null; // mission waiting for evidence photo
  finishedAt?: string;
  records: Record<number, MissionRecord>;
  reflection: {
    favorite?: string;
    learned?: string;
    family?: string;
  };
  story: ParticipantStoryState;
  observatory?: ObservatoryProgressState;
  spells?: number[]; // 미니게임으로 배운 마법 (수업 번호 0..6)
  rewards?: import('./services/rewards').RewardState; // 미션 클리어 보상 이용권
  arcade?: { cleared: Record<string, number>; seen?: string[]; duel?: { loadout: string[] } }; // 미니게임 탭: 게임별 깬 최고 스테이지 (1~10)
}

export interface EvidenceItem {
  id: string;
  participantId: string;
  mission: number;
  jpeg: string;
  capturedAt: string;
  status: 'pending' | 'uploaded';
  authorized?: boolean;
  uploadedAt?: string;
  fileId?: string;
  error?: string | null;
  kind?: 'activity' | 'zep_quiz';
  activitySlot?: 'quiz';
  zepStatus?: ZepSubmissionStatus;
}

export interface AdminAuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: {
    uid: string;
    email: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}

export type AppScreen =
  | 'start'
  | 'characters'
  | 'prologue'
  | 'enroll'
  | 'camera'
  | 'thinking'
  | 'assigned'
  | 'map'
  | 'scan'
  | 'dialogue'
  | 'mission'
  | 'evidence'
  | 'reward'
  | 'passport'
  | 'bag'
  | 'journal'
  | 'portfolio'
  | 'survey'
  | 'ending'
  | 'admin'
  | 'admin-login'
  | 'minigame'
  | 'junior-sky'
  | 'junior-final'
  | 'field-guide'
  | 'observatory'
  | 'treasure'
  | 'tickets'
  | 'arcade';
