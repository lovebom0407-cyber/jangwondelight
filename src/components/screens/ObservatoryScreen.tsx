import {ConstellationSources} from '../ConstellationSources';
import { alertDialog } from '../DialogHost';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Compass,
  Star,
  RotateCcw,
  Undo2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
  Eye,
  CheckCircle2,
  Info,
  Maximize2,
  PenTool,
  Save,
  Trash2,

} from 'lucide-react';
import { ParticipantState, CustomConstellationData } from '../../types';
import { CharacterAvatar } from '../characterAssets';
import { CharacterName } from '../../types';
import {
  CONSTELLATIONS,
  ConstellationDef,
  DOGYE_LOCATION,
  DEFAULT_OBSERVATION_TIME_STR,
  calculateObservationStatus,
  calculateLST,
  calculateStarPosition
} from '../../services/celestialMath';

interface ObservatoryScreenProps {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onBackToMap: () => void;
  onOpenStation?: (missionIndex: number) => void;
}

type ObservatoryTab = 'puzzle' | 'skymap' | 'encyclopedia' | 'custom';

export const ObservatoryScreen: React.FC<ObservatoryScreenProps> = ({
  state,
  onUpdateState,
  onBackToMap,
  onOpenStation
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<ObservatoryTab>('puzzle');

  // Constellation selection (Default to Cassiopeia, the primary festival target!)
  const [selectedConstellationId, setSelectedConstellationId] = useState<string>('cassiopeia');
  const activeConstellation = useMemo(() => {
    return CONSTELLATIONS.find(c => c.id === selectedConstellationId) || CONSTELLATIONS[0];
  }, [selectedConstellationId]);

  // Dialogue state
  const [showGuideDialogue, setShowGuideDialogue] = useState<boolean>(true);
  const [dialogueStep, setDialogueStep] = useState<number>(0);

  // Puzzle State
  // userLines: array of [startIndex, endIndex]
  const [userLines, setUserLines] = useState<[number, number][]>([]);
  const [selectedStarIndex, setSelectedStarIndex] = useState<number | null>(null);
  const [hoverStarIndex, setHoverStarIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDragPos, setCurrentDragPos] = useState<{ x: number; y: number } | null>(null);

  // View Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Observation Time Controls (Default: 2026-10-21 20:00 KST in Dogye)
  const [observationDate, setObservationDate] = useState<string>('2026-10-21');
  const [observationHour, setObservationHour] = useState<number>(20); // 19, 20, 21

  // Custom Constellation Creator State
  const [customStars, setCustomStars] = useState<{ x: number; y: number; name?: string }[]>([]);
  const [customLines, setCustomLines] = useState<[number, number][]>([]);
  const [customSelectedStar, setCustomSelectedStar] = useState<number | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customStory, setCustomStory] = useState<string>('');
  const [customSavedSuccess, setCustomSavedSuccess] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Completed constellations from state
  const completedConstellations = useMemo(() => {
    return (state.observatory?.completedConstellations || []).filter(id => CONSTELLATIONS.some(c => c.id === id));
  }, [state.observatory?.completedConstellations]);

  const allConstellationsCompleted = useMemo(() => {
    return CONSTELLATIONS.every(c => completedConstellations.includes(c.id));
  }, [completedConstellations]);

  // Load existing custom constellation if available
  useEffect(() => {
    if (state.observatory?.customConstellation) {
      const c = state.observatory.customConstellation;
      setCustomStars(c.stars || []);
      setCustomLines(c.lines || []);
      setCustomName(c.name || '');
      setCustomStory(c.story || '');
    }
  }, [state.observatory?.customConstellation]);

  // Clear puzzle state in the same render as a new constellation. An effect
  // runs too late: old star indices can exceed the new constellation's size.
  const selectConstellation = (id: string) => {
    if (id === selectedConstellationId) return;
    setZoomLevel(1);
    setUserLines([]);
    setSelectedStarIndex(null);
    setHoverStarIndex(null);
    setDragStartPos(null);
    setCurrentDragPos(null);
    setCelebrationMessage(null);
    setSelectedConstellationId(id);
  };

  // Current real observation date object
  const observationDateTime = useMemo(() => {
    const [y, m, d] = observationDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, observationHour - 9, 0, 0)); // KST is UTC+9
    return date;
  }, [observationDate, observationHour]);
  const cassiopeiaNow = useMemo(
    () => calculateObservationStatus(CONSTELLATIONS.find(c => c.id === 'cassiopeia')!, observationDateTime, DOGYE_LOCATION),
    [observationDateTime]
  );
  // Calculate real observation status for active constellation
  const observationStatus = useMemo(() => {
    return calculateObservationStatus(activeConstellation, observationDateTime, DOGYE_LOCATION);
  }, [activeConstellation, observationDateTime]);

  // Check if current puzzle is completed
  const isCurrentPuzzleSolved = useMemo(() => {
    const targetLines = activeConstellation.lines;
    if (userLines.length < targetLines.length) return false;

    // Check if every target line is present in userLines (order-independent)
    return targetLines.every(([a, b]) => {
      return userLines.some(([ua, ub]) => (ua === a && ub === b) || (ua === b && ub === a));
    });
  }, [activeConstellation, userLines]);

  // Handle puzzle completion
  useEffect(() => {
    if (isCurrentPuzzleSolved && !completedConstellations.includes(activeConstellation.id)) {
      const updated = Array.from(new Set([...(state.observatory?.completedConstellations || []), activeConstellation.id]));
      onUpdateState({
        observatory: {
          ...(state.observatory || { completedConstellations: [] }),
          completedConstellations: updated,
          lastViewedConstellation: activeConstellation.id
        }
      });
      setCelebrationMessage(`축하합니다! [${activeConstellation.koreanName}]를 완벽하게 연결하여 도감에 등록되었습니다!`);
    }
  }, [isCurrentPuzzleSolved, activeConstellation, completedConstellations, onUpdateState, state.observatory]);

  // Dialogue scripts
  const dialogueLines = useMemo(() => [
    {
      speaker: '해리',
      text: `어서 와, ${state.name || '별빛 탐험가'}! 여기는 강원도 삼척 도계의 가을 밤하늘을 만나는 [별빛 관측실]이야.`,
      character: 'harry'
    },
    {
      speaker: '덤블도어',
      text: '가을 저녁 북쪽 하늘에서는 W 모양의 [카시오페이아자리]를 찾을 수 있다네. 얼마나 높이 떠 있는지는 [실제 하늘 지도] 탭의 계산값을 확인하게.',
      character: 'dumbledore'
    },
    {
      speaker: '헤르미온느',
      text: '별들을 터치하거나 드래그하여 별자리를 직접 이어보고, 도계읍의 실제 날짜와 시각별 고도와 방위를 확인해 봐!',
      character: 'hermione'
    },
    {
      speaker: '헤르미온느',
      text: '10개 별자리를 모두 완성하면 너만의 성좌를 밤하늘에 새길 수 있어. 자, 카시오페이아부터 시작해 볼까?',
      character: 'hermione'
    }
  ], [state.name]);

  // Star connection handler
  const handleConnectStars = (starA: number, starB: number) => {
    if (starA === starB) return;
    // Check if line already exists
    const exists = userLines.some(([a, b]) => (a === starA && b === starB) || (a === starB && b === starA));
    if (exists) return;

    setUserLines(prev => [...prev, [starA, starB]]);
    setSelectedStarIndex(null);
  };

  const handleStarClick = (index: number) => {
    if (selectedStarIndex === null) {
      setSelectedStarIndex(index);
    } else {
      handleConnectStars(selectedStarIndex, index);
    }
  };

  const handleUndo = () => {
    setUserLines(prev => prev.slice(0, -1));
    setSelectedStarIndex(null);
  };

  const handleReset = () => {
    setUserLines([]);
    setSelectedStarIndex(null);
  };

  // Keyboard accessibility handler for puzzle
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= activeConstellation.stars.length) {
      const idx = num - 1;
      handleStarClick(idx);
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      handleUndo();
    } else if (e.key === 'Escape') {
      setSelectedStarIndex(null);
    }
  };

  // Custom Constellation Handlers
  const handleCustomSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTab !== 'custom') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // If clicking close to an existing star, select it
    const existingIndex = customStars.findIndex(
      s => Math.hypot(s.x - x, s.y - y) < 6
    );

    if (existingIndex !== -1) {
      if (customSelectedStar === null) {
        setCustomSelectedStar(existingIndex);
      } else {
        if (customSelectedStar !== existingIndex) {
          // Connect line
          const already = customLines.some(
            ([a, b]) => (a === customSelectedStar && b === existingIndex) || (a === existingIndex && b === customSelectedStar)
          );
          if (!already) {
            setCustomLines(prev => [...prev, [customSelectedStar, existingIndex]]);
          }
        }
        setCustomSelectedStar(null);
      }
    } else {
      // Add new star
      if (customStars.length >= 12) return;
      const newIndex = customStars.length;
      setCustomStars(prev => [...prev, { x, y, name: `별 ${newIndex + 1}` }]);
      if (customSelectedStar !== null) {
        setCustomLines(prev => [...prev, [customSelectedStar, newIndex]]);
        setCustomSelectedStar(null);
      }
    }
  };

  const handleSaveCustomConstellation = () => {
    if (!customName.trim()) {
      alertDialog('나만의 성좌 이름을 입력해 주세요!');
      return;
    }
    const customData: CustomConstellationData = {
      name: customName.trim(),
      story: customStory.trim() || '내가 만든 밤하늘의 특별한 별자리',
      stars: customStars,
      lines: customLines,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      observatory: {
        ...(state.observatory || { completedConstellations: [] }),
        customConstellation: customData
      }
    });

    setCustomSavedSuccess(true);
    setTimeout(() => setCustomSavedSuccess(false), 3000);
  };

  return (
    <div
      className="min-h-screen bg-[#07111e] text-[#f6ebd5] flex flex-col font-sans pb-16 selection:bg-[#e4bb70]/30"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0a1628]/95 backdrop-blur-md border-b border-[#22395d] px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToMap}
            className="px-3 py-1.5 rounded-lg bg-[#142642] hover:bg-[#1e3860] text-xs font-bold text-[#f1d8a7] flex items-center gap-1 border border-[#315284] transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>지도로 돌아가기</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 pl-2">
            <Sparkles className="w-4 h-4 text-[#ffd880]" />
            <h1 className="font-serif font-bold text-sm tracking-wide text-[#fdf8ed]">별빛 관측실</h1>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1 bg-[#050c17] p-1 rounded-xl border border-[#1b2f4d] overflow-x-auto max-w-full [&>button]:whitespace-nowrap [&>button]:shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('puzzle')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'puzzle'
                ? 'bg-[#cfa55b] text-[#1a1204] shadow-xs'
                : 'text-[#9ab1d1] hover:text-[#f6ebd5]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>별 잇기 훈련</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skymap')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'skymap'
                ? 'bg-[#cfa55b] text-[#1a1204] shadow-xs'
                : 'text-[#9ab1d1] hover:text-[#f6ebd5]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>도계 밤하늘 지도</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('encyclopedia')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'encyclopedia'
                ? 'bg-[#cfa55b] text-[#1a1204] shadow-xs'
                : 'text-[#9ab1d1] hover:text-[#f6ebd5]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>성좌 도감 ({completedConstellations.length}/{CONSTELLATIONS.length})</span>
          </button>

          {allConstellationsCompleted && (
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-gradient-to-r from-[#ffd880] to-[#f39c12] text-[#1a1204] shadow-xs'
                  : 'text-[#ffd880] hover:text-[#fff]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>나만의 성좌</span>
            </button>
          )}
        </div>
      </header>

      {/* Guide Dialogue Floating Banner */}
      {showGuideDialogue && (
        <section className="bg-gradient-to-r from-[#0d1d36] via-[#122849] to-[#0d1d36] border-b border-[#233d66] px-4 py-3 flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="shrink-0 drop-shadow-md">
              <CharacterAvatar speaker={dialogueLines[dialogueStep].speaker as CharacterName} size={52} />
            </div>
            <div className="space-y-0.5 max-w-xl">
              <span className="text-[11px] font-bold text-[#e4bb70]">
                {dialogueLines[dialogueStep].speaker}의 안내:
              </span>
              <p className="text-xs sm:text-sm text-[#f6ebd5] leading-relaxed font-medium">
                {dialogueLines[dialogueStep].text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dialogueStep < dialogueLines.length - 1 ? (
              <button
                type="button"
                onClick={() => setDialogueStep(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-[#e4bb70] hover:bg-[#d8ae5e] text-[#221606] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>다음</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowGuideDialogue(false)}
                className="px-3 py-1.5 rounded-lg bg-[#27406a] hover:bg-[#345385] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                관측 시작하기 ✓
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowGuideDialogue(false)}
              className="px-2 py-1 text-[11px] text-[#8fa7c7] hover:text-[#f6ebd5] transition-colors"
            >
              대화 닫기
            </button>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* TAB 1: STAR CONNECT PUZZLE */}
        {activeTab === 'puzzle' && (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Left: Constellation Selector Carousel */}
            <div className="w-full lg:w-72 bg-[#0d1c31] border border-[#213757] rounded-2xl p-3 space-y-2 shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2e4b]">
                <span className="text-xs font-bold text-[#e4bb70] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  오늘 관측할 10개 별자리
                </span>
                <span className="text-[10px] text-[#8ea7c9]">
                  완성 {completedConstellations.length}/{CONSTELLATIONS.length}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-[#a6c7da]">서쪽 3개 · 가을 하늘 5개 · 북쪽 2개</p>
                {CONSTELLATIONS.map(c => {
                  const isDone = completedConstellations.includes(c.id);
                  const isCurrent = c.id === activeConstellation.id;
                  return (
                    <button
                      key={c.id}
                      data-constellation={c.id}
                      type="button"
                      onClick={() => selectConstellation(c.id)}
                      className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#182f50] border-[#e4bb70] shadow-sm'
                          : 'bg-[#091526] border-[#182942] hover:bg-[#12233c]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-xs text-[#fef9ee]">
                            {c.koreanName}
                          </span>
                          {c.isPrimaryTarget && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#d97706] text-white font-bold">
                              대표 목표
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8ea7c9] block truncate">
                          {c.seasonTag}
                        </span>
                      </div>
                      <div>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-[#718aa8] font-mono">
                            {c.difficulty}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Physical Observation Reminder */}
              <div className="p-2.5 rounded-xl bg-[#091526] border border-[#1d314d] text-[11px] text-[#93aaca] leading-relaxed space-y-1">
                <p className="font-semibold text-[#e4bb70] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  현장 관측 부스 안내:
                </p>
                <p className="text-[10px] text-[#8ea3c2]">
                  * 별 잇기 훈련은 실제 현장 관측 인증을 대신하지 않습니다. 운동장 망원경 부스에서 가을 하늘의 카시오페이아를 직접 찾고 인증샷을 남겨주세요.
                </p>
              </div>
            </div>

            {/* Right: Puzzle Interactive Canvas */}
            <div className="flex-1 w-full bg-[#091424] border border-[#213757] rounded-2xl p-4 flex flex-col gap-3 relative shadow-inner">
              {/* Canvas Toolbar Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1c304d]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-base text-[#fdf8ed]">
                      {activeConstellation.koreanName} ({activeConstellation.englishName})
                    </h2>
                    {completedConstellations.includes(activeConstellation.id) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        도감 등록 완료
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9eb6d6]">
                    별 {activeConstellation.stars.length}개 · 선 {activeConstellation.lines.length}개. 별이나 아래 별 목록을 눌러 이어요.
                  </p>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={userLines.length === 0}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-[#14253e] hover:bg-[#1e365b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#c7d9ee] flex items-center gap-1 border border-[#294269] transition-colors cursor-pointer"
                    title="되돌리기 (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">되돌리기</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={userLines.length === 0}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-[#14253e] hover:bg-[#1e365b] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#c7d9ee] flex items-center gap-1 border border-[#294269] transition-colors cursor-pointer"
                    title="다시시작"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">다시시작</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => (prev >= 3 ? 1 : prev + 0.5))}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-[#14253e] hover:bg-[#1e365b] text-xs font-bold text-[#c7d9ee] flex items-center gap-1 border border-[#294269] transition-colors cursor-pointer"
                    title="확대/축소"
                  >
                    {zoomLevel > 1 ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{Math.round(zoomLevel * 100)}%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-2 min-h-[44px] rounded-lg bg-[#14253e] text-xs font-bold flex items-center gap-1 border border-[#294269] cursor-pointer"
                    title="모든 별 전체 보기"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /><span>전체 보기</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-lg bg-[#14253e] hover:bg-[#1e365b] text-xs font-bold text-[#e4bb70] flex items-center gap-1 border border-[#294269] transition-colors cursor-pointer"
                    title="도움말"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">도움말</span>
                  </button>
                </div>
              </div>

              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs px-1 text-[#8ea7c9]">
                <span>
                  연결된 선: <strong className="text-[#ffd880]">{userLines.length}</strong> / {activeConstellation.lines.length}
                </span>
                <span>
                  {selectedStarIndex !== null
                    ? `[${activeConstellation.stars[selectedStarIndex].name}] 선택됨 → 다음 별을 탭하세요`
                    : '별을 탭하거나 드래그하세요'}
                </span>
              </div>

              {/* Interactive SVG Starfield */}
              <div className="relative w-full aspect-square max-h-[500px] bg-[#040913] rounded-xl overflow-auto border border-[#1b2f4c] shadow-2xl">
                <svg
                  ref={svgRef}
                  viewBox="0 0 100 100"
                  className="block max-w-none select-none cursor-crosshair"
                  style={{
                    width: `${zoomLevel*100}%`, height: `${zoomLevel*100}%`
                  }}
                >
                  <defs>
                    <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffd880" stopOpacity="1" />
                      <stop offset="50%" stopColor="#e5a93b" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#e5a93b" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Reference Guide Lines (Faint dotted guide) */}
                  {activeConstellation.lines.map(([a, b], idx) => {
                    const starA = activeConstellation.stars[a];
                    const starB = activeConstellation.stars[b];
                    return (
                      <line
                        key={`ref-${idx}`}
                        x1={starA.puzzleX}
                        y1={starA.puzzleY}
                        x2={starB.puzzleX}
                        y2={starB.puzzleY}
                        stroke="#223b61"
                        strokeWidth="0.5"
                        strokeDasharray="1,1"
                        strokeOpacity="0.6"
                      />
                    );
                  })}

                  {/* User Connected Lines */}
                  {userLines.map(([a, b], idx) => {
                    const starA = activeConstellation.stars[a];
                    const starB = activeConstellation.stars[b];
                    return (
                      <line
                        key={`user-${idx}`}
                        x1={starA.puzzleX}
                        y1={starA.puzzleY}
                        x2={starB.puzzleX}
                        y2={starB.puzzleY}
                        stroke="#ffd880"
                        strokeWidth="0.8"
                        filter="url(#glow)"
                        className="animate-pulse"
                      />
                    );
                  })}

                  {/* Active Drag line preview */}
                  {selectedStarIndex !== null && hoverStarIndex !== null && selectedStarIndex !== hoverStarIndex && (
                    <line
                      x1={activeConstellation.stars[selectedStarIndex].puzzleX}
                      y1={activeConstellation.stars[selectedStarIndex].puzzleY}
                      x2={activeConstellation.stars[hoverStarIndex].puzzleX}
                      y2={activeConstellation.stars[hoverStarIndex].puzzleY}
                      stroke="#5ce1e6"
                      strokeWidth="0.6"
                      strokeDasharray="1,1"
                    />
                  )}

                  {/* Constellation Stars Nodes */}
                  {activeConstellation.stars.map((star, idx) => {
                    const isSelected = selectedStarIndex === idx;
                    const isHovered = hoverStarIndex === idx;
                    const r = Math.max(0.45, 1.25 - star.mag * 0.12);

                    return (
                      <g
                        key={star.id}
                        data-puzzle-star={idx}
                        role="button"
                        aria-label={star.name}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleStarClick(idx); } }}
                        className="cursor-pointer group"
                        onClick={() => handleStarClick(idx)}
                        onMouseEnter={() => setHoverStarIndex(idx)}
                        onMouseLeave={() => setHoverStarIndex(null)}
                      >
                        {/* Glow halo */}
                        <circle
                          cx={star.puzzleX}
                          cy={star.puzzleY}
                          r={r * 3}
                          fill="url(#starGlow)"
                          opacity={isSelected ? 0.9 : isHovered ? 0.6 : 0.25}
                        />

                        {/* Core star */}
                        <circle
                          cx={star.puzzleX}
                          cy={star.puzzleY}
                          r={r}
                          fill={isSelected ? '#5ce1e6' : '#ffffff'}
                          stroke={isSelected ? '#ffffff' : '#ffd880'}
                          strokeWidth="0.4"
                        />


                      </g>
                    );
                  })}
                </svg>

                {/* Celebration Overlay */}
                {celebrationMessage && (
                  <div className="absolute inset-0 bg-[#071324]/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                    <Sparkles className="w-12 h-12 text-[#ffd880] mb-2 animate-bounce" />
                    <h3 className="font-serif font-bold text-lg text-[#fdf8ed] mb-1">
                      {activeConstellation.koreanName} 완성!
                    </h3>
                    <p className="text-xs text-[#d1e2f6] max-w-sm mb-4 leading-relaxed">
                      {celebrationMessage}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCelebrationMessage(null)}
                        className="px-4 py-2 rounded-xl bg-[#e4bb70] hover:bg-[#d8ae5e] text-[#1c1204] text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        계속 탐색하기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCelebrationMessage(null);
                          setActiveTab('skymap');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#1d3356] hover:bg-[#284572] text-[#f6ebd5] text-xs font-bold transition-all cursor-pointer border border-[#3b5985]"
                      >
                        도계 하늘에서 위치 보기 →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <ConstellationSources constellation={activeConstellation} />
              <details open className="field-learning"><summary>별 이름으로 잇기 · 크게 누르기</summary><div className="p-3 grid grid-cols-2 gap-2">{activeConstellation.stars.map((star,idx)=><button key={star.id} type="button" aria-pressed={selectedStarIndex===idx} onClick={()=>handleStarClick(idx)} className={`min-h-[48px] p-3 rounded-xl text-sm font-bold text-left ${selectedStarIndex===idx?'bg-[#f4d79a] text-[#20170a]':'bg-[#142c48] text-[#dce8f5]'}`}>{idx+1}. {star.name}<small className="block font-normal text-xs">{star.designation} · HIP {star.hip}</small></button>)}</div></details>

              {/* Finding Guide Card */}
              <div className="p-3 rounded-xl bg-[#0d1c31] border border-[#213757] text-xs space-y-1">
                <span className="font-bold text-[#e4bb70] block">
                  ★ 찾는 방법:
                </span>
                <p className="text-[#c8dcf5] leading-relaxed">
                  {activeConstellation.findingGuide}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOGYE REAL SKYMAP & ASTRONOMICAL CALCULATOR */}

        {activeTab === 'skymap' && (
          <div className="space-y-4">
            {/* Observer Location & Time Controller */}
            <div className="p-4 rounded-2xl bg-[#0d1d33] border border-[#233b61] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1f3557]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#ffd880]" />
                  <span className="text-xs font-bold text-[#fef9ee]">
                    관측 위치: {DOGYE_LOCATION.name} (위도 {DOGYE_LOCATION.latitude}°N, 경도 {DOGYE_LOCATION.longitude}°E, 해발 {DOGYE_LOCATION.elevationMeters}m)
                  </span>
                </div>
                <span className="text-[11px] text-[#8fa7c7]">
                  * 위치 권한 요청 없이 학교 근사 좌표로 계산 (대기 굴절 등은 반영하지 않음)
                </span>
              </div>

              {/* Date & Hour Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e4bb70] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    관측 일자:
                  </label>
                  <select
                    value={observationDate}
                    onChange={e => setObservationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#081322] border border-[#264169] text-xs text-[#f6ebd5] focus:outline-hidden focus:border-[#e4bb70]"
                  >
                    <option value="2026-10-19">2026년 10월 19일 (비교용 계산)</option>
                    <option value="2026-10-21">2026년 10월 21일 (행사일 기준)</option>
                    <option value="2026-10-20">2026년 10월 20일 (비교용 계산)</option>
                    <option value="2026-10-22">2026년 10월 22일 (비교용 계산)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e4bb70] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    관측 시각 (KST 저녁):
                  </label>
                  <div className="flex gap-1.5">
                    {[19, 20, 21].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setObservationHour(h)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          observationHour === h
                            ? 'bg-[#cfa55b] text-[#1b1204] shadow-xs'
                            : 'bg-[#081322] border border-[#264169] text-[#a4bbd8] hover:bg-[#12233c]'
                        }`}
                      >
                        {h}:00
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#e4bb70] flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    지방항성시 (LST):
                  </span>
                  <div className="px-3 py-2 rounded-lg bg-[#081322] border border-[#264169] text-xs font-mono text-[#a4e2c6]">
                    LST {calculateLST(observationDateTime, DOGYE_LOCATION.longitude).toFixed(2)}h
                  </div>
                </div>
              </div>
            </div>

            {/* Northern Sky Dome Map Visualization */}
            <div className="p-4 rounded-2xl bg-[#091527] border border-[#233b61] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c304d]">
                <div className="space-y-0.5">
                  <h3 className="font-serif font-bold text-sm text-[#fdf8ed] flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#ffd880]" />
                    도계 전체 밤하늘 지도 · 북·서·남 방향
                  </h3>
                  <p className="text-[11px] text-[#8ea7c9]">
                    천구 좌표(적경·적위)를 도계읍의 위도·경도와 시각에 따라 수평 좌표(고도·방위)로 실시간 계산한 결과입니다.
                  </p>
                </div>
              </div>

              {/* Sky Dome Circular View */}
              <div className="relative w-full max-w-lg mx-auto aspect-square bg-[#040913] rounded-full border-2 border-[#2b4b7a] p-4 flex items-center justify-center overflow-hidden shadow-2xl">
                {/* Horizon and Altitude Circles */}
                <div className="absolute inset-4 rounded-full border border-[#1b345a]/60 pointer-events-none" />
                <div className="absolute inset-12 rounded-full border border-[#1b345a]/40 pointer-events-none" />
                <div className="absolute inset-24 rounded-full border border-[#1b345a]/30 pointer-events-none" />

                {/* Compass Direction Labels */}
                <span className="absolute top-2 text-[10px] font-bold text-[#ffd880]">북 (N: 0°)</span>
                <span className="absolute right-2 text-[10px] font-bold text-[#8fa7c7]">동 (E: 90°)</span>
                <span className="absolute left-2 text-[10px] font-bold text-[#8fa7c7]">서 (W: 270°)</span>

                <span className="absolute bottom-2 text-[10px] font-bold text-[#8fa7c7]">남 (S: 180°)</span>

                {/* Mountain Ridge Mask Indicator at Bottom/Horizon */}
                <div className="absolute inset-[10%] rounded-full border-[22px] border-[#19352b]/25 pointer-events-none" title="주변 고도 15° 이하 산·건물 차폐는 실측이 아닌 가정" />
                {/* Real-time plotted constellations */}
                {CONSTELLATIONS.map(c => {
                  const stat = calculateObservationStatus(c, observationDateTime, DOGYE_LOCATION);
                  const isSelected = c.id === activeConstellation.id;
                  if (stat.altitude < 0) return null;

                  // Map horizontal coordinates to circular dome (Zenith in center, Horizon on edge)
                  // Altitude 90° -> center (r=0), Altitude 0° -> radius R
                  const radius = Math.max(0, (90 - stat.altitude) / 90) * 40; // 0..40%
                  // Azimuth: North=0 (top: -90deg in standard math), East=90 (right: 0deg)
                  const azRad = ((stat.azimuth - 90) * Math.PI) / 180.0;
                  const xPct = 50 + radius * Math.cos(azRad);
                  const yPct = 50 + radius * Math.sin(azRad);

                  return (
                    <button
                      key={c.id}
                      data-sky-constellation={c.id}
                      type="button"
                      onClick={() => {
                        selectConstellation(c.id);
                        setActiveTab('puzzle');
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 p-1 rounded-lg transition-all cursor-pointer group flex flex-col items-center ${
                        isSelected
                          ? 'z-20 scale-110 drop-shadow-[0_0_8px_#ffd880]'
                          : 'z-10 hover:scale-105'
                      }`}
                      style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          c.isPrimaryTarget
                            ? 'bg-[#d97706] ring-2 ring-[#ffd880] animate-pulse'
                            : isSelected
                            ? 'bg-[#e4bb70] ring-1 ring-white'
                            : 'bg-[#4b6b94]'
                        }`}
                      >
                        <Star className="w-2 h-2 text-white" />
                      </div>
                      <span
                        className={`text-[9px] font-bold whitespace-nowrap mt-0.5 px-1 rounded ${
                          isSelected
                            ? 'bg-[#1b3459] text-[#ffd880] border border-[#ffd880]/50'
                            : 'bg-[#050d18]/80 text-[#d4e4f7]'
                        }`}
                      >
                        {c.koreanName.replace('자리', '')} ({stat.altitude.toFixed(0)}°)
                      </span>
                    </button>
                  );
                })}

              </div>

              <p className="text-xs text-[#a7bdd5]">가운데는 머리 위(천정), 가장자리는 지평선이에요. 지도를 보며 휴대폰의 북쪽을 실제 북쪽과 맞춰요. 지평선 아래 대상은 원 안에 그리지 않아요.</p>
              {/* Status table for selected constellations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                {CONSTELLATIONS.map(c => {
                  const stat = calculateObservationStatus(c, observationDateTime, DOGYE_LOCATION);
                  const isPrimary = c.isPrimaryTarget;
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                        c.id === activeConstellation.id
                          ? 'bg-[#142642] border-[#e4bb70]'
                          : 'bg-[#091526] border-[#1b2f4c]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#fef9ee] flex items-center gap-1">
                          {c.koreanName}
                          {isPrimary && (
                            <span className="text-[9px] px-1 rounded bg-[#d97706] text-white">으뜸</span>
                          )}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            stat.rating.includes('고도 높음')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : stat.rating.includes('고도 중간')
                              ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {stat.rating}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-[#a4c0e2]">
                        <span>고도: <strong>{stat.altitude}°</strong></span>
                        <span>방위: <strong>{stat.compassDirection} ({stat.azimuth}°)</strong></span>
                      </div>

                      <p className="text-[10px] text-[#8fa7c7] leading-tight">
                        {stat.advice}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Local environmental guide notice */}
              <div className="p-3 rounded-xl bg-[#0e1d31] border border-[#233d64] text-xs space-y-1 text-[#93aaca] leading-relaxed">
                <span className="font-bold text-[#e4bb70] block">
                  ※ 장원초 야간 실제 관측 시 체크포인트:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#abc2df]">
                  <li><strong>지형:</strong> 학교 주변이 산으로 둘러싸여 있어 낮은 고도의 별은 가려질 수 있습니다. 위 지도의 15° 차폐선은 실측 자료가 없는 <strong>가정값</strong>입니다. 선택한 시각의 카시오페이아자리 계산 고도는 <strong>{cassiopeiaNow.altitude}°</strong>({cassiopeiaNow.compassDirection})입니다. 포말하우트처럼 남쪽 낮은 천체는 산에 가려질 수 있어요.</li>
                  <li><strong>가로등 및 조명:</strong> 조명을 등지고 10분 정도 눈을 어둠에 적응시키면 더 어두운 별까지 찾기 쉬워집니다. 보이는 별의 밝기 한계는 하늘 상태에 따라 달라집니다.</li>
                  <li><strong>기상 상태:</strong> 구름·안개·불빛에 따라 계산상 고도가 높아도 보이지 않을 수 있습니다. 엷은 구름이 있을 때는 비교적 밝은 별(카시오페이아자리 셰다르 α 등)부터 찾아보세요.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONSTELLATION ENCYCLOPEDIA */}
        {activeTab === 'encyclopedia' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#213757]">
              <div className="space-y-0.5">
                <h3 className="font-serif font-bold text-base text-[#fdf8ed]">
                  별자리 도감 및 신화 이야기 ({completedConstellations.length}/{CONSTELLATIONS.length} 완료)
                </h3>
                <p className="text-xs text-[#8ea7c9]">
                  별 잇기 훈련을 완료한 별자리는 황금 인장이 부여되며 상세 천체 정보가 기록됩니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {CONSTELLATIONS.map(c => {
                const isCompleted = completedConstellations.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      isCompleted
                        ? 'bg-[#0f213b] border-[#e4bb70]/70 shadow-md'
                        : 'bg-[#091526] border-[#1c2e47] opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#fef9ee]">
                            {c.koreanName}
                          </h4>
                          <span className="text-xs text-[#8ea7c9] font-mono">
                            ({c.englishName})
                          </span>
                        </div>
                        <span className="text-[11px] text-[#e4bb70] block font-medium">
                          {c.seasonTag}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#342407] text-[#ffd880] border border-[#e4bb70]/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          도감 수록
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            selectConstellation(c.id);
                            setActiveTab('puzzle');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#142642] text-[#f1d8a7] border border-[#2d4b79] hover:bg-[#1f3b66] transition-colors cursor-pointer"
                        >
                          별 잇기 도전 →
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-[#c4d7ee] space-y-2 leading-relaxed">
                      <div>
                        <strong className="text-[#ffd880] block text-[11px] mb-0.5">역사 및 신화 이야기:</strong>
                        <p>{c.mythology}</p>
                      </div>
                      <div>
                        <strong className="text-[#ffd880] block text-[11px] mb-0.5">과학적 의의:</strong>
                        <p>{c.significance}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1e3456] flex items-center justify-between text-[11px] text-[#8ea7c9] font-mono">
                      <span>중심 좌표: RA {c.centerRa}h / Dec {c.centerDec >= 0 ? '+' : ''}{c.centerDec}°</span>
                      <span>구성 별 수: {c.stars.length}개</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOM CONSTELLATION CREATOR (Unlocked after all 5) */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0f213b] border border-[#e4bb70] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#233d64]">
                <div className="space-y-0.5">
                  <h3 className="font-serif font-bold text-base text-[#ffd880] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    나만의 성좌 만들기 (Custom Constellation Studio)
                  </h3>
                  <p className="text-xs text-[#d3e5f8]">
                    오늘의 10개 별자리를 모두 탐구한 기념으로, 밤하늘 캔버스에 나만의 별자리를 직접 그리고 이름을 붙여보세요!
                  </p>
                </div>

                {customSavedSuccess && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    저장되었습니다!
                  </span>
                )}
              </div>

              {/* Input details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#e4bb70]">성좌 이름:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="예: 도계의 꿈자리, 우리 가족자리"
                    className="w-full px-3 py-2 rounded-lg bg-[#081322] border border-[#27446f] text-xs text-[#fef9ee] focus:outline-hidden focus:border-[#ffd880]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#e4bb70]">별자리 이야기 / 소원:</label>
                  <input
                    type="text"
                    value={customStory}
                    onChange={e => setCustomStory(e.target.value)}
                    placeholder="예: 가족이 함께 손잡고 도계 밤하늘을 바라본 소중한 추억"
                    className="w-full px-3 py-2 rounded-lg bg-[#081322] border border-[#27446f] text-xs text-[#fef9ee] focus:outline-hidden focus:border-[#ffd880]"
                  />
                </div>
              </div>

              {/* Instructions and Toolbar */}
              <div className="flex flex-wrap items-center justify-between text-xs text-[#9eb6d6] pt-1">
                <span>
                  캔버스를 탭하여 별(최대 12개)을 찍고, 두 별을 차례로 탭하여 선을 연결하세요. (별: {customStars.length}개 / 선: {customLines.length}개)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStars([]);
                      setCustomLines([]);
                      setCustomSelectedStar(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#142642] hover:bg-[#1e3b66] text-xs text-[#f6ebd5] flex items-center gap-1 border border-[#2a4773] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomConstellation}
                    className="px-3 py-1 rounded-lg bg-[#e4bb70] hover:bg-[#d8ae5e] text-[#1c1204] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>성좌 저장하기</span>
                  </button>
                </div>
              </div>

              {/* Interactive Custom Canvas */}
              <div className="relative w-full aspect-square max-h-[460px] bg-[#040913] rounded-xl overflow-hidden border border-[#264471] shadow-inner mx-auto">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full cursor-crosshair select-none"
                  onClick={handleCustomSvgClick}
                >
                  {/* Grid background */}
                  <defs>
                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#10233d" strokeWidth="0.3" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#smallGrid)" />

                  {/* Lines */}
                  {customLines.map(([a, b], idx) => {
                    const starA = customStars[a];
                    const starB = customStars[b];
                    if (!starA || !starB) return null;
                    return (
                      <line
                        key={`custom-line-${idx}`}
                        x1={starA.x}
                        y1={starA.y}
                        x2={starB.x}
                        y2={starB.y}
                        stroke="#ffd880"
                        strokeWidth="0.8"
                        strokeDasharray="none"
                      />
                    );
                  })}

                  {/* Stars */}
                  {customStars.map((star, idx) => {
                    const isSelected = customSelectedStar === idx;
                    return (
                      <g key={`custom-star-${idx}`}>
                        <circle
                          cx={star.x}
                          cy={star.y}
                          r={isSelected ? 3.5 : 2.5}
                          fill={isSelected ? '#5ce1e6' : '#ffd880'}
                          stroke="#ffffff"
                          strokeWidth="0.5"
                        />
                        <text
                          x={star.x}
                          y={star.y - 4}
                          textAnchor="middle"
                          fontSize="2.5"
                          fill="#fef9ee"
                          fontWeight="bold"
                        >
                          {star.name || '✦'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b172a] border border-[#2b4b7a] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#213a60]">
              <h4 className="font-serif font-bold text-sm text-[#ffd880] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                별 잇기 퍼즐 도움말
              </h4>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-xs text-[#8ea7c9] hover:text-white"
              >
                닫기 ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#c8dcf5] leading-relaxed">
              <p>
                <strong>1. 별 연결하기:</strong> 첫 번째 별을 탭한 뒤, 연결할 다음 별을 차례로 탭하면 황금빛 성좌 선이 연결됩니다.
              </p>
              <p>
                <strong>2. 키보드 단축키:</strong> Tab으로 별이나 별 목록 버튼을 고른 뒤 Enter 또는 Space로 연결할 수 있습니다. 되돌리기는 <code>Ctrl+Z</code>입니다.
              </p>
              <p>
                <strong>3. 오늘의 길잡이:</strong> 서쪽은 여름철 대삼각형, 높은 가을 하늘은 페가수스 대사각형, 북쪽은 카시오페이아의 W 모양을 먼저 찾아보세요.
              </p>
              <p className="text-[11px] text-[#e4bb70] pt-1">
                * 10개 별자리를 모두 완성하면 나만의 성좌를 자유롭게 만들 수 있는 공방이 열립니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#e4bb70] hover:bg-[#d8ae5e] text-[#1c1204] text-xs font-bold transition-colors cursor-pointer"
            >
              알겠습니다!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
