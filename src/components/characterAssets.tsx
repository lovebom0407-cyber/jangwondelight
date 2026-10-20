import React from 'react';
import { CharacterName } from '../types';
import { CharacterId, getCharacterById, getCharacterByName, getCharacterImageSrc } from '../data/characters';

export interface CharacterProps {
  className?: string;
  size?: number;
  framed?: boolean;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * Faceless Vintage Brown Crumpled Pointed Sorting Hat
 * (얼굴 없는 낡은 갈색 뾰족 분류모자)
 * Pure, elegant SVG illustration without human faces, perfect for AR camera overlay.
 */
export const FacelessSortingHat: React.FC<{ size?: number; className?: string }> = ({
  size = 180,
  className = ''
}) => {
  return (
    <svg
      viewBox="0 0 240 220"
      width={size}
      height={(size * 220) / 240}
      className={`select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="leatherGlow" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#8d5f35" />
          <stop offset="45%" stopColor="#5b3b1f" />
          <stop offset="100%" stopColor="#2c1a0c" />
        </radialGradient>
        <linearGradient id="brimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7a4e28" />
          <stop offset="50%" stopColor="#482e16" />
          <stop offset="100%" stopColor="#1e1208" />
        </linearGradient>
        <filter id="hatShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#050810" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Wide Distorted Vintage Brim */}
      <path
        d="M12 178 C35 155, 75 162, 120 160 C165 158, 205 165, 228 178 C215 198, 170 206, 120 205 C65 204, 25 196, 12 178 Z"
        fill="url(#brimGrad)"
        stroke="#2d1909"
        strokeWidth="3"
        filter="url(#hatShadow)"
      />

      {/* Brim folds and creases */}
      <path
        d="M38 174 C75 165, 160 165, 202 174"
        stroke="#9b6e41"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M48 184 C85 194, 155 194, 192 184"
        stroke="#1a0f05"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Main Crown Body with Crumpled Leather Folds */}
      <path
        d="M58 165 C62 135, 68 105, 88 78 C96 68, 108 50, 118 32 C122 26, 128 14, 134 16 C140 18, 138 28, 136 38 C132 58, 124 72, 138 90 C152 108, 162 132, 178 165 C138 156, 98 156, 58 165 Z"
        fill="url(#leatherGlow)"
        stroke="#241408"
        strokeWidth="3"
      />

      {/* Bent Floppy Tip of Pointed Hat */}
      <path
        d="M124 24 C132 10, 155 12, 164 24 C168 30, 160 38, 150 36 C138 34, 132 30, 124 24 Z"
        fill="#5a381c"
        stroke="#241408"
        strokeWidth="2"
      />

      {/* Deep Leather Creases & Magic Folds (Faceless character expression in folds) */}
      <path
        d="M84 135 C98 128, 138 128, 152 135"
        stroke="#1a0e05"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M86 137 C98 131, 136 131, 150 137"
        stroke="#a37648"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      <path
        d="M92 105 C102 96, 126 96, 136 104"
        stroke="#1f1106"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M94 107 C104 99, 124 99, 134 106"
        stroke="#a37648"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Subtle Patches / Stitches */}
      <path d="M72 145 L78 142 M74 148 L80 145" stroke="#c49b6a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M142 85 L146 80 M145 88 L149 83" stroke="#c49b6a" strokeWidth="1.8" strokeLinecap="round" />

      {/* Golden Starlight Gleam Accent */}
      <circle cx="134" cy="18" r="2.5" fill="#ffd880" className="animate-pulse" />
      <path d="M134 12 L134 24 M128 18 L140 18" stroke="#ffe7a0" strokeWidth="1" opacity="0.8" />
    </svg>
  );
};

/**
 * 캐릭터 PNG 렌더러 — 모든 화자는 src/data/characters.ts 레지스트리를 통해 연결됩니다.
 * - CharacterFull: 전신 (object-fit: contain, 잘림 없음)
 * - CharacterFace: 얼굴 확대 원형 프레임 (모바일 대화·목록용)
 * - 이미지 로딩 실패 시 파일명을 포함한 오류 표시를 명확히 보여줍니다.
 */
const ImageErrorBox: React.FC<{ id: string; name: string; style?: React.CSSProperties; className?: string; round?: boolean }> = ({
  id,
  name,
  style,
  className = '',
  round = false
}) => (
  <div
    role="img"
    aria-label={`${name} 이미지를 불러오지 못했습니다`}
    className={`flex flex-col items-center justify-center text-center bg-[#2a1010] border-2 border-dashed border-[#f87171] text-[#fecaca] leading-tight p-1 ${round ? 'rounded-full' : 'rounded-2xl'} ${className}`}
    style={style}
  >
    <span className="text-[10px] font-bold">이미지 로딩 실패</span>
    <span className="text-[9px] opacity-80 break-all">{name} · {id}.png</span>
  </div>
);

export const CharacterFull: React.FC<{
  speaker: CharacterName | CharacterId;
  height?: number | string;
  className?: string;
  imgClassName?: string;
}> = ({ speaker, height = 260, className = '', imgClassName = '' }) => {
  const profile = getCharacterByName(speaker) || getCharacterById(speaker);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [speaker]);
  if (!profile) return <ImageErrorBox id={String(speaker)} name="등록되지 않은 화자" style={{ height, width: '100%' }} />;
  if (failed) return <ImageErrorBox id={profile.id} name={profile.name} style={{ height, width: '100%' }} className={className} />;
  return (
    <div className={`relative flex items-end justify-center ${className}`} style={{ height }}>
      <img
        loading="lazy"
        decoding="async"
        src={getCharacterImageSrc(profile.id)}
        alt={`${profile.name} 전신 그림`}
        onError={() => setFailed(true)}
        draggable={false}
        className={`h-full w-full select-none ${imgClassName}`}
        style={{ objectFit: 'contain', objectPosition: 'center bottom' }}
      />
    </div>
  );
};

export const CharacterFace: React.FC<{
  speaker: CharacterName | CharacterId;
  size?: number;
  framed?: boolean;
  className?: string;
}> = ({ speaker, size = 96, framed = false, className = '' }) => {
  const profile = getCharacterByName(speaker) || getCharacterById(speaker);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [speaker]);
  if (!profile) return <ImageErrorBox id={String(speaker)} name="미등록" round style={{ width: size, height: size }} className={className} />;
  if (failed) return <ImageErrorBox id={profile.id} name={profile.name} round style={{ width: size, height: size }} className={className} />;
  const imgW = size * profile.face.zoom;
  const imgH = imgW * 1.5;
  const left = size / 2 - profile.face.x * imgW;
  const top = size / 2 - profile.face.y * imgH;
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 select-none bg-gradient-to-b from-[#1d3152] to-[#0a1528] ${framed ? 'border-[3px] shadow-[0_6px_20px_rgba(0,0,0,0.55)]' : 'border-2'} ${className}`}
      style={{ width: size, height: size, borderColor: profile.accent }}
      title={profile.name}
    >
      <img
        loading="lazy"
        decoding="async"
        src={getCharacterImageSrc(profile.id)}
        alt={`${profile.name} 얼굴`}
        onError={() => setFailed(true)}
        draggable={false}
        className="absolute max-w-none"
        style={{ width: imgW, height: imgH, left, top }}
      />
    </div>
  );
};

/** 레지스트리 기반 범용 아바타 (기존 호출부 호환) */
export const CharacterAvatar: React.FC<{
  speaker: CharacterName;
  size?: number;
  framed?: boolean;
  className?: string;
}> = ({ speaker, size = 96, framed = false, className = '' }) => (
  <CharacterFace speaker={speaker} size={size} framed={framed} className={className} />
);

const makeFace = (id: CharacterId): React.FC<CharacterProps> => ({ size = 96, className = '', framed = false }) => (
  <CharacterFace speaker={id} size={size} framed={framed} className={className} />
);

export const HarryAvatar = makeFace('harry');
export const HermioneAvatar = makeFace('hermione');
export const RonAvatar = makeFace('ron');
export const MalfoyAvatar = makeFace('draco');
export const VoldemortAvatar = makeFace('voldemort');
export const DumbledoreAvatar = makeFace('dumbledore');
export const McGonagallAvatar = makeFace('mcgonagall');
export const HagridAvatar = makeFace('hagrid');
export const HedwigAvatar = makeFace('hedwig');
export const DobbyAvatar = makeFace('dobby');
export const SnapeAvatar = makeFace('snape');
/**
 * AR Sorting Hat Overlay for Camera View
 * Adjustable height (hatY: -15..30) and size (hatScale: 40..110)
 * Uses the genuine faceless vintage brown pointed sorting hat illustration.
 */
export const MagicHatAROverlay: React.FC<{
  hatY: number;
  hatScale: number;
  className?: string;
}> = ({ hatY, hatScale, className = '' }) => {
  return (
    <div
      className={`absolute pointer-events-none transition-all duration-100 ease-out select-none flex items-center justify-center ${className}`}
      style={{
        top: `${hatY}%`,
        width: `${hatScale}%`,
        left: `${(100 - hatScale) / 2}%`,
        filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.85))'
      }}
    >
      <FacelessSortingHat className="w-full h-auto" />
    </div>
  );
};

/**
 * Starlight Castle Banner
 * Atmospheric, elegant starry night castle banner framing the school's hero view.
 */
export const CastleBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-[#d8b568]/40 bg-gradient-to-b from-[#11233e] via-[#081427] to-[#040a16] p-5 sm:p-6 text-center shadow-[0_12px_36px_rgba(0,0,0,0.7)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#f7d890_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute top-3 right-5 text-3xl sm:text-4xl select-none text-[#ffdf99] drop-shadow-[0_0_24px_#e5b84c]">
        ☾
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <svg viewBox="0 0 400 110" className="w-full max-w-sm h-auto opacity-80 drop-shadow-md">
          <path d="M0 110 L60 65 L140 95 L220 55 L300 85 L360 60 L400 80 L400 110 Z" fill="#0c192e" />
          <rect x="180" y="42" width="40" height="68" fill="#132644" />
          <polygon points="175,42 200,8 225,42" fill="#1d375e" stroke="#e5b84c" strokeWidth="1.2" />
          <circle cx="200" cy="7" r="3" fill="#ffe9a0" />
          <rect x="136" y="58" width="30" height="52" fill="#10203a" />
          <polygon points="132,58 151,26 170,58" fill="#173157" stroke="#e5b84c" strokeWidth="1" />
          <circle cx="151" cy="25" r="2.5" fill="#ffe9a0" />
          <rect x="234" y="58" width="30" height="52" fill="#10203a" />
          <polygon points="230,58 249,26 268,58" fill="#173157" stroke="#e5b84c" strokeWidth="1" />
          <circle cx="249" cy="25" r="2.5" fill="#ffe9a0" />
          <rect x="194" y="56" width="12" height="18" rx="6" fill="#ffe396" opacity="0.9" />
          <rect x="145" y="70" width="12" height="16" rx="6" fill="#ffe396" opacity="0.65" />
          <rect x="243" y="70" width="12" height="16" rx="6" fill="#ffe396" opacity="0.65" />
        </svg>
      </div>
    </div>
  );
};
