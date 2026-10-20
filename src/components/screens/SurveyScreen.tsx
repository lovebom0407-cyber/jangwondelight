import React from 'react';
import { ArrowLeft, ExternalLink, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  onNavigate: (screen: any) => void;
}

const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSf2lx2IyMA5l-IUmRhgrEMNMhsMCCVmYDy8GDSCqSDVumpK8Q/viewform';

export const SurveyScreen: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <button
        type="button"
        onClick={() => onNavigate('ending')}
        className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 별밤 엔딩
      </button>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          YOUR VOICE · GOOGLE FORMS
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          오늘 체험에서 무엇을 배웠나요?
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          우리 가족의 별밤 마법학교 교육 효과 설문조사
        </p>
      </div>

      {/* Parchment Explanation Card */}
      <div className="rounded-2xl border-2 border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#eed4a4] to-[#deb87a] p-5 text-[#2d2215] shadow-xl space-y-4">
        <h3 className="font-serif text-base font-bold text-[#201404]">
          가족과 함께하는 3~5분 설문
        </h3>

        <div className="space-y-2 text-xs font-serif text-[#3e2c1a] leading-relaxed">
          <p>
            별자리와 우주에 대한 호기심, 근거 있는 추리력, AI 그림책과 AI 체험부스를 통한 창의적 상상력, 가족 간의 따뜻한 협동 등 오늘 행사에서 느낀 배움을 솔직하게 들려주세요.
          </p>
          <div className="p-3 rounded-xl bg-[#fff7e6]/80 border border-[#bda174] space-y-1 text-[11px] font-sans">
            <p><strong>설문 구성:</strong> 5점 척도 10문항 + 자유 주관식 3문항 (약 3~5분 소요)</p>
            <p><strong>척도 안내:</strong> 1점(전혀 그렇지 않다) ~ 5점(매우 그렇다)</p>
          </div>
        </div>

        {/* Primary Link Button to Google Forms */}
        <a
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 no-underline cursor-pointer"
        >
          <span>Google 만족도 설문 열기</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Honest Privacy Notice - No Fake Submission Verification */}
      <div className="rounded-xl p-4 bg-[#0a1527] border border-[#b7985b]/40 space-y-2 text-xs text-[#9eb2ce]">
        <div className="flex items-center gap-1.5 font-bold text-[#ffd880]">
          <ShieldCheck className="w-4 h-4 text-[#ffd880]" />
          <span>설문 응답 및 개인정보 안내</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          새 탭에서 열리는 Google 설문지를 작성하고 제출하면 행사 운영자의 비공개 Google 스프레드시트에 안전하게 보관됩니다.
          이 웹앱에서는 학생 이름, 입학 사진, 게임 진행 데이터를 Google 설문으로 절대 자동 전송하지 않으며,
          제출 여부를 임의로 가짜 완료 처리하지 않습니다. 설문을 마친 뒤에는 이 화면으로 돌아와 포트폴리오를 저장해 주세요.
        </p>
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('portfolio')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-xs text-[#f6ebd5] bg-[#172c4a] hover:bg-[#1f3a61] border border-[#b7985b]/50 shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#e4bb70]" />
          <span>나의 완성 포트폴리오 · PDF 저장하기 →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ending')}
          className="w-full py-2.5 text-xs text-[#8ea3c2] hover:text-[#d8c7a7] transition-colors text-center"
        >
          건너뛰고 별밤 엔딩으로 돌아가기
        </button>
      </div>
    </div>
  );
};
