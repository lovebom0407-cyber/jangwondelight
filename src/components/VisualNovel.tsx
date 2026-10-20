import React, { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { DialogueLine, ScriptStep } from '../types';
import { CharacterFull, CharacterFace } from './characterAssets';
import { fillName, isBattle, isChoice } from '../services/script';
import { BattleGame } from './BattleGame';
import { useMasterMode } from '../services/masterMode';

/**
 * 전체 화면 대화 (시뮬레이션 게임 방식)
 * - 큰 캐릭터 그림 + 아래 말풍선. 화면 아무 곳이나 누르면 다음 대사.
 * - 선택지(ChoiceStep)가 나오면 아이가 버튼을 골라야 넘어가고, 고른 답에 따라 캐릭터 대답이 달라집니다.
 * - 이름은 {nameA}(지우야/민준아) 등으로 자연스럽게 불러 줍니다.
 * - cursor 는 대본 단계 위치(선택지 포함)로 저장되어 새로고침해도 이어집니다.
 */
interface Props {
  title: string;
  lines: ScriptStep[];
  name?: string;
  cursor?: number;
  onCursorChange?: (cursor: number) => void;
  onDone: () => void;
  doneLabel: string;
  onSkip?: () => void;
  collected?: number[]; // 마법 대결에서 쓸 수 있는 별빛
}

export const VisualNovel: React.FC<Props> = ({ title, lines, name, cursor: controlled, onCursorChange, onDone, doneLabel, onSkip, collected }) => {
  const [local, setLocal] = useState(0);
  const master = useMasterMode();
  const cursor = Math.min(controlled ?? local, Math.max(0, lines.length - 1));
  // 선택지를 고른 뒤 이어지는 캐릭터 대답
  const [replies, setReplies] = useState<DialogueLine[]>([]);
  const [replyIdx, setReplyIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const step = lines[cursor];
  const inReplies = replies.length > 0 && replyIdx < replies.length;
  const showingBattle = !inReplies && step && isBattle(step);
  const showingChoice = !inReplies && step && isChoice(step);
  const [speaker, rawText] = inReplies
    ? replies[replyIdx]
    : step && isChoice(step)
      ? [step.speaker, step.text]
      : step && !isBattle(step)
        ? (step as DialogueLine)
        : (['볼드모트', ''] as DialogueLine);
  const shown = fillName(rawText, name);
  const isLastStep = cursor >= lines.length - 1;
  const isLast = isLastStep && !showingChoice && (!inReplies || replyIdx >= replies.length - 1);
  const isNarration = /^\(.*\)$/.test(shown.trim());

  const goStep = (n: number) => {
    setReplies([]);
    setReplyIdx(0);
    setPicked(null);
    if (n >= lines.length) {
      onDone();
      return;
    }
    setLocal(n);
    onCursorChange?.(n);
  };

  const next = () => {
    if (showingChoice || showingBattle) return; // 선택지·대결은 버튼으로만
    if (inReplies && replyIdx < replies.length - 1) {
      setReplyIdx(i => i + 1);
      return;
    }
    if (isLast) {
      onDone();
      return;
    }
    goStep(cursor + 1);
  };

  const choose = (label: string, r: DialogueLine[]) => {
    setPicked(label);
    if (r.length) {
      setReplies(r);
      setReplyIdx(0);
    } else {
      goStep(cursor + 1);
    }
  };

  const choiceStep = showingChoice && step && isChoice(step) ? step : null;

  return (
    <div
      className="story-stage fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#132a4d] via-[#0a1830] to-[#03070f] select-none"
      onClick={next}
      role="dialog"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#f7d890_1px,transparent_1px)] bg-[size:28px_28px] opacity-25 pointer-events-none" />
      <div className="absolute top-4 right-5 text-5xl text-[#ffdf99] drop-shadow-[0_0_25px_#e5b84c] pointer-events-none">☾</div>

      {showingBattle && (
        <BattleGame playerName={name} collected={collected && collected.length ? collected : [0, 1, 2, 3, 4, 5, 6]} onWin={() => goStep(cursor + 1)} />
      )}

      {/* top bar */}
      <div className={`relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] ${master ? 'mt-8' : ''}`}>
        <span className="text-xs font-bold text-[#e4bb70] bg-[#050c17]/60 px-3 py-1.5 rounded-full">{title}</span>
        {master && !onSkip && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              // 대결이 남아 있으면 대결 단계로, 아니면 대화 끝으로
              const bi = lines.findIndex((st, i) => i > cursor && isBattle(st));
              if (bi >= 0 && !showingBattle) goStep(bi);
              else onDone();
            }}
            className="mr-14 text-[11px] font-bold text-white bg-[#7c3aed] px-3 py-1.5 rounded-full cursor-pointer"
          >
            🧪 건너뛰기
          </button>
        )}
        {onSkip && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSkip(); }}
            className="mr-14 text-[11px] text-[#9fb6d6] bg-[#050c17]/60 px-3 py-1.5 rounded-full cursor-pointer"
          >
            건너뛰기
          </button>
        )}
      </div>

      {/* big character */}
      <div className="relative z-0 flex-1 min-h-0 flex items-end justify-center px-2">
        <CharacterFull
          key={speaker}
          speaker={speaker}
          height="100%"
          className="w-full max-w-[520px] animate-fade-in"
          imgClassName="drop-shadow-[0_18px_30px_rgba(0,0,0,0.8)]"
        />
      </div>

      {/* dialogue box */}
      <div className="relative z-10 w-full max-w-[560px] mx-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {picked && inReplies && (
          <div className="flex justify-end pb-2">
            <span className="px-3 py-1.5 rounded-2xl rounded-br-sm bg-[#e4bb70] text-[#20170a] text-sm font-bold shadow">
              {(name || '').trim() || '나'}: {picked}
            </span>
          </div>
        )}
        <div className="story-dialogue relative rounded-3xl border-2 border-[#d8b568] bg-[#080f1f]/95 px-5 pt-10 pb-4 shadow-2xl">
          <div className="absolute -top-11 left-4 flex items-end gap-2">
            <CharacterFace speaker={speaker} size={80} framed />
            <span className="mb-1 px-3 py-1 rounded-lg bg-gradient-to-r from-[#ffd985] to-[#c7963d] text-[#221603] font-bold text-sm shadow">
              {speaker}
            </span>
          </div>
          <p className={`font-serif text-[19px] leading-relaxed min-h-[60px] ${isNarration ? 'text-[#c8dcf5] italic' : 'text-[#fff6e2]'}`}>
            {shown}
          </p>

          {choiceStep ? (
            <div className="pt-3 space-y-2" onClick={e => e.stopPropagation()}>
              {choiceStep.options.map(o => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => choose(o.label, o.replies)}
                  className="w-full min-h-[52px] px-4 rounded-2xl text-left text-[17px] font-bold text-[#20170a] bg-gradient-to-r from-[#fff1c9] to-[#f1cf83] border-2 border-[#ffe3a3] shadow active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 shrink-0 text-[#a8741f]" />
                  {fillName(o.label, name)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-[#8fa2be]">{cursor + 1} / {lines.length}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); next(); }}
                className={`min-h-[48px] px-5 rounded-2xl font-bold text-base flex items-center gap-1 cursor-pointer text-[#20170a] ${
                  isLast ? 'bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] animate-pulse' : 'bg-[#e4bb70]'
                }`}
              >
                {isLast ? doneLabel : '다음'} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        {!isLast && !choiceStep && <p className="text-center text-[11px] text-[#7f95b5] pt-1.5">화면을 눌러도 넘어가요</p>}
        {choiceStep && <p className="text-center text-[12px] text-[#ffd880] pt-1.5">하나를 골라 주세요!</p>}
      </div>
    </div>
  );
};
