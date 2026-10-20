import React, { useEffect, useState } from 'react';
import { FestivalGuide } from '../FestivalGuide';
import { ObservationSessions } from '../ObservationSessions';
import { ArrowLeft, ArrowUpRight, Check, Moon, Play, Telescope } from 'lucide-react';
import { ParticipantState } from '../../types';
import { CharacterFace } from '../characterAssets';
import { FIELD_SCHEDULE, OBSERVING_CARDS, SKY_VIDEOS } from '../../data/fieldGuide';

interface Props {
  state: ParticipantState;
  onUpdateState: (p: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onShowToast: (s: string) => void;
}

export function FieldGuideScreen({ state, onUpdateState, onNavigate, onShowToast }: Props) {
  const [tab, setTab] = useState('observe');
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState(state.fieldObservation?.note || '');
  const [target, setTarget] = useState(state.fieldObservation?.target || '달');
  const [night, setNight] = useState(() => document.documentElement.dataset.night === 'true');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const setNightMode = () => {
    document.documentElement.dataset.night = String(!night);
    try { localStorage.setItem('jangwon-night-mode', String(!night)); } catch {}
    setNight(!night);
  };
  return <div className="field-guide space-y-5 pb-28 animate-fade-in">
    <div className="flex justify-between gap-3">
      <button type="button" className="field-back" onClick={() => onNavigate(state.house === null ? 'start' : 'map')}><ArrowLeft size={17} /> {state.house === null ? '처음으로' : '탐험 지도'}</button>
      <button type="button" className="field-back" aria-pressed={night} onClick={setNightMode}><Moon size={17} /> {night ? '일반 화면' : '어두운 관측 모드'}</button>
    </div>
    <header className="sky-hero">
      <p className="sky-kicker">JANGWON · A NIGHT UNDER THE STARS</p>
      <h1>오늘의 가장 큰 마법은<br /><em>진짜 하늘에 있어요.</em></h1>
      <div className="sky-art" aria-hidden="true"><span className="sky-moon" /><span className="sky-orbit" /><Telescope size={74} strokeWidth={1} /><span className="sky-spark">✦</span></div>
      <p>10월 21일 수요일 · 장원초등학교<br /><strong>19:50–21:00 전문가와 천체관측</strong></p>
      <small>달·행성·별자리 중 당일 관측 가능한 천체를 전문가가 안내합니다. 구름·산·조명에 따라 달라져요.</small>
    </header>
    <div className="sky-tabs" role="tablist" aria-label="현장 천문 안내">
      {[['observe','관측 준비'],['learn','자료·영상'],['record','관측 기록'],['event','행사 안내']].map(([id,label]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} onClick={() => { setTab(id); setPlaying(false); }}>{label}</button>)}
    </div>
    <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-4">
    {tab === 'observe' && <>
      <ObservationSessions grade={state.grade} />
      <div className="field-quote"><CharacterFace speaker="덤블도어" size={64} framed /><p>마지막 별빛은 상자 안에 없습니다.<br /><b>고개를 들어 하늘을 바라보세요.</b></p></div>
      <div className="field-paper"><span className="field-eyebrow">관측 부스로 가기 전 · 3가지 약속</span><ol className="field-steps"><li><b>화면 밝기를 낮춰요</b><span>눈이 어둠에 익숙해질 시간을 주세요. 플래시를 끄고 잠깐 휴대폰을 내려놓아요.</span></li><li><b>보호자와 줄을 서요</b><span>운동장 관측 부스에서 전문가를 만나요. 망원경을 잡거나 돌리지 않아요.</span></li><li><b>한쪽 눈으로 천천히</b><span>접안렌즈에 눈을 가까이 대요. 안 보이면 전문가에게 높이와 초점을 부탁해요.</span></li></ol></div>
      <button type="button" className="field-primary" onClick={() => onNavigate(state.house === null ? 'enroll' : 'observatory')}><Telescope size={20} /> {state.house === null ? '이름을 등록하고 별자리 연습하기' : '별자리 지도 · 별 잇기 연습'} <ArrowUpRight size={19} /></button>
      <p className="field-muted">미션과 게임을 모두 마치지 않아도 천체관측에 참여할 수 있어요. 낮의 태양 관측은 전문가가 준비한 태양관측 전용 필터와 지도 아래에서만 진행해요.</p>
    </>}
    {tab === 'learn' && <>
      <h2 className="field-heading">미리 만나고, 직접 발견해요</h2>
      {OBSERVING_CARDS.map(c => <details key={c.id} className="field-learning"><summary><span className="field-object">{c.icon}</span><span><small>{c.tag}</small><b>{c.title}</b></span><span className="field-plus">＋</span></summary><div className="field-learning-body"><p><b>보기 전 생각</b>{c.before}</p><p><b>관찰할 곳</b>{c.look}</p><p><b>함께 나누기</b>{c.after}</p>{c.source ? <a href={c.source} target="_blank" rel="noopener noreferrer">{c.credit} ↗</a> : <button type="button" className="field-back" onClick={() => onNavigate(state.house === null ? 'enroll' : 'observatory')}>{c.credit} →</button>}</div></details>)}
      <h2 className="field-heading pt-3">구름이 끼어도, 우주 여행</h2>
      {SKY_VIDEOS.map(v => <article key={v.id} className="field-video"><div className="field-video-frame">{playing && online ? <iframe title={v.title} src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button type="button" onClick={() => online ? setPlaying(true) : onShowToast('인터넷이 연결되면 영상을 볼 수 있어요. 아래 관측 카드는 계속 읽을 수 있어요.')}><span className="video-moon" /><Play size={44} fill="currentColor" /><span>{online ? '달 여행 영상 재생' : '영상은 인터넷 연결이 필요해요'}</span></button>}</div><div className="p-4 space-y-2"><span className="field-eyebrow">{v.duration} · NASA 공식 영상</span><h3>{v.title}</h3><p>{v.lead}</p><div className="flex flex-wrap gap-3"><a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer">재생이 안 되면 YouTube로 ↗</a><a href={v.source} target="_blank" rel="noopener noreferrer">원본 자료 ↗</a></div><small>{v.credit}</small></div></article>)}
    </>}
    {tab === 'record' && <>
      <div className="field-paper"><h2>망원경 너머에서 만난 것</h2><p>정답은 없어요. 눈으로 본 것과 궁금한 것을 남겨요. 가족이 대신 적어도 돼요.</p>
        {state.house === null ? <button type="button" className="field-primary mt-4" onClick={() => onNavigate('enroll')}>이름 등록하고 기록 남기기 →</button> : <form className="space-y-4 mt-5" onSubmit={e => { e.preventDefault(); if (!note.trim()) { onShowToast('본 것 또는 궁금한 것을 한 문장 적어 주세요.'); return; } onUpdateState({ fieldObservation: { target, note: note.trim(), recordedAt: new Date().toISOString() } }); onShowToast('관측 기록을 기기에 저장했어요. 클라우드 백업 상태는 지도에서 확인하세요.'); }}>
        <label className="block">오늘 관찰한 대상<select aria-label="오늘 관찰한 대상" value={target} onChange={e => setTarget(e.target.value)}>{['달','토성','카시오페이아','다른 별·행성','구름 때문에 영상으로 관찰'].map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="block">내가 발견한 모습<textarea aria-label="내가 발견한 모습" value={note} maxLength={1000} rows={4} onChange={e => setNote(e.target.value)} placeholder="예: 달의 밝고 어두운 경계에 울퉁불퉁한 그림자가 보였어요." /></label><small>{note.length}/1000</small><button type="submit" className="field-primary"><Check size={19} /> 관측 기록 저장</button>{state.fieldObservation && <p className="field-saved">✓ 마지막 저장: {new Date(state.fieldObservation.recordedAt).toLocaleString('ko-KR', { timeZone:'Asia/Seoul' })}</p>}</form>}
      </div><p className="field-muted">이 기록은 실제 관측 또는 영상 관찰에 대한 메모입니다. 부스 완료나 실물 이용권을 자동 지급하지 않아요.</p>
    </>}
    {tab === 'event' && <>
      <FestivalGuide />
      <h2 className="field-heading">우리 가족의 별빛 시간표</h2><p className="field-muted">2026. 10. 21.(수) · 17:00–21:00<br />기상·현장 상황에 따라 운영진 안내가 우선합니다.</p>
      <ol className="field-timeline">{FIELD_SCHEDULE.map(([time,title,desc]) => <li key={time}><time>{time}</time><div><b>{title}</b><span>{desc}</span></div></li>)}</ol>
      <div className="field-paper"><h2>도움이 필요할 때</h2><p><b>운영본부 = 의상대여 장소</b><br />응급 상황은 운영본부의 보건 선생님께 바로 알려 주세요.</p><ul className="field-safety"><li>보호자와 함께 이동하고 운동장을 벗어나지 않아요.</li><li>UV 램프는 사람의 눈·얼굴·피부에 비추지 않아요.</li><li>음식을 먹을 때는 대여 망토를 벗어요. 의상과 소품을 소중히 다뤄요.</li><li>1층 도서관은 개방하지 않아요. 화장실 이용 시 안내된 실내화·덧신을 신어요.</li><li>현장 접수는 가능하며 의상은 수량·사이즈에 따라 대여가 제한될 수 있어요.</li></ul><a className="field-back" href="tel:0335411060">학교 연락처 033-541-1060</a></div>
    </>}
    </section>
  </div>;
}
