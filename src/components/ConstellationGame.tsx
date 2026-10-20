import React, { useState } from 'react';
import { Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface StarPoint {
  id: number;
  name: string;
  x: number;
  y: number;
}

const CASSIOPEIA_STARS: StarPoint[] = [
  { id: 1, name: '엡실론(ε)', x: 18, y: 35 },
  { id: 2, name: '델타(δ)', x: 38, y: 72 },
  { id: 3, name: '감마(γ)', x: 55, y: 40 },
  { id: 4, name: '알파(α)', x: 74, y: 68 },
  { id: 5, name: '베타(β)', x: 88, y: 28 }
];

export const ConstellationGame: React.FC<{
  onComplete?: () => void;
  className?: string;
}> = ({ onComplete, className = '' }) => {
  const [connectedOrder, setConnectedOrder] = useState<number[]>([]);
  const isFinished = connectedOrder.length === 5;

  const handleStarClick = (starId: number) => {
    if (isFinished) return;
    const nextExpected = connectedOrder.length + 1;
    if (starId === nextExpected) {
      const nextList = [...connectedOrder, starId];
      setConnectedOrder(nextList);
      if (nextList.length === 5 && onComplete) {
        onComplete();
      }
    }
  };

  const handleReset = () => {
    setConnectedOrder([]);
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-b from-[#0c182c] to-[#060e1c] border border-[#b7985b]/40 shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#f5d083] animate-pulse" />
          <h3 className="font-serif font-bold text-base text-[#f5d083]">
            카시오페이아 별빛 잇기
          </h3>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs px-2.5 py-1 rounded border border-[#b7985b]/30 text-[#d8c7a7] hover:text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> 다시 잇기
        </button>
      </div>

      <p className="text-xs text-[#b8c5d9] mb-3">
        크게 반짝이는 별을 차례로 터치하여 도계읍 가을 밤하늘의 W 별자리를 완성해 보세요.
      </p>

      {/* Star Canvas */}
      <div className="relative w-full aspect-[16/9] bg-[#030814] rounded-xl overflow-hidden border border-[#526685]/40 select-none">
        {/* Background faint nebulae and field stars */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#182d52,transparent_60%)] opacity-40 pointer-events-none" />
        <div className="absolute top-4 left-10 text-[9px] text-[#4d668e] select-none">도계읍 북동쪽 하늘 (19~21시 기준)</div>

        {/* Constellation Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connectedOrder.map((starId, idx) => {
            if (idx === 0) return null;
            const prev = CASSIOPEIA_STARS.find(s => s.id === connectedOrder[idx - 1])!;
            const curr = CASSIOPEIA_STARS.find(s => s.id === starId)!;
            return (
              <line
                key={`line-${prev.id}-${curr.id}`}
                x1={`${prev.x}%`}
                y1={`${prev.y}%`}
                x2={`${curr.x}%`}
                y2={`${curr.y}%`}
                stroke="#ffd97d"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_#ffcc4d]"
              />
            );
          })}
        </svg>

        {/* Stars */}
        {CASSIOPEIA_STARS.map(star => {
          const isConnected = connectedOrder.includes(star.id);
          const isNext = connectedOrder.length + 1 === star.id;

          return (
            <button
              key={star.id}
              type="button"
              onClick={() => handleStarClick(star.id)}
              style={{ left: `${star.x}%`, top: `${star.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 focus:outline-none flex flex-col items-center group cursor-pointer ${
                isNext ? 'scale-125 animate-bounce' : 'hover:scale-110'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isConnected
                    ? 'bg-[#ffe494] text-[#241706] shadow-[0_0_16px_#ffce54]'
                    : isNext
                    ? 'bg-[#e5a83b] text-white ring-4 ring-[#ffe494]/40 shadow-[0_0_12px_#e5a83b]'
                    : 'bg-[#1b2b45] text-[#93a9ca] border border-[#445b7f]'
                }`}
              >
                ✦
              </div>
              <span className="text-[10px] text-[#f7e6c4] font-medium mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {star.name}
              </span>
            </button>
          );
        })}

        {/* Completed Badge */}
        {isFinished && (
          <div className="absolute inset-0 bg-[#09152b]/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 animate-fade-in">
            <CheckCircle2 className="w-10 h-10 text-[#67dca4] mb-1.5 drop-shadow-[0_0_12px_#67dca4]" />
            <h4 className="text-base font-serif font-bold text-[#ffe6a4]">
              카시오페이아 W 별자리 복원 완료!
            </h4>
            <p className="text-xs text-[#cbd8eb] mt-1 max-w-xs">
              다섯 별이 순서대로 이어져 빛을 되찾았습니다. W 모양이 선명하게 밤하늘에 새겨졌어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
