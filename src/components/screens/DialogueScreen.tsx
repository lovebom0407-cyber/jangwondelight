import React, { useEffect, useState } from 'react';
import { ParticipantState } from '../../types';
import { getMissionNumber } from '../../data/standardMissions';
import { getMissions, INTRO_DIALOGUE, FINALE_DIALOGUE } from '../../data/storyData';
import { VisualNovel } from '../VisualNovel';
import { ObservationSessions, isObservationBooth } from '../ObservationSessions';
import { ScriptStep } from '../../types';

interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
}

export const DialogueScreen: React.FC<Props> = ({
  state,
  onUpdateState,
  onNavigate
}) => {
  const scene = state.story?.scene;
  const missions = getMissions(state.experienceMode);
  const [observationIntroSeen, setObservationIntroSeen] = useState(false);
  useEffect(() => { setObservationIntroSeen(false); }, [scene?.kind, scene?.index, state.participantId, state.experienceMode]);

  if (!scene) {
    return (
      <div className="text-center py-14 space-y-4 max-w-[430px] mx-auto">
        <p className="text-sm text-[#cbd8eb]">진행 중인 대화가 없습니다.</p>
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] text-[#20170a] font-bold text-sm shadow cursor-pointer"
        >
          탐험 지도로 이동 →
        </button>
      </div>
    );
  }

  if (scene.kind === 'arrival' && isObservationBooth(scene.index, state.experienceMode) && !observationIntroSeen) {
    return <div className="space-y-4 pb-24 max-w-[430px] mx-auto">
      <ObservationSessions grade={state.grade} />
      <button type="button" className="field-primary" onClick={() => setObservationIntroSeen(true)}>천문수업 이야기 계속하기 →</button>
    </div>;
  }

  let lines: ScriptStep[] = [];
  let sceneTitle = '';
  const currentMission = missions[scene.index] || missions[0];

  if (scene.kind === 'intro') {
    lines = INTRO_DIALOGUE;
    sceneTitle = '처음 이야기 · 헤드위그의 입학 편지';
  } else if (scene.kind === 'finale') {
    lines = FINALE_DIALOGUE;
    sceneTitle = '마지막 이야기 · 마법사의 돌을 지켰어요';
  } else if (scene.kind === 'arrival') {
    sceneTitle = `0${getMissionNumber(scene.index, state.experienceMode)} ${currentMission.lessonName} · ${currentMission.title}`;
    lines = currentMission.introLines;
  } else {
    // reward scene
    sceneTitle = `0${getMissionNumber(scene.index, state.experienceMode)} ${currentMission.lessonName} · 미션 성공!`;
    lines = currentMission.rewardLines;
  }

  const finish = () => {
    const updatedStory = { ...state.story, scene: null };
    if (scene.kind === 'intro') {
      updatedStory.introDone = true;
      onUpdateState({ story: updatedStory });
      onNavigate('map');
    } else if (scene.kind === 'arrival') {
      onUpdateState({ story: updatedStory });
      onNavigate('mission');
    } else if (scene.kind === 'reward') {
      onUpdateState({ story: updatedStory });
      onNavigate('reward');
    } else {
      updatedStory.finaleDone = true;
      onUpdateState({ story: updatedStory });
      onNavigate('ending');
    }
  };

  const doneLabel =
    scene.kind === 'arrival' ? '미션 시작!' : scene.kind === 'intro' ? '모험 시작!' : scene.kind === 'finale' ? '별 보러 가기' : '별빛 받기';

  return (
    <VisualNovel
      title={sceneTitle}
      lines={lines}
      name={state.name}
      cursor={scene.cursor}
      onCursorChange={c => onUpdateState({ story: { ...state.story, scene: { ...scene, cursor: c } } })}
      onDone={finish}
      doneLabel={doneLabel}
      collected={state.spells && state.spells.length ? state.spells : state.completed}
    />
  );
};
