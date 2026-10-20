import React from 'react';
import { INTRO_DIALOGUE } from '../../data/storyData';
import { VisualNovel } from '../VisualNovel';

interface Props {
  onNavigate: (screen: any) => void;
}

/** 시작 화면의 [별밤 이야기 듣기] — 글 대신 캐릭터 대화로 이야기를 들려줍니다. */
export const PrologueScreen: React.FC<Props> = ({ onNavigate }) => (
  <VisualNovel
    title="처음 이야기 · 헤드위그의 입학 편지"
    lines={INTRO_DIALOGUE}
    name="친구"
    onDone={() => onNavigate('enroll')}
    doneLabel="입학하기!"
    onSkip={() => onNavigate('start')}
  />
);
