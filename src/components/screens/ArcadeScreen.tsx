import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { ParticipantState } from '../../types';
import { GAME_COMPONENTS, WandShooter, GameProps, NorbertFlight } from '../ActionGames';
import { SIDE_EPISODES, SideEpisode } from '../../data/sideEpisodes';
import { VisualNovel } from '../VisualNovel';
import { DuelHub } from '../DuelHub';
import { MINI_GAMES } from '../SpellMiniGame';
import { hasSpecial, grantForStage, Ticket } from '../../services/rewards';
import { fillName } from '../../services/script';
import { useMasterMode } from '../../services/masterMode';
import { sfx } from '../../services/sound';
import { CharacterFace } from '../characterAssets';

/**
 * 🎮 미니게임 탭 — 일곱 수업을 모두 마치면 열림
 * - 지금까지 열린 게임(배운 마법의 게임 + 특별 게임 이용권이 있으면 트롤 보스전)을 나열
 * - 게임마다 스테이지 1~5: 앞 스테이지를 깨야 다음이 열림, 올라갈수록 빠르고 목표가 많아짐
 * - 실패하면 같은 스테이지를 조금 쉽게 다시 (최대 2단계)
 */
interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
}

export const MAX_STAGE = 5;

interface ArcadeGame {
  key: string; // '0'..'6' | 'troll'
  title: string;
  icon: string;
  how: string;
  Comp: React.FC<GameProps>;
  episode?: SideEpisode;
}

const EPISODE_GAMES: Record<string, React.FC<GameProps>> = { ep2: NorbertFlight };
const NoGame: React.FC<GameProps> = () => null;
const epOpen = (ep: SideEpisode, cleared: Record<string, number>) => (cleared[ep.unlockAfter] || 0) >= (ep.unlockNeed ?? 1);

const TrollBoss: React.FC<GameProps> = props => <WandShooter {...props} mode="boss" />;

const ARCADE_HOW: Record<number, string> = {
  0: '지팡이를 끌어 움직여 구름을 맞히고 어둠 방울을 피해요',
  1: '날아다니는 열쇠 중 주황 고리 열쇠만 잡아요',
  2: '음표가 노란 선에 닿을 때 버튼을 눌러요',
  3: '불빛으로 비추며 파란 책을 찾아요',
  4: '바늘이 초록칸에 올 때 톡! 기사를 전진시켜요',
  5: '위에 나온 모양의 방울만 터뜨려요',
  6: '빗자루를 끌어 황금 스니치를 잡고 블러저를 피해요'
};

const GAME_ICONS = ['✨', '🔑', '🎵', '💡', '♞', '🦋', '🧹'];

export function openedGames(state: ParticipantState): ArcadeGame[] {
  const learned = new Set([0, 6, ...(state.spells || []), ...(state.completed || [])]);
  const list: ArcadeGame[] = [];
  for (let i = 0; i < 7; i++) {
    list.push({ key: String(i), title: MINI_GAMES[i].title, icon: GAME_ICONS[i], how: ARCADE_HOW[i], Comp: GAME_COMPONENTS[i] });
  }
  if (hasSpecial(state)) list.push({ key: 'troll', title: '특별 게임 · 트롤 보스전', icon: '🧌', how: '지팡이를 움직여 돌을 피하고 트롤의 초록 게이지를 0으로!', Comp: TrollBoss });
  // 외전 에피소드: 앞 게임 기록이 조건 이상이면 열림 (외전 1 = 트롤 보스전 1스테이지, 외전 2 = 대련 7명)
  const cleared = state.arcade?.cleared || {};
  for (const ep of SIDE_EPISODES) {
    if (epOpen(ep, cleared)) list.push({ key: ep.key, title: ep.title, icon: ep.icon, how: ep.how, Comp: EPISODE_GAMES[ep.key] || NoGame, episode: ep });
  }
  return list;
}

/** 아직 잠긴 다음 외전 (목록에 '🔒 ?' 로 보여 줌) */
export function nextLockedEpisode(state: ParticipantState): SideEpisode | null {
  const cleared = state.arcade?.cleared || {};
  return SIDE_EPISODES.find(ep => !epOpen(ep, cleared)) || null;
}

export const stageLabel = (n: number) => (n >= 5 ? '마지막 도전' : n >= 3 ? '도전' : '쉬움');
const stageColor = (n: number) => (n >= 10 ? 'from-[#f0abfc] to-[#a855f7]' : n >= 7 ? 'from-[#fca5a5] to-[#ef4444]' : n >= 4 ? 'from-[#fde68a] to-[#f59e0b]' : 'from-[#bbf7d0] to-[#22c55e]');

type Phase = 'count' | 'play' | 'win' | 'fail';

export const ArcadeScreen: React.FC<Props> = ({ state, onUpdateState, onNavigate }) => {
  const isJunior = state.experienceMode === 'junior';
  const games = openedGames(state);
  const cleared = state.arcade?.cleared || {};
  const [sel, setSel] = useState<string | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('count');
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(0);
  const [tries, setTries] = useState(0);
  const [practice,setPractice] = useState(false);
  const master = useMasterMode();

  const game = games.find(g => g.key === sel) || null;
  const seen = state.arcade?.seen || [];
  const [story, setStory] = useState<null | { ep: SideEpisode; part: 'intro' | 'outro' }>(null);
  const [cursor, setCursor] = useState(0);
  const [justUnlocked, setJustUnlocked] = useState<SideEpisode | null>(null);
  const [stageItem, setStageItem] = useState<Ticket | null>(null);
  const [duelItem, setDuelItem] = useState<Ticket | null>(null);
  const saveArcade = (patch: Partial<NonNullable<ParticipantState['arcade']>>) =>
    onUpdateState({ arcade: { cleared: {}, ...(state.arcade || {}), ...patch } });
  const openGame = (g: ArcadeGame) => {
    setSel(g.key);
    if (g.episode && !seen.includes(`${g.episode.key}-intro`)) { setCursor(0); setStory({ ep: g.episode, part: 'intro' }); }
  };

  useEffect(() => {
    if (stage === null || phase !== 'count') return;
    if (count <= 0) { sfx('go'); setPhase('play'); return; }
    sfx('beep');
    const t = setTimeout(() => setCount(c => c - 1), 600);
    return () => clearTimeout(t);
  }, [stage, phase, count]);

  const startStage = (n: number, keepTries = false, practiceMode = false) => {
    setPractice(practiceMode);
    setStageItem(null);
    if (!keepTries) setTries(0);
    setStage(n);
    setCount(3);
    setRound(r => r + 1);
    setPhase('count');
  };

  const win = () => {
    if (!game || stage === null) return;
    if (practice) { setStageItem(null); setJustUnlocked(null); sfx('fanfare'); setPhase('win'); return; }
    const best = Math.max(cleared[game.key] || 0, stage);
    const nextCleared = { ...cleared, [game.key]: best };
    saveArcade({ cleared: nextCleared });
    // 스테이지를 처음 깨면 가끔 랜덤 아이템 (너무 많이 주지 않게 개수 제한 없음)
    const g = state.completed.includes(Number(game.key)) || game.key === 'troll' || game.episode
      ? grantForStage(state.rewards, game.key, stage)
      : { rewards: state.rewards, item: null };
    if (g.rewards && g.rewards !== state.rewards) onUpdateState({ rewards: g.rewards });
    setStageItem(g.item);
    // 이번 승리로 새 외전이 열렸는지
    const opened = SIDE_EPISODES.find(ep => !epOpen(ep, cleared) && epOpen(ep, nextCleared));
    setJustUnlocked(opened || null);
    sfx(opened ? 'unlock' : 'fanfare');
    // 외전을 처음 깨면 마무리 이야기
    if (game.episode && !seen.includes(`${game.episode.key}-outro`)) {
      const ep = game.episode;
      setTimeout(() => { setCursor(0); setStory({ ep, part: 'outro' }); }, 900);
    }
    try { navigator.vibrate?.([40, 60, 40]); } catch {}
    setPhase('win');
  };

  /* ---------- 외전 이야기 (전체 화면 대화) ---------- */
  if (story) {
    const done = () => {
      const id = `${story.ep.key}-${story.part}`;
      const nextSeen = seen.includes(id) ? seen : [...seen, id];
      saveArcade({ seen: nextSeen });
      setStory(null);
    };
    return (
      <VisualNovel
        title={`${story.ep.title} · ${story.part === 'intro' ? '이야기' : '마무리'}`}
        lines={story.part === 'intro' ? story.ep.intro : story.ep.outro}
        name={state.name}
        cursor={cursor}
        onCursorChange={setCursor}
        onDone={done}
        doneLabel={story.part === 'intro' ? '비행 시작! 🧹' : '미니게임으로'}
        onSkip={done}
      />
    );
  }

  /* ---------- 플레이 화면 ---------- */
  if (game && stage !== null) {
    const Comp = game.Comp;
    const difficulty = practice ? 3 : 2 + Math.min(1, tries);
    return (
      <div className="space-y-3 pb-28 animate-fade-in">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { setStage(null); if (isJunior) setSel(null); }} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> {isJunior ? '게임 고르기' : '스테이지'}
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-extrabold text-[#1d1408] bg-gradient-to-r ${stageColor(stage)}`}>
            {game.icon} {practice ? '쉬운 연습' : `스테이지 ${stage} / 5`}{tries > 0 ? ` · 쉬워짐${'▼'.repeat(difficulty)}` : ''}
          </span>
        </div>

        {phase === 'count' && (
          <div className="relative w-full aspect-[3/4] max-h-[62dvh] mx-auto rounded-3xl border-2 border-[#d8b568]/60 bg-gradient-to-b from-[#132a4d] to-[#060c18] flex flex-col items-center justify-center gap-3">
            <p className="text-lg font-bold text-[#ffd880]">{game.title}</p>
            <span key={count} className="text-8xl font-extrabold text-[#ffd880] animate-ping-once">{count > 0 ? count : '시작!'}</span>
            <p className="px-6 text-center text-sm text-white/80">{game.how}</p>
          </div>
        )}
        {phase === 'play' && (
          <Comp key={round} stage={stage} difficulty={difficulty} onEnd={ok => (ok ? win() : (sfx('fail'), setTries(t => t + 1), setPhase('fail')))} />
        )}
        {phase === 'win' && (
          <div data-arcade-win className="rounded-3xl border-4 border-[#3a2c18] bg-[#fffaf0] p-5 text-center space-y-3 shadow-2xl animate-fade-in">
            <div className="text-6xl animate-bounce">{stage >= MAX_STAGE ? '👑' : '⭐'}</div>
            <p className="text-2xl font-extrabold text-[#1d1408]">{practice ? '연습 성공! 잘했어요!' : `스테이지 ${stage} 클리어!`}</p>
            {stageItem && (
              <div data-stage-item={stageItem.kind} className="rounded-2xl p-3 bg-gradient-to-r from-[#1e3a8a] to-[#312e81] text-white font-bold border-2 border-dashed border-[#fde68a]">
                🎁 아이템 획득! {stageItem.emoji} {stageItem.label}
                <div className="text-[11px] font-medium opacity-80">아이템 보관함에 넣었어요</div>
              </div>
            )}
            {!practice && justUnlocked && (
              <button
                type="button"
                data-unlocked={justUnlocked.key}
                onClick={() => { const g = openedGames({ ...state, arcade: { ...(state.arcade || {}), cleared: { ...cleared, [game.key]: Math.max(cleared[game.key] || 0, stage) }, seen } }).find(x => x.key === justUnlocked.key); setStage(null); if (g) openGame(g); }}
                className="w-full rounded-2xl p-3 bg-gradient-to-r from-[#312e81] to-[#1e1b4b] border-2 border-[#a5b4fc] text-white font-extrabold animate-pulse cursor-pointer"
              >
                🎉 새 외전이 열렸어요!<br />{justUnlocked.icon} {justUnlocked.title} 보러 가기 →
              </button>
            )}
            <p className="text-sm text-[#3a2814]">
              {isJunior ? '다른 게임도 해 볼까?' : stage >= MAX_STAGE ? fillName('{nameN} 전설의 마법사야! 모든 스테이지를 깼어!', state.name) : '다음 스테이지는 더 빨라져요. 도전!'}
            </p>
            {!practice && stage < MAX_STAGE && (
              <button type="button" onClick={() => startStage(stage + 1)} className="w-full min-h-[56px] rounded-2xl font-extrabold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
                ▶ 스테이지 {stage + 1} 도전
              </button>
            )}
            <button type="button" onClick={() => { setStage(null); if (isJunior) setSel(null); }} className="w-full min-h-[48px] rounded-2xl font-bold text-[#20170a] bg-[#f4e3bd] cursor-pointer">{isJunior ? '🎮 다른 게임 고르기' : '스테이지 목록'}</button>
          </div>
        )}
        {phase === 'fail' && (
          <div className="rounded-3xl border-4 border-[#3a2c18] bg-[#fffaf0] p-5 text-center space-y-3 shadow-2xl animate-fade-in">
            <div className="text-6xl">😮</div>
            <p className="text-xl font-extrabold text-[#1d1408]">아깝다! 다시 해 볼까?</p>
            <p className="text-sm text-[#3a2814]">{isJunior ? '천천히, 할 수 있어!' : tries <= 2 ? '이번엔 조금 더 쉽게 해 줄게.' : '천천히, 할 수 있어!'}</p>
            <button type="button" onClick={() => startStage(stage, true, practice)} className="w-full min-h-[56px] rounded-2xl font-extrabold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
              🔁 다시! {!isJunior && tries <= 2 ? '(더 쉽게)' : ''}
            </button>
            <button type="button" onClick={() => { setStage(null); if (isJunior) setSel(null); }} className="w-full min-h-[48px] rounded-2xl font-bold text-[#20170a] bg-[#f4e3bd] cursor-pointer">{isJunior ? '🎮 다른 게임 고르기' : '스테이지 목록'}</button>
          </div>
        )}
        {master && (phase === 'play' || phase === 'count') && (
          <button type="button" onClick={win} className="w-full min-h-[46px] rounded-xl font-bold text-white bg-[#7c3aed] border-2 border-[#c4b5fd] cursor-pointer">🧪 마스터: 바로 클리어</button>
        )}
      </div>
    );
  }

  /* ---------- 외전 1: 결투 클럽 대련장 ---------- */
  if (game && game.episode?.kind === 'duel') {
    const ep = game.episode;
    return (
      <DuelHub
        state={state}
        bonusItem={duelItem}
        onBack={() => setSel(null)}
        onReplayStory={() => { setCursor(0); setStory({ ep, part: 'intro' }); }}
        onSave={(beaten, loadout) => {
          const prev = cleared[ep.key] || 0;
          if (beaten > prev) {
            const g = grantForStage(state.rewards, ep.key, beaten);
            if (g.rewards && g.rewards !== state.rewards) onUpdateState({ rewards: g.rewards });
            setDuelItem(g.item);
            if (g.item) setTimeout(() => sfx('coin'), 900);
          }
          const nextCleared = { ...cleared, [ep.key]: Math.max(prev, beaten) };
          saveArcade({ cleared: nextCleared, duel: { loadout } });
          // 7명을 처음 다 이기면 마무리 이야기 → 외전 2 열림
          if (prev < 7 && beaten >= 7 && !seen.includes(`${ep.key}-outro`)) { setCursor(0); setStory({ ep, part: 'outro' }); }
        }}
      />
    );
  }

  /* ---------- 스테이지 고르기 ---------- */
  if (game) {
    const best = Math.min(MAX_STAGE, cleared[game.key] || 0);
    return (
      <div className="space-y-4 pb-28 animate-fade-in">
        <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 미니게임 목록
        </button>
        <div className="text-center space-y-1">
          <div className="text-6xl">{game.icon}</div>
          <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">{game.title}</h2>
          <p className="text-sm text-[#cbd5e1]">{game.how}</p>
          <p className="text-sm font-bold text-[#ffd880]">⭐ {best} / {MAX_STAGE} 스테이지 클리어</p>
          {game.episode && (
            <button type="button" onClick={() => { setCursor(0); setStory({ ep: game.episode!, part: 'intro' }); }} className="mt-1 px-3 py-1.5 rounded-full text-xs font-bold text-[#c7d2fe] bg-[#1e1b4b] border border-[#a5b4fc]/60 cursor-pointer">
              📖 외전 이야기 다시 보기
            </button>
          )}
        </div>
        <button type="button" data-practice className="field-primary w-full min-h-[56px] text-lg" onClick={()=>startStage(1,false,true)}>🌱 쉽게 연습하기</button>
        <p className="text-sm text-center text-[#cbd5e1]">연습은 기록·아이템을 사용하지 않아요.</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: MAX_STAGE }, (_, i) => i + 1).map(n => {
            const open = n <= best + 1 || master;
            const done = n <= best;
            return (
              <button
                key={n}
                type="button"
                data-stage={n}
                disabled={!open}
                onClick={() => startStage(n)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-extrabold border-2 cursor-pointer disabled:cursor-not-allowed ${
                  done ? `bg-gradient-to-b ${stageColor(n)} text-[#1d1408] border-white/60`
                  : open ? 'bg-[#fdf3dc] text-[#1d1408] border-[#ffd880] animate-pulse'
                  : 'bg-[#0b1629] text-[#4b5d78] border-[#22354f]'
                }`}
              >
                {open ? <span className="text-xl">{n}</span> : <Lock className="w-5 h-5" />}
                <span className="text-[10px]">{done ? '⭐' : stageLabel(n)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center text-[#9fb6d6]">모두 5단계예요. 처음부터 천천히! 실패하면 더 쉽게 다시 도전해요.</p>
      </div>
    );
  }

  /* ---------- 게임 목록 ---------- */
  if (isJunior) return <div className="junior-ui space-y-6 pb-28" data-experience="junior-games"><button type="button" className="junior-secondary" onClick={()=>onNavigate('map')}>← 사진 미션으로</button><h1>🎮 무슨 놀이 할까?</h1>{games.map(g=><button type="button" key={g.key} data-game={g.key} className="junior-main" onClick={()=>openGame(g)}><span>{g.icon}</span><b>{g.title}</b><small>{g.how}</small></button>)}</div>;
  const totalStars = games.reduce((a, g) => a + (Math.min(g.episode?.kind === 'duel' ? 7 : MAX_STAGE, cleared[g.key] || 0)), 0);
  return (
    <div className={`space-y-5 pb-28 animate-fade-in ${isJunior ? 'junior-ui' : ''}`}>
      <button type="button" onClick={() => onNavigate('map')} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> 탐험 지도
      </button>
      <div className="flex items-end gap-3">
        <CharacterFace speaker="론" size={64} framed />
        <div className="flex-1 rounded-2xl rounded-bl-sm bg-[#fdf3dc] text-[#2c1d0a] px-3 py-2 shadow">
          <div className="text-[11px] font-bold text-[#8a5d24]">론의 미니게임 방</div>
          <p className="text-[15px] font-medium leading-snug">{fillName('{nameA}, 지팡이 슈팅과 황금 스니치를 먼저 연습해 봐! 일곱 가지 게임을 천천히 해 보자!', state.name)}</p>
        </div>
      </div>
      <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">🎮 미니게임 <span className="text-base text-[#ffd880]">⭐ {totalStars} / {games.length * MAX_STAGE}</span></h2>
      <div className="grid grid-cols-2 gap-3">
        {games.map(g => {
          const best = Math.min(g.episode?.kind === 'duel' ? 7 : MAX_STAGE, cleared[g.key] || 0);
          return (
            <button
              key={g.key}
              type="button"
              data-game={g.key}
              onClick={() => openGame(g)}
              className={`rounded-2xl p-3 text-left border-2 cursor-pointer active:scale-95 transition-transform ${g.episode ? 'bg-[#1e1b4b] border-[#a5b4fc]' : g.key === 'troll' ? 'bg-[#132a12] border-[#a3e635]' : 'bg-[#0e1b2f] border-[#d8b568]/50'}`}
            >
              <div className="text-4xl">{g.icon}</div>
              <div className="mt-1 font-bold text-[15px] text-[#f6ebd5] leading-tight">{g.title}</div>
              <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#fde68a] to-[#f59e0b]" style={{ width: `${(best / (g.episode?.kind === 'duel' ? 7 : MAX_STAGE)) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-[#ffd880]">{g.episode?.kind === 'duel' ? (best >= 7 ? '🏆 대련 우승' : `대련 ${best} / 7`) : best >= MAX_STAGE ? '👑 전설 달성' : `스테이지 ${best} / ${MAX_STAGE}`}</div>
            </button>
          );
        })}
      </div>
      {(() => {
        const nxt = nextLockedEpisode(state);
        if (!nxt) return null;
        return (
          <div data-locked-episode className="rounded-2xl p-4 border-2 border-dashed border-[#a5b4fc]/50 bg-[#1e1b4b]/60 text-center space-y-1">
            <div className="text-3xl">🔒</div>
            <p className="font-bold text-[#c7d2fe]">외전 에피소드 · ???</p>
            <p className="text-xs text-[#a5b4fc]">{nxt.unlockAfter === 'troll' ? '특별 게임 트롤 보스전을 깨면' : nxt.unlockAfter === 'ep1' ? '결투 클럽에서 7명을 모두 이기면' : '앞 외전을 깨면'} 새로운 이야기와 게임이 열려요!</p>
          </div>
        );
      })()}
    </div>
  );
};
