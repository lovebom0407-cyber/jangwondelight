import { confirmDialog } from '../DialogHost';
import React from 'react';
import { ParticipantState } from '../../types';
import { HOUSES } from '../../data/storyData';
import { removeParticipantEvidence } from '../../services/evidenceDb';
import { removeParticipant } from '../../services/storage';
import { Star, RefreshCw, UserCheck, Trash2, ArrowLeft, ShieldAlert } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
  onResetToStart: () => void;
  onShowToast: (msg: string) => void;
}

export const LanternScreen: React.FC<Props> = ({
  state,
  onNavigate,
  onResetToStart,
  onShowToast
}) => {
  const house = state.house !== null ? HOUSES[state.house] : HOUSES[0];
  const handleResetRecord = async () => {
    if (
      await confirmDialog(`정말 '${state.name}'님의 기기 기록(사진 및 진행 상황)을 삭제할까요?\n다른 참가자의 기록은 유지됩니다.`,
        { danger: true, okLabel: '네, 초기화할게요' }
      )
    ) {
      try {
        if (state.participantId) {
          await removeParticipantEvidence(state.participantId);
        }
        removeParticipant(state.name);
        onShowToast('현재 학생의 기록이 초기화되었습니다.');
        onResetToStart();
      } catch {
        onShowToast('기록 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-center">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 탐험 지도
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          MY MAGIC LANTERN
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          별밤을 밝히는 나의 랜턴
        </h2>
      </div>

      {/* House Shield & Big Glowing Lantern */}
      <div className="flex flex-col items-center justify-center space-y-4 py-2">
        <div
          className="w-20 h-24 rounded-t-2xl rounded-b-3xl border-3 flex items-center justify-center text-4xl shadow-xl font-serif"
          style={{
            borderColor: house.color,
            backgroundColor: `${house.color}22`,
            color: house.color,
            boxShadow: `0 0 35px ${house.color}44`
          }}
        >
          {house.symbol}
        </div>

        <div className="space-y-1">
          <h3 className="font-serif text-xl font-bold" style={{ color: house.color }}>
            {house.name} · {house.animal}
          </h3>
          <p className="text-xs text-[#d5e2f4]">{house.trait}</p>
        </div>

        <div className="relative my-3">
          <div
            className="w-20 h-28 rounded-t-3xl rounded-b-2xl border-3 flex items-center justify-center text-4xl"
            style={{
              borderColor: '#a07c48',
              background: `radial-gradient(ellipse at 50% 35%, ${house.color}, #121824 80%)`,
              boxShadow: `0 0 55px ${house.color}88`
            }}
          >
            <Star className="w-10 h-10 text-white fill-white animate-pulse" />
          </div>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-6 border-3 border-[#a07c48] rounded-full" />
        </div>

        <p className="text-xs text-[#aeb9cb] max-w-xs leading-relaxed italic">
          “{house.motto}”<br />
          이 빛이 다음 탐험으로 당신을 따뜻하게 인도할 거예요.
        </p>
      </div>

      {/* Device Records & Sync Panel */}
      <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32]/90 p-5 space-y-3.5 text-left shadow-xl">
        <h3 className="font-serif text-sm font-bold text-[#ffd880] flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          <span>이 기기의 기록 관리</span>
        </h3>

        <p className="text-xs text-[#a0b5d0] leading-relaxed">
          입학 정보와 탐험 진행은 브라우저에, 인증샷 원본은 기기 IndexedDB에 안전하게 보관됩니다.
          사진과 기록은 서버로 전송하지 않습니다. 다른 기기에는 자동으로 옮겨지지 않아요.
        </p>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onNavigate('enroll')}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-[#d8c7a7] bg-[#112038]/70 hover:bg-[#172b4c] border border-[#506686]/40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#ffd880]" />
            <span>다른 이름으로 입학 / 기존 기록 불러오기</span>
          </button>

          <button
            type="button"
            onClick={handleResetRecord}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-[#ff9885] bg-[#2d1414]/50 hover:bg-[#3d1818] border border-[#7e3434]/50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#ff8066]" />
            <span>현재 마법사({state.name})의 기기 기록 초기화</span>
          </button>
        </div>
      </div>
    </div>
  );
};
