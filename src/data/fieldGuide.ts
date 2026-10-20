export const FIELD_SCHEDULE = [
  ['17:00–17:20', '마법학교 입학', '접수 · 의상 · 패스포트 · 안전 안내'],
  ['17:20–18:00', '별빛 보물찾기', '가족과 함께 야외 미션'],
  ['18:00–소진 시', '별빛 바비큐', '식사할 때는 대여 망토를 벗어요'],
  ['19:10–19:30', '장원초의 오늘과 내일', '교육활동 · 미래 교육 비전 나눔'],
  ['19:30–20:10', '교실 속 별밤여행', '교실 체험은 현장 안내를 따라요'],
  ['19:50–21:00', '전문가 천체관측', '운동장 관측 부스 · 일부 프로그램 동시 운영'],
  ['21:00', '가족과 함께 귀가', '보호자와 끝까지 함께해요']
] as const;

export const OBSERVING_CARDS = [
  { id: 'moon', icon: '◐', title: '달의 울퉁불퉁한 얼굴', tag: '망원경으로',
    before: '매끈해 보이는 달에도 산과 움푹 파인 곳이 있을까?',
    look: '밝은 쪽과 어두운 쪽의 경계 가까이를 살펴보세요. 길게 드리운 그림자에서 지형을 찾기 좋아요.',
    after: '내 눈으로 본 밝기와 모양을 그림이나 한 문장으로 남겨요.',
    source: 'https://science.nasa.gov/moon/viewing-tips/', credit: 'NASA · 달 관측 안내 (영문)' },
  { id: 'saturn', icon: '♄', title: '토성의 얇은 고리', tag: '전문가 안내로',
    before: '토성의 고리는 하나의 단단한 판일까?',
    look: '고리는 수많은 얼음과 암석 조각으로 이루어져 있어요. 사진처럼 크고 뚜렷하게 보이지 않을 수도 있어요.',
    after: '둥근 행성 양옆의 모양을 말해 보세요. 보이지 않았다면 그 까닭을 함께 생각해요.',
    source: 'https://science.nasa.gov/saturn/facts/', credit: 'NASA · 토성 알아보기 (영문)' },
  { id: 'cassiopeia', icon: 'W', title: '카시오페이아의 다섯 별', tag: '맨눈으로',
    before: '별 다섯 개를 이으면 어떤 모양이 될까?',
    look: '북쪽 하늘의 W 모양을 찾아요. 시간과 방향에 따라 기울어져 보일 수 있어요. 앱의 별자리 지도로 먼저 연습해요.',
    after: '가족과 같은 별을 가리켜 보세요. 실제 하늘에서 찾기 어려우면 전문가에게 물어보세요.',
    source: '', credit: '앱 내 별자리 지도 · 도계 기준 계산' }
] as const;

export const SKY_VIDEOS = [
  { id: 'nr5Pj6GQL2o', title: '망원경 너머, 달 표면 여행', duration: '약 5분',
    lead: '커다란 충돌구와 산맥을 따라 달 위를 날아봐요. 영어 영상이며, 화면의 지형을 중심으로 살펴봐요.',
    source: 'https://science.nasa.gov/resource/tour-of-the-moon-4k/', credit: 'NASA Goddard · Tour of the Moon in 4K' }
] as const;
