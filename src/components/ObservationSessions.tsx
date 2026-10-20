import React from 'react';

/** Standard booth 06 is stored as mission ID 0; never infer it from ID + 1. */
export const isObservationBooth = (id: number, mode?: string) => mode === 'junior' ? id === 6 : id === 0;

export function ObservationSessions({ grade }: { grade?: string }) {
  const session = ['유치원', '1학년', '2학년', '3학년'].includes(grade || '') ? 1
    : ['4학년', '5학년', '6학년'].includes(grade || '') ? 2 : null;
  return (
    <section data-observation-sessions className="rounded-2xl border-2 border-[#e4bb70] bg-[#102744] p-5 space-y-4">
      <h2 className="font-serif text-xl font-bold text-[#f6ebd5]">천체관측 학년별 참여 안내</h2>
      {session && <p data-assigned-observation-session={session} className="text-lg font-extrabold text-[#ffe4a1]">{grade} 학생은 {session}부에 참여해요.</p>}
      <dl className="space-y-3 text-base text-[#d6e4f3]">
        {[[1, '유치원·1·2·3학년'], [2, '4·5·6학년']].map(([part, grades]) => <div key={part} className={`rounded-xl border-2 p-3 ${session === part ? 'border-[#e4bb70] bg-[#1d3a59]' : 'border-[#456181]'}`}>
          <dt className="text-xl font-extrabold text-[#f4d79a]">{part}부</dt><dd className="mt-1 font-bold">{grades}</dd>
        </div>)}
      </dl>
      <p className="text-base leading-relaxed text-[#b6cce5]">학년에 맞는 회차에 보호자와 함께 천체관측 부스로 와 주세요. 현장 선생님의 안내를 따라요.</p>
    </section>
  );
}
