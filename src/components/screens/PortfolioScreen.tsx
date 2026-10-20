import React, { useEffect, useRef, useState } from 'react';
import { getEvidence } from '../../services/evidenceDb';
import { PHOTO_MISSIONS } from '../../data/photoMissions';
import { DriveSubmissionPanel } from '../DriveSubmissionPanel';
import { portfolioFileName } from '../../services/driveSubmission';
import { classroomLabel, fullSchoolName, normalizeClassroom } from '../../services/participantInfo';
import { buildPortfolioPdf, saveBlob, shareBlob, canShareFiles } from '../../services/pdfExport';
import { ParticipantState } from '../../types';
import { HOUSES, getMissions, getOrderedMissions } from '../../data/storyData';
import { getMissionNumber } from '../../data/standardMissions';
import { ArrowLeft, Printer, Heart, Sparkles, Download, Share2, ExternalLink } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onShowToast: (msg: string) => void;
}

export const PortfolioScreen: React.FC<Props> = ({
  state,
  onUpdateState,
  onNavigate,
  onShowToast
}) => {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [quizPhotos, setQuizPhotos] = useState<Record<number, string>>({});
  const [photosReady, setPhotosReady] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const busyLock = useRef(false);
  const activeUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  const fileName = portfolioFileName(state);
  const photoKey = JSON.stringify([state.participantId, state.experienceMode, ...PHOTO_MISSIONS.map((_, i) => [state.records[i]?.evidenceId, state.records[i]?.quizActivityEvidenceId, state.records[i]?.quizActivityConfirmedAt])]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (activeUrl.current) URL.revokeObjectURL(activeUrl.current); };
  }, []);
  useEffect(() => {
    let alive = true;
    setPhotos({}); setQuizPhotos({}); setPhotosReady(false); setPhotoError(false);
    const activityMissions = getMissions(state.experienceMode);
    Promise.all(PHOTO_MISSIONS.map(async (_, i) => {
      const id = state.records[i]?.evidenceId;
      const item = id ? await getEvidence(id) : null;
      const extraId = activityMissions[i].zepActivity?.separatePhoto ? state.records[i]?.quizActivityEvidenceId : null;
      const extra = extraId ? await getEvidence(extraId) : null;
      return {
        id: i,
        photo: item && item.participantId === state.participantId && item.mission === i && item.kind !== 'zep_quiz' && item.activitySlot !== 'quiz' ? item.jpeg : null,
        quiz: extra && extra.participantId === state.participantId && extra.mission === i && extra.kind === 'activity' && extra.activitySlot === 'quiz' && extra.authorized ? extra.jpeg : null,
      };
    })).then(items => {
      if (!alive) return;
      setPhotos(Object.fromEntries(items.filter(item => item.photo).map(item => [item.id, item.photo!])));
      setQuizPhotos(Object.fromEntries(items.filter(item => item.quiz).map(item => [item.id, item.quiz!])));
      setPhotosReady(true);
    }).catch(() => { if (alive) { setPhotoError(true); setPhotosReady(true); } });
    return () => { alive = false; };
  }, [photoKey]);
  useEffect(() => {
    if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    activeUrl.current = null; setPdfUrl(null);
  }, [state, photos, quizPhotos]);
  const changeBusy = (value: boolean) => { busyLock.current = value; setPdfBusy(value); };
  const makePdf = async (): Promise<Blob | null> => {
    if (!state.school || state.school === '기타') throw new Error('PDF에 사용할 학교 이름을 확인해 주세요.');
    if (/^[1-6]학년$/.test(state.grade || '') && !/^[1-9]\d?$/.test(normalizeClassroom(state.classroom))) throw new Error('PDF에 사용할 반을 입력해 주세요.');
    if (!photosReady || photoError) throw new Error('기기 사진을 읽지 못했어요. 화면을 다시 열어 주세요.');
    const root = document.getElementById('portfolio-printable-document');
    if (!root) return null;
    const blob = await buildPortfolioPdf(root);
    if (!mounted.current) return null;
    if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    activeUrl.current = URL.createObjectURL(blob);
    setPdfUrl(activeUrl.current);
    return blob;
  };
  const handleSavePdf = async () => {
    if (busyLock.current) return;
    changeBusy(true);
    try {
      const blob = await makePdf();
      if (!blob) return;
      const r = await saveBlob(blob, fileName);
      if (r === 'saved' || r === 'downloaded') onShowToast('PDF 파일을 저장했어요! 다운로드(파일) 폴더를 확인해 주세요.');
      else if (r === 'declined') onShowToast('저장을 취소했어요.');
      else onShowToast('아래 [PDF 열어 보기]나 [공유하기]를 이용해 주세요.');
    } catch (error) { onShowToast(error instanceof Error ? error.message : 'PDF를 만들지 못했어요. 잠시 후 다시 눌러 주세요.'); }
    finally { if (mounted.current) changeBusy(false); }
  };
  const handleSharePdf = async () => {
    if (busyLock.current) return;
    changeBusy(true);
    try {
      // Always regenerate so the latest reflection and photos are included.
      const blob = await makePdf();
      if (blob && !await shareBlob(blob, fileName)) onShowToast('이 기기에서는 공유하기를 쓸 수 없어요. [PDF 저장하기]를 이용해 주세요.');
    } catch { onShowToast('PDF를 만들지 못했어요. 잠시 후 다시 눌러 주세요.'); }
    finally { if (mounted.current) changeBusy(false); }
  };

  const house = state.house !== null ? HOUSES[state.house] : HOUSES[0];
  const reflections = state.reflection || {};
  const missions = getOrderedMissions(state.experienceMode);

  const handleReflectionChange = (key: 'favorite' | 'learned' | 'family', val: string) => {
    onUpdateState({
      reflection: {
        ...reflections,
        [key]: val
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) {
      return new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? '완료 인증'
      : d.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center print:hidden">
        <button
          type="button"
          onClick={() => onNavigate(state.experienceMode === 'junior' ? 'map' : 'ending')}
          disabled={pdfBusy}
          className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {state.experienceMode === 'junior' ? '별빛 지도' : '별밤 엔딩'}
        </button>

        <button
          type="button"
          onClick={handleSavePdf}
          disabled={pdfBusy || !photosReady || photoError}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] text-[#20170a] font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          <span>{pdfBusy ? 'PDF 만드는 중…' : 'PDF 저장하기'}</span>
        </button>
      </div>

      <div className="space-y-1 print:hidden">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          ALL STARS COLLECTED · PORTFOLIO
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          우리 가족의 별빛 탐험 포트폴리오
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          일곱 부스에서의 배움과 소감을 모아 활동 사진과 함께 A4 3쪽 완성 기록으로 인쇄·저장할 수 있어요.
        </p>
      </div>

      <details className="print:hidden rounded-2xl border border-[#a1ddd5]/30 bg-[#102039] p-4 text-[#dce9ed]" open={!state.classroom || state.school === '기타'}>
        <summary className="cursor-pointer font-bold text-sm">저장할 학생 정보 확인 · 수정</summary>
        <div className="space-y-3 mt-3">
          <label className="block text-sm" htmlFor="pdf-school">학교 이름<input id="pdf-school" maxLength={40} value={state.school || ''} disabled={pdfBusy} onChange={e=>onUpdateState({school:e.target.value})} className="block mt-1 w-full min-h-[48px] rounded-lg border border-[#3b5985] bg-[#09182a] px-3 text-base" /></label>
          <label className="block text-sm" htmlFor="pdf-classroom">반<input id="pdf-classroom" maxLength={20} value={state.classroom || ''} disabled={pdfBusy} inputMode={/^[1-6]학년$/.test(state.grade||'')?'numeric':'text'} onChange={e=>onUpdateState({classroom:e.target.value})} placeholder="예: 2반이면 2" className="block mt-1 w-full min-h-[48px] rounded-lg border border-[#3b5985] bg-[#09182a] px-3 text-base" /></label>
          <p className="text-xs leading-relaxed text-[#aebed3]">입학 정보의 학교·학년·반·이름을 사용해요. 기존에 반을 입력하지 않았다면 여기서 추가해 주세요.</p>
        </div>
      </details>
      <p className="print:hidden text-xs text-[#d8c7a7] break-all" data-pdf-filename>파일 이름: {fileName}</p>

      {/* Reflection Edit Inputs (Hidden during Print) */}
      <div className="rounded-2xl border-2 border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#eed4a4] to-[#deb87a] p-5 text-[#2d2215] shadow-xl space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-[#7f511c]">
          <Heart className="w-4 h-4" />
          <span>우리 가족의 한 줄 소감 남기기 (PDF에 함께 수록됩니다)</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="ref-fav" className="block text-xs font-bold text-[#2e1f10]">
              1. 오늘 가장 기억에 남는 순간
            </label>
            <textarea
              id="ref-fav"
              disabled={pdfBusy}
              rows={2}
              maxLength={500}
              value={reflections.favorite || ''}
              onChange={e => handleReflectionChange('favorite', e.target.value)}
              placeholder="예: 가족과 함께 카시오페이아 별자리를 W 모양으로 이었던 순간이 가장 즐거웠어요."
              className="w-full p-2.5 rounded-lg bg-[#fff8ea] border border-[#b59564] text-[#2c1d0f] placeholder:text-[#9c8469] text-xs focus:outline-none focus:ring-1 focus:ring-[#845b23]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="ref-learn" className="block text-xs font-bold text-[#2e1f10]">
              2. 오늘 새롭게 알게 된 것
            </label>
            <textarea
              id="ref-learn"
              disabled={pdfBusy}
              rows={2}
              maxLength={500}
              value={reflections.learned || ''}
              onChange={e => handleReflectionChange('learned', e.target.value)}
              placeholder="예: 토성의 고리가 얼음과 암석으로 되어 있다는 것과, 버려진 상자가 멋진 소품이 될 수 있다는 걸 배웠어요."
              className="w-full p-2.5 rounded-lg bg-[#fff8ea] border border-[#b59564] text-[#2c1d0f] placeholder:text-[#9c8469] text-xs focus:outline-none focus:ring-1 focus:ring-[#845b23]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="ref-fam" className="block text-xs font-bold text-[#2e1f10]">
              3. 가족에게 전하고 싶은 말
            </label>
            <textarea
              id="ref-fam"
              disabled={pdfBusy}
              rows={2}
              maxLength={500}
              value={reflections.family || ''}
              onChange={e => handleReflectionChange('family', e.target.value)}
              placeholder="예: 함께 손잡고 일곱 부스를 찾아다녀 준 가족들 고마워요. 사랑해요!"
              className="w-full p-2.5 rounded-lg bg-[#fff8ea] border border-[#b59564] text-[#2c1d0f] placeholder:text-[#9c8469] text-xs focus:outline-none focus:ring-1 focus:ring-[#845b23]"
            />
          </div>
        </div>

        <p className="text-[11px] text-[#6d5538]">
          소감 내용은 기기에 자동 저장되며 아래 포트폴리오 미리보기와 인쇄본에 즉시 반영됩니다.
        </p>
      </div>

      {/* ============================================================== */}
      {/* 3-PAGE A4 PRINTABLE PORTFOLIO CONTAINER (White background, light ink) */}
      {/* ============================================================== */}
      <div id="portfolio-printable-document" className="space-y-8 print:space-y-0">
        {/* PAGE 1: Achievement & Footprint */}
        <section className="bg-[#fffdf8] text-[#273349] p-7 rounded-2xl border border-[#c8aa70] shadow-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[275mm] print:break-after-page space-y-5">
          <div className="border-b-2 border-[#d8c59e] pb-4">
            <div className="text-[10px] tracking-widest text-[#8a6329] uppercase font-bold">
              2026 JANGWON STARLIGHT SCHOOL
            </div>
            <h1 className="font-serif text-3xl font-black text-[#26354c] tracking-tight mt-1">
              우리 가족의<br />별빛 탐험 포트폴리오
            </h1>
            <p className="text-xs text-[#647087] mt-1">
              일곱 부스의 배움을 모아 완성한 어린 마법사의 성장 기록
            </p>
          </div>

          {/* Student Profile Row */}
          <div className="flex items-center gap-4 py-3 border-b border-[#d8c59e]">
            <div className="w-20 h-26 rounded-lg overflow-hidden border border-[#bfa577] bg-[#eee4d0] shrink-0 flex items-center justify-center">
              {state.photo ? (
                <img
                  src={state.photo}
                  alt={`${state.name} 입학 사진`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-serif" style={{ color: house.color }}>
                  {house.symbol}
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <h2 className="font-serif text-2xl font-bold text-[#1f2d42]">
                {state.name}
              </h2>
              <p className="font-semibold" style={{ color: house.color }}>
                {house.name} · {house.animal} ({house.trait})
              </p>
              <p className="text-[#55637a]">
                함께한 가족: {state.family || '가족'}
              </p>
              <p className="text-[#55637a]">
                {fullSchoolName(state.school)} · {state.grade} {classroomLabel(state.classroom)} · 부스 완수: {new Set(state.completed).size} / 7 개 달성 · {formatDate(state.finishedAt)}
              </p>
            </div>
          </div>

          {/* Praise Block */}
          <div className="p-4 rounded-xl bg-[#f5e9d2] border-l-4 border-[#a27936] text-xs leading-relaxed space-y-1">
            <h3 className="font-serif font-bold text-sm text-[#2c1d09]">
              참 잘했어요, {state.name}!
            </h3>
            <p className="text-[#453624]">
              관찰, 탐구, 추리, 정보 탐색, 표현, 창의, 협력. 일곱 부스를 끝까지 해낸 끈기, 새로운 우주와 자연을 탐구한 호기심, 가족과 함께 머리를 맞대고 나눈 따뜻한 마음이 오늘 별지도를 환하게 밝혔어요.
              당신은 장원 별밤마법학교의 자랑스러운 별빛 탐험가입니다.
            </p>
          </div>

          {/* 7 Missions Footprint List */}
          <div className="space-y-2">
            <h3 className="font-serif text-sm font-bold text-[#26354c] border-b border-[#ddd3be] pb-1">
              일곱 배움의 발자취
            </h3>

            <div className="divide-y divide-[#e3d8c2] text-xs">
              {missions.map((m, i) => {
                const rec = state.records?.[m.id];
                return (
                  <div key={m.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-[#9b752f] text-xs shrink-0 mt-0.5">
                        0{i + 1}
                      </span>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[#233145] text-xs">
                          {m.lessonName} · {m.title} <span className="text-[#9b752f]">({m.starlight})</span>
                        </h4>
                        <p className="text-[11px] text-[#606e84]">
                          {m.place} · {m.speakers.join('·')} · <span className="font-medium text-[#795a28]">{m.unlockedClueTitle}</span>
                        </p>
                        {rec?.userNote && (
                          <p className="text-[11px] text-[#29684c] italic">
                            기록: {rec.userNote}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-[#276e4c] bg-[#e6f4ed] px-2 py-0.5 rounded">
                        {state.completed.includes(m.id) ? '완수 인증 ✓' : '아직 참여 전'}
                      </span>
                      <p className="text-[9px] text-[#7d8c9e] mt-0.5">
                        {formatDate(rec?.completedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="pt-4 border-t border-[#d8c59e] text-center text-[10px] text-[#7a735f]">
            장원 별밤학교 · 1 / 3
          </div>
        </section>

        {/* PAGE 2: Reflections & Celestial Invitation */}
        <section className="bg-[#fffdf8] text-[#273349] p-7 rounded-2xl border border-[#c8aa70] shadow-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[275mm] space-y-6">
          <div className="border-b-2 border-[#d8c59e] pb-4">
            <div className="text-[10px] tracking-widest text-[#8a6329] uppercase font-bold">
              MY STARLIGHT STORY
            </div>
            <h1 className="font-serif text-3xl font-black text-[#26354c] tracking-tight mt-1">
              별빛이 남긴 이야기
            </h1>
            <p className="text-xs text-[#647087] mt-1">
              체험 부스에서 배운 것과 우리 가족이 함께 만든 소중한 기억
            </p>
          </div>

          {/* 3 Reflection Paragraphs */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#ded0b2] bg-[#fffaf0] space-y-1.5">
              <h3 className="font-serif text-sm font-bold text-[#715324]">
                1. 가장 기억에 남는 순간
              </h3>
              <p className="text-xs text-[#3d2e1c] leading-relaxed whitespace-pre-wrap">
                {reflections.favorite || '아직 작성하지 않았어요. 오늘의 가장 빛났던 순간을 우리 가족의 말로 남겨보세요.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#ded0b2] bg-[#fffaf0] space-y-1.5">
              <h3 className="font-serif text-sm font-bold text-[#715324]">
                2. 오늘 새롭게 알게 된 것
              </h3>
              <p className="text-xs text-[#3d2e1c] leading-relaxed whitespace-pre-wrap">
                {reflections.learned || '아직 작성하지 않았어요. 별자리, 행성, 책, AI 그림책, AI 체험부스 등 새롭게 배운 점을 적어보세요.'}
              </p>
            </div>

            {state.observatory?.customConstellation && (
              <div className="p-4 rounded-xl border border-[#c5a666] bg-[#f9f3e5] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#805a22]">
                  <Sparkles className="w-4 h-4 text-[#d97706]" />
                  <span>별빛 관측실에서 완성한 나만의 성좌: {state.observatory.customConstellation.name}</span>
                </div>
                <p className="text-xs text-[#3d2e1c] leading-relaxed italic">
                  “{state.observatory.customConstellation.story}”
                </p>
                <p className="text-[10px] text-[#786a54]">
                  (별 {state.observatory.customConstellation.stars.length}개 · 연결선 {state.observatory.customConstellation.lines.length}개로 완성된 도계의 가족 별자리)
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl border border-[#ded0b2] bg-[#fffaf0] space-y-1.5">
              <h3 className="font-serif text-sm font-bold text-[#715324]">
                3. 가족에게 전하고 싶은 말
              </h3>
              <p className="text-xs text-[#3d2e1c] leading-relaxed whitespace-pre-wrap">
                {reflections.family || '아직 작성하지 않았어요. 오늘 밤 함께 걸어준 가족에게 따뜻한 고마움을 표현해 보세요.'}
              </p>
            </div>
          </div>

          {/* Starlight Finale Climax Box */}
          <div className="p-6 rounded-2xl bg-[#f5e9d2] border-2 border-[#caa45d] text-center space-y-2">
            <div className="text-3xl text-[#ad8134]">✦</div>
            <h3 className="font-serif text-base font-black text-[#261708] leading-snug">
              마지막 별빛은 상자 안에 없습니다.<br />
              고개를 들어 하늘을 바라보세요.
            </h3>
            <p className="text-xs text-[#4c3924] leading-relaxed">
              일곱 부스의 배움 기록을 모두 모아 천체관측 부스로 향하는 공식 초대장을 받았습니다.<br />
              가족과 함께 올려다볼 진짜 밤하늘과 별빛이 오늘 밤의 마지막 이야기입니다.
            </p>
          </div>

          {/* Page 2 Footer */}
          <div className="pt-6 border-t border-[#d8c59e] text-center text-[10px] text-[#7a735f]">
            장원 별밤 마법학교 · 우리 가족의 별빛 탐험 포트폴리오 · 2 / 3
          </div>
        </section>
        <section className="bg-[#fffdf8] text-[#273349] p-5 rounded-2xl border border-[#c8aa70] shadow-2xl print:shadow-none print:border-none print:break-before-page space-y-4">
          <header className="border-b-2 border-[#d8c59e] pb-3">
            <p className="text-[10px] tracking-widest text-[#8a6329] font-bold">OUR FAMILY PHOTO MEMORIES</p>
            <h2 className="font-serif text-2xl font-bold mt-1">사진으로 모은 일곱 별빛</h2>
            <p className="text-xs text-[#647087] mt-1">{fullSchoolName(state.school)} {state.grade} {classroomLabel(state.classroom)} · {state.name} · 가족과 함께한 오늘</p>
          </header>
          <div className="grid grid-cols-2 gap-3">
            {missions.map((mission, i) => <figure key={mission.id} className="rounded-xl border border-[#ded0b2] p-2 bg-[#fffaf0] break-inside-avoid">
              {photos[mission.id] ? <img src={photos[mission.id]} alt={`${i + 1}. ${mission.title} 인증샷`} className="w-full h-[150px] object-contain rounded-md bg-[#eee4d0]" /> : <div className="h-[150px] flex items-center justify-center text-xs text-[#786a54] bg-[#eee4d0] rounded-md">{!photosReady ? '사진 읽는 중…' : '이 기기에 보관된 사진이 없어요'}</div>}
              <figcaption className="text-xs font-bold mt-2">{i + 1}. {mission.title}</figcaption>
              <p className="text-[10px] text-[#606e84] mt-1 leading-relaxed">{mission.photoTip}</p>
            </figure>)}
            {missions.filter(m => m.zepActivity?.separatePhoto && quizPhotos[m.id]).map(m => <figure key={`quiz-${m.id}`} data-extra-quiz-photo className="rounded-xl border border-[#ded0b2] p-2 bg-[#fffaf0] break-inside-avoid">
              <img src={quizPhotos[m.id]} alt={`${m.zepActivity!.title} 활동 인증샷`} className="w-full h-[150px] object-contain rounded-md bg-[#eee4d0]" />
              <figcaption className="text-xs font-bold mt-2">{String(getMissionNumber(m.id, state.experienceMode)).padStart(2, '0')} 추가 · {m.zepActivity!.title}</figcaption>
              <p className="text-[10px] text-[#606e84] mt-1 leading-relaxed">{m.zepActivity!.photoTip}</p>
            </figure>)}
          </div>
          <footer className="border-t border-[#d8c59e] pt-3 text-center text-[10px] text-[#7a735f]">장원 별밤학교 · {state.name}의 사진 기록 · 3 / 3</footer>
        </section>
      </div>

      {photoError && <p role="alert" className="print:hidden text-sm text-amber-200">사진 저장소를 읽지 못했어요. 같은 브라우저에서 화면을 다시 열어 주세요.</p>}
      <DriveSubmissionPanel state={state} makePdf={makePdf} busy={pdfBusy} onBusyChange={changeBusy} photoCount={photosReady && !photoError ? Object.keys(photos).length : 0} additionalPhotoCount={photosReady && !photoError ? Object.keys(quizPhotos).length : 0} />
      <div className="print:hidden pt-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={pdfBusy || !photosReady || photoError}
            className="w-full min-h-[56px] px-6 py-3.5 rounded-xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-lg hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            <span>{pdfBusy ? 'PDF 만드는 중… (몇 초 걸려요)' : '포트폴리오 PDF 저장하기'}</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            {canShareFiles() && (
              <button
                type="button"
                onClick={handleSharePdf}
                disabled={pdfBusy || !photosReady || photoError}
                className="min-h-[46px] rounded-xl text-sm font-bold text-[#f6ebd5] bg-[#1d3356] border border-[#3b5985] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> 공유하기
              </button>
            )}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[46px] rounded-xl text-sm font-bold text-[#f6ebd5] bg-[#1d3356] border border-[#3b5985] flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> PDF 열어 보기
              </a>
            )}
            <button
              type="button"
              onClick={handlePrint}
              disabled={pdfBusy || !photosReady || photoError}
              className="min-h-[46px] rounded-xl text-sm font-bold text-[#cbd8eb] bg-[#102038] border border-[#2b446a] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> 인쇄하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
