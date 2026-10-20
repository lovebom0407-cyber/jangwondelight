import { EventMusic } from './components/EventMusic';
import {TreasureScreen} from './components/screens/TreasureScreen';
import { JuniorHub } from './components/screens/JuniorHub';
import { JuniorSkyScreen } from './components/screens/JuniorSkyScreen';
import { JuniorFinale } from './components/screens/JuniorFinale';
import { FieldGuideScreen } from './components/screens/FieldGuideScreen';
import { DeviceStorageNotice } from './components/DeviceStorageNotice';
import { grantForClear, unusedCount } from './services/rewards';
import { DialogHost } from './components/DialogHost';
import { sound, sfx, MusicMode } from './services/sound';
import { RewardsScreen } from './components/screens/RewardsScreen';
const ArcadeScreen = lazy(() => import('./components/screens/ArcadeScreen').then(m => ({ default: m.ArcadeScreen })));
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ParticipantState, AppScreen } from './types';
import {
  createBlankState,
  clearLegacyCloudCredentials,
  loadCurrentParticipant,
  saveParticipant
} from './services/storage';
import { validateScreenGuard } from './services/screenGuard';
import { onEvidenceChange } from './services/evidenceDb';
import { HOUSES, getMissionZepLink, getAdminCodes } from './data/storyData';
import { validateAwardStar } from './services/awardValidator';
import { isMasterMode, setMasterMode, useMasterMode } from './services/masterMode';
import { StartScreen } from './components/screens/StartScreen';
import { CharactersScreen } from './components/screens/CharactersScreen';
import { PrologueScreen } from './components/screens/PrologueScreen';
import { EnrollScreen } from './components/screens/EnrollScreen';
import { CameraSortScreen } from './components/screens/CameraSortScreen';
import { ThinkingScreen } from './components/screens/ThinkingScreen';
import { AssignedScreen } from './components/screens/AssignedScreen';
import { MapScreen } from './components/screens/MapScreen';
import { ScanScreen } from './components/screens/ScanScreen';
import { DialogueScreen } from './components/screens/DialogueScreen';
import { MissionScreen } from './components/screens/MissionScreen';
import { RewardScreen } from './components/screens/RewardScreen';
import { PassportScreen } from './components/screens/PassportScreen';
import { LanternScreen } from './components/screens/LanternScreen';
import { JournalScreen } from './components/screens/JournalScreen';
import { EndingScreen } from './components/screens/EndingScreen';
import { SurveyScreen } from './components/screens/SurveyScreen';
const PortfolioScreen = lazy(() => import('./components/screens/PortfolioScreen').then(m => ({ default: m.PortfolioScreen })));
const AdminScreen = lazy(() => import('./components/screens/AdminScreen').then(m => ({ default: m.AdminScreen })));
import { AdminLoginScreen } from './components/screens/AdminLoginScreen';
const ObservatoryScreen = lazy(() => import('./components/screens/ObservatoryScreen').then(m => ({ default: m.ObservatoryScreen })));
import { ConstellationGame } from './components/ConstellationGame';
import { subscribeAdminAuth, signOutAdmin } from './services/adminAuth';
import { AdminAuthState } from './types';

import {
  Compass,
  BookOpen,
  Sparkles,
  Star,
  Bookmark,
  Settings,
  ArrowLeft,
  X,
  Gift,
  Gamepad2
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<ParticipantState>(() => {
    clearLegacyCloudCredentials();
    const loaded = loadCurrentParticipant();
    return loaded || createBlankState();
  });

  const ExplorerMap = state.experienceMode === 'junior' ? JuniorHub : MapScreen;


  const [screen, setScreen] = useState<AppScreen>(() => {
    // 주소 끝에 #admin 또는 ?admin 을 붙이면 바로 운영실 로그인
    try {
      if (/(^#|[?&])admin\b/.test(window.location.hash + ' ' + window.location.search)) return 'admin-login';
    } catch {}
    return 'start';
  });

  const [adminState, setAdminState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    loading: true,
    error: null
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const masterOn = useMasterMode();
  const toastTimeoutRef = useRef<any>(null);
  const isUnlockingRef = useRef<boolean>(false);
  const isAwardingRef = useRef<boolean>(false);
  const stateRef = useRef<ParticipantState>(state);
  stateRef.current = state;
  const awardEpochRef = useRef<number>(0);

  // Subscribe to live Admin Auth State and server custom claims verification (stable subscription)
  useEffect(() => {
    const unsubscribe = subscribeAdminAuth(newAdminState => {
      setAdminState(newAdminState);
    });
    return unsubscribe;
  }, []);

  // 주소에 #admin 을 붙이면 운영실 로그인으로
  useEffect(() => {
    const onHash = () => {
      if (/^#admin\b/.test(window.location.hash)) setScreen('admin-login');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Separate effect: Redirect away from admin screen if not authorized
  useEffect(() => {
    if (!adminState.loading && !adminState.isAdmin && screen === 'admin') {
      setScreen('admin-login');
    }
  }, [adminState.loading, adminState.isAdmin, screen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4200);
  };

  const handleAdminSignOut = async () => {
    await signOutAdmin();
    setAdminState({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      loading: false,
      error: null
    });
    setScreen('start');
    showToast('관리자 세션이 안전하게 종료되었습니다.');
  };

  // Sync state changes with localStorage
  const handleUpdateState = (partial: Partial<ParticipantState>) => {
    const next = { ...stateRef.current, ...partial };
    stateRef.current = next;
    if (next.name) {
      try { saveParticipant(next); }
      catch { showToast('저장 공간이 부족하여 일부 데이터 저장이 지연될 수 있습니다.'); }
    }
    setState(next);
  };

  // State-based Screen Guard Navigation with Admin Auth check
  // withState: 방금 바꾼 상태를 가드에 바로 반영 (setState 는 다음 렌더에 적용되므로)
  const navigateTo = (nextTarget: AppScreen, withState?: Partial<ParticipantState>) => {
    const guardState = withState ? { ...stateRef.current, ...withState } : stateRef.current;
    const safeScreen = validateScreenGuard(nextTarget, guardState, adminState.isAdmin);
    setScreen(safeScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      window.history.pushState({ screen: safeScreen }, '');
    } catch {}
  };

  // Initial sync attempt & evidence change subscription for records
  useEffect(() => {

    const unsubscribe = onEvidenceChange(item => {
      setState(prev => {
        const missionIndex = item.mission;
        const currentRec = prev.records?.[missionIndex];
        if (currentRec && currentRec.evidenceId === item.id) {
          const updated = {
            ...prev,
            records: {
              ...prev.records,
              [missionIndex]: {
                ...currentRec,
                uploadStatus: item.status,
                uploadError: item.error || null,
                fileId: item.fileId
              }
            }
          };
          try {
            saveParticipant(updated);
          } catch {}
          return updated;
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  // Handle browser back/forward buttons with strict state-based screen guard
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const candidateScreen: AppScreen =
        e.state?.screen || (state.name && state.house !== null ? 'map' : 'start');
      const safe = validateScreenGuard(candidateScreen, state, adminState.isAdmin);
      setScreen(safe);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state, adminState.isAdmin]);

  // Strict Unlock handler from QR / Code verification (Free-order policy)
  const handleUnlockMission = (index: number) => {
    if (isUnlockingRef.current) return;
    isUnlockingRef.current = true;

    try {
      if (typeof index !== 'number' || index < 0 || index >= 7) {
        showToast('유효하지 않은 부스 번호입니다.');
        navigateTo('map');
        return;
      }

      if (state.completed.includes(index)) {
        showToast('이미 별빛 조각을 획득한 부스입니다.');
        navigateTo('map');
        return;
      }

      const nextStory = { ...state.story };
      nextStory.scene = {
        kind: 'arrival',
        index,
        cursor: 0
      };

      const nextRecords = {
        ...state.records,
        [index]: {
          ...state.records[index],
          status: 'in_progress' as const
        }
      };

      const patch = {
        selectedMissionIndex: index,
        unlocked: index,
        story: nextStory,
        records: nextRecords
      };
      handleUpdateState(patch);
      if (stateRef.current.experienceMode === 'junior') {
        const child = { ...patch, story: { ...stateRef.current.story, introDone: true, scene: null } };
        handleUpdateState(child); navigateTo('mission', child);
      } else navigateTo('dialogue', patch);
    } finally {
      isUnlockingRef.current = false;
    }
  };

  // Strict Award star fragment handler with full validation
  const handleAwardStar = async (missionIndex: number) => {
    if (isAwardingRef.current) return;
    isAwardingRef.current = true;
    const currentEpoch = ++awardEpochRef.current;
    const currentParticipantId = stateRef.current.participantId;
    const currentCompletedCount = stateRef.current.completed.length;
    const currentEvidenceId = stateRef.current.records[missionIndex]?.evidenceId;

    try {
      // 1. Deep asynchronous validation against IndexedDB evidence, participant ID, and mission state
      //    마스터(테스트) 모드: 인증샷 확인 생략 (이미 받은 별빛만 막음)
      const master = isMasterMode();
      const validation = master
        ? (stateRef.current.completed.includes(missionIndex)
            ? { ok: false as const, error: 'DUPLICATE_STAR_AWARD', message: '이미 별빛을 받은 수업입니다.' }
            : { ok: true as const })
        : await validateAwardStar(stateRef.current, missionIndex);

      // Concurrency & profile switch guard: check if epoch, profile, or progress changed during async validation
      if (
        currentEpoch !== awardEpochRef.current ||
        stateRef.current.participantId !== currentParticipantId ||
        stateRef.current.completed.length !== currentCompletedCount ||
        stateRef.current.selectedMissionIndex !== missionIndex ||
        stateRef.current.records[missionIndex]?.evidenceId !== currentEvidenceId
      ) {
        showToast('진행 상태 또는 학생 프로필이 변경되어 처리가 취소되었습니다.');
        return;
      }

      if (validation.ok === false) {
        showToast(validation.message);
        if (
          validation.error === 'MISSING_EVIDENCE_ID' ||
          validation.error === 'EVIDENCE_NOT_FOUND_IN_STORAGE' ||
          validation.error === 'INVALID_EVIDENCE_KIND' ||
          validation.error === 'ZEP_QUIZ_NOT_SUBMITTED' ||
          validation.error === 'ZEP_SERVER_APPROVAL_REQUIRED'
        ) {
          navigateTo('evidence');
        } else {
          navigateTo('map');
        }
        return;
      }

      // Atomic state update and persistence with storage exception handling
      let updateSucceeded = false;
      let committed: ParticipantState | null = null;
      {
        const prev = stateRef.current;
        // Double-check guards inside functional updater
        if (prev.participantId !== currentParticipantId || prev.completed.includes(missionIndex)) {
          return;
        }

        const completedList = Array.from(new Set([...prev.completed, missionIndex]));
        const nextStory = {
          ...prev.story,
          evidence: Array.from(new Set([...(prev.story.evidence || []), missionIndex])),
          scene: {
            kind: 'reward' as const,
            index: missionIndex,
            cursor: 0
          }
        };

        const nextRecords = {
          ...prev.records,
          [missionIndex]: {
            ...prev.records[missionIndex],
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
            ...(master ? { masterSkip: true } : {})
          }
        };

        const isAllDone = completedList.length === 7;
        const nextState: ParticipantState = {
          ...prev,
          completed: completedList,
          selectedMissionIndex: missionIndex,
          unlocked: null,
          pendingMission: null,
          finishedAt: isAllDone ? new Date().toISOString() : prev.finishedAt,
          records: nextRecords,
          story: nextStory,
          rewards: grantForClear(prev.rewards, missionIndex, completedList.length)
        };

        try {
          saveParticipant(nextState);
          updateSucceeded = true;
        } catch (storageErr) {
          console.error('Storage error during awardStar:', storageErr);
          showToast('저장소 공간 오류로 데이터 보존에 실패했습니다. 기기 여유 공간을 확인해 주세요.');
          return;
        }

        committed = nextState;
        stateRef.current = nextState;
        setState(nextState);
      }

      if (updateSucceeded && committed) {
        sfx('star');
        if (committed.experienceMode === 'junior') {
          const child = { ...committed, spells: [...new Set([...(committed.spells || []), missionIndex])], story: { ...committed.story, introDone: true, scene: null } };
          handleUpdateState(child);
          showToast('⭐ 별빛 받았어요! 🎁 선물함도 열어 봐요.');
          navigateTo('map', child);
        } else navigateTo('dialogue', committed);
      }
    } catch (err: any) {
      console.error('Unexpected error in handleAwardStar:', err);
      showToast('별빛 조각 검증 중 예기치 않은 오류가 발생했습니다: ' + (err?.message || '잠시 후 다시 시도해 주세요'));
    } finally {
      isAwardingRef.current = false;
    }
  };

  // 마지막 이야기(볼드모트 마법 대결 포함) 시작
  const startFinale = () => {
    if (new Set(stateRef.current.completed || []).size < 7) {
      showToast('일곱 수업을 모두 마쳐야 볼드모트를 만날 수 있어요.');
      return;
    }
    if (stateRef.current.experienceMode === 'junior') { navigateTo('junior-final'); return; }
    handleUpdateState({
      story: { ...stateRef.current.story, scene: { kind: 'finale', index: 0, cursor: 0 } }
    });
    setScreen('dialogue');
  };

  // Trigger prologue dialogue on map start if not completed
  useEffect(() => {
    if (state.experienceMode !== 'junior' && state.house !== null && !state.story.introDone && !state.story.scene && screen === 'map') {
      const nextStory = {
        ...state.story,
        scene: {
          kind: 'intro' as const,
          index: 0,
          cursor: 0
        }
      };
      handleUpdateState({ story: nextStory });
      setScreen('dialogue');
    }
  }, [state.house, state.story.introDone, state.story.scene, screen]);

  // In-game bottom navigation eligibility (student menu only - NO admin!)
  // 소리: 화면에 맞는 배경음, 첫 터치에 소리 켜기, 버튼 톡 소리
  useEffect(() => {
    const m: MusicMode = screen === 'junior-final' ? 'battle' : ['arcade', 'minigame', 'reward', 'tickets'].includes(screen) ? 'game' : 'calm';
    sound.setMusic(screen === 'admin' || screen === 'admin-login' ? null : m);
  }, [screen]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      sound.unlock();
      const el = e.target as HTMLElement | null;
      const btn = el?.closest?.('button, a, label');
      if (btn && !btn.closest('[data-board]') && !(btn as HTMLElement).dataset.nosfx && !(btn as HTMLButtonElement).disabled) sfx('tap');
    };
    const unlock=()=>sound.unlock();
    window.addEventListener('pointerdown',onDown,true);window.addEventListener('touchend',unlock,true);window.addEventListener('keydown',unlock,true);
    return()=>{window.removeEventListener('pointerdown',onDown,true);window.removeEventListener('touchend',unlock,true);window.removeEventListener('keydown',unlock,true);};
  }, []);

  const showBottomNav =
    state.house !== null &&
    ['treasure', 'map', 'junior-sky', 'field-guide', 'observatory', 'passport', 'bag', 'journal', 'portfolio', 'survey', 'tickets', 'arcade'].includes(screen);
  const allCleared = new Set(state.completed || []).size >= 7;
  const unusedItems = unusedCount(state);

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between selection:bg-[#e4bb70]/40 selection:text-[#fff4d6]">
      {/* Central Content Container */}
      {masterOn && (
        <div className="relative z-[60] w-full bg-[#7c3aed] text-white text-xs font-bold px-3 py-1.5 flex items-center justify-center gap-3 shadow">
          <span>🧪 마스터 모드 · 인증샷 없이 진행 (테스트용)</span>
          <button type="button" onClick={() => { setMasterMode(false); showToast('마스터 모드를 껐습니다.'); }} className="px-2 py-0.5 rounded bg-white/20 cursor-pointer">끄기</button>
        </div>
      )}
      <EventMusic screen={screen} />
      <Suspense fallback={<div role="status" className="field-paper mx-auto my-8 w-[90%] max-w-[500px]">별빛 화면을 준비하고 있어요…</div>}>
      <main data-screen={screen} className="app-main w-full max-w-[560px] mx-auto px-5 pt-6 flex-1">
        {state.name && ['map', 'passport', 'journal', 'bag'].includes(screen) && (state.experienceMode === 'junior' ? <details className="mb-4 junior-parent"><summary>보호자 · 저장 상태</summary><DeviceStorageNotice /></details> : <DeviceStorageNotice />)}
        {screen === 'start' && <StartScreen state={state} onNavigate={navigateTo} onChooseMode={mode => handleUpdateState({ experienceMode: mode })} />}

        {screen === 'characters' && <CharactersScreen mode={state.experienceMode} onNavigate={navigateTo} />}

        {screen === 'prologue' && <PrologueScreen onNavigate={navigateTo} />}

        {screen === 'enroll' && (
          <EnrollScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
            onShowToast={showToast}
          />
        )}

        {screen === 'camera' && (
          <CameraSortScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
            onShowToast={showToast}
          />
        )}

        {screen === 'thinking' && (
          <ThinkingScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
          />
        )}

        {screen === 'assigned' && (
          <AssignedScreen state={state} onNavigate={navigateTo} />
        )}

        {screen === 'map' && (
          <ExplorerMap
            state={state}
            onNavigate={navigateTo}
            onSelectMission={idx => {
              const sel = { selectedMissionIndex: idx };
              handleUpdateState(sel);
              // 완료했거나 이미 시작한 수업 → 미션 화면
              if (state.completed.includes(idx) || state.unlocked === idx) {
                navigateTo('mission', sel);
                return;
              }
              // 운영실에서 현장 코드를 정한 부스만 QR/코드 확인, 아니면 바로 캐릭터 대화
              const code = getAdminCodes()[idx];
              if (code && code.trim() && !masterOn) {
                navigateTo('scan', sel);
              } else {
                handleUnlockMission(idx);
              }
            }}
            onResumeDialogue={() => navigateTo('dialogue')}
            onStartFinale={startFinale}
          />
        )}

        {screen === 'treasure' && <TreasureScreen state={state} onNavigate={navigateTo} />}
        {screen === 'junior-sky' && <JuniorSkyScreen state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} />}
        {screen === 'junior-final' && <JuniorFinale state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} />}
        {screen === 'field-guide' && <FieldGuideScreen state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} onShowToast={showToast} />}

        {screen === 'observatory' && (
          <ObservatoryScreen
            state={state}
            onUpdateState={handleUpdateState}
            onBackToMap={() => navigateTo('map')}
            onOpenStation={idx => {
              handleUpdateState({ selectedMissionIndex: idx });
              navigateTo('mission', { selectedMissionIndex: idx });
            }}
          />
        )}

        {screen === 'scan' && (
          <ScanScreen
            state={state}
            onNavigate={navigateTo}
            onUnlockSuccess={handleUnlockMission}
            onShowToast={showToast}
          />
        )}

        {screen === 'dialogue' && (
          <DialogueScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
          />
        )}

        {(screen === 'mission' || screen === 'evidence') && (
          <MissionScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
            onShowToast={showToast}
            onAwardStar={handleAwardStar}
          />
        )}

        {screen === 'reward' && (
          <RewardScreen state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} onStartFinale={startFinale} />
        )}

        {screen === 'tickets' && (
          <RewardsScreen state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} onShowToast={showToast} />
        )}

        {screen === 'arcade' && (
          <ArcadeScreen state={state} onUpdateState={handleUpdateState} onNavigate={navigateTo} />
        )}

        {screen === 'passport' && (
          <PassportScreen state={state} onNavigate={navigateTo} />
        )}

        {screen === 'bag' && (
          <LanternScreen
            state={state}
            onNavigate={navigateTo}
            onResetToStart={() => {
              setState(createBlankState());
              navigateTo('start');
            }}
            onShowToast={showToast}
          />
        )}

        {screen === 'journal' && (
          <JournalScreen state={state} onNavigate={navigateTo} />
        )}

        {screen === 'ending' && <EndingScreen state={state} onNavigate={navigateTo} />}

        {screen === 'survey' && <SurveyScreen onNavigate={navigateTo} />}

        {screen === 'portfolio' && (
          <PortfolioScreen
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={navigateTo}
            onShowToast={showToast}
          />
        )}

        {screen === 'admin-login' && (
          <AdminLoginScreen
            onNavigate={navigateTo}
            onLoginSuccess={() => {
              setAdminState(prev => ({ ...prev, isAuthenticated: true, isAdmin: true, loading: false, error: null }));
              setScreen('admin');
              try { window.history.pushState({ screen: 'admin' }, ''); } catch {}
            }}
            onShowToast={showToast}
          />
        )}

        {screen === 'admin' && (
          adminState.isAdmin ? (
            <AdminScreen
              isAdmin={adminState.isAdmin}
              adminEmail={adminState.user?.email}
              onNavigate={navigateTo}
              onSignOut={handleAdminSignOut}
              onShowToast={showToast}
            />
          ) : (
            <AdminLoginScreen
              onNavigate={navigateTo}
              onLoginSuccess={() => {
                setAdminState(prev => ({ ...prev, isAuthenticated: true, isAdmin: true, loading: false, error: null }));
                setScreen('admin');
              }}
              onShowToast={showToast}
            />
          )
        )}

        {screen === 'minigame' && (
          <div className="space-y-5 pb-12 animate-fade-in">
            <button
              type="button"
              onClick={() => navigateTo('start')}
              className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 시작 화면
            </button>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
                MINI GAME PRACTICE
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
                카시오페이아 별빛 잇기 연습
              </h2>
            </div>
            <ConstellationGame onComplete={() => showToast('별자리 연결을 훌륭하게 완성했어요!')} />
            <button
              type="button"
              onClick={() => navigateTo('enroll')}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] shadow hover:brightness-105"
            >
              별밤학교 입학하기 →
            </button>
          </div>
        )}
      </main>
      </Suspense>

      <DialogHost />

      {/* Persistent Bottom Floating Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-22 left-1/2 -translate-x-1/2 w-[90%] max-w-md px-4 py-3 rounded-xl bg-[#fdf3dc] text-[#2c1d0a] shadow-[0_8px_30px_rgba(0,0,0,0.8)] border border-[#d8b877] text-xs font-medium z-50 animate-bounce flex items-center justify-between"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-70 text-[#5f4625] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile-First Sticky Bottom Navigation Bar */}
      {showBottomNav && (
        <nav
          aria-label="주요 메뉴"
          className={`app-nav ${state.experienceMode === 'junior' ? 'junior-nav' : ''} fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] px-2 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-[#080f1f]/95 backdrop-blur-md border-t border-[#e4bb70]/30 z-40 flex items-center justify-around text-xs shadow-2xl`}
        >
          {(state.experienceMode === 'junior' ? [
            ['treasure','보물찾기',Compass],['map','사진 미션',BookOpen],['junior-sky','하늘 보기',Star],['arcade','게임',Gamepad2],['tickets','선물',Gift]
          ] as const : [
            ['map', '탐험', Compass], ['treasure','보물찾기',Sparkles], ['field-guide', '천문', BookOpen],
            ['observatory', '별자리', Star], ['arcade', '게임', Gamepad2], ['tickets', '이용권', Gift]
          ] as const).map(([id, label, Icon]) => <button key={id} type="button" data-nav={id}
            aria-current={screen === id ? 'page' : undefined} onClick={() => navigateTo(id)}
            className={`relative flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1 cursor-pointer ${screen === id ? 'text-[#ffd880] font-bold' : 'text-[#a7b9d1]'}`}>
            <Icon className="w-5 h-5" /><span>{label}</span>
            {id === 'tickets' && unusedItems > 0 && <span className="absolute right-1 top-0 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px]">{unusedItems}</span>}
          </button>)}
        </nav>
      )}
    </div>
  );
}
