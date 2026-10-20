import { ParticipantState, EvidenceItem } from '../types';
import { getEvidence } from './evidenceDb';

export type AwardValidationResult =
  | { ok: true; evidence: EvidenceItem }
  | { ok: false; error: string; message: string };

/**
 * Validates whether a participant is legitimately eligible to be awarded a star fragment.
 * Performs deep asynchronous verification against IndexedDB evidence, participant identity,
 * mission index, evidence kind (activity vs zep_quiz), and ZEP server approval requirements.
 */
export async function validateAwardStar(
  state: ParticipantState,
  missionIndex: number,
  evidenceLookup: (id: string) => Promise<EvidenceItem | null> = getEvidence
): Promise<AwardValidationResult> {
  // 1. Participant identity validation
  if (!state || !state.participantId || typeof state.name !== 'string' || !state.name.trim()) {
    return {
      ok: false,
      error: 'UNENROLLED_PARTICIPANT',
      message: '등록되지 않은 참가자이거나 프로필 정보가 올바르지 않습니다.'
    };
  }

  if (typeof state.house !== 'number' || state.house < 0 || state.house > 3) {
    return {
      ok: false,
      error: 'UNSORTED_PARTICIPANT',
      message: '기숙사 배정이 완료되지 않았습니다.'
    };
  }

  // 2. Mission bounds & duplicate check (Free-order policy: any 0..6 allowed)
  if (typeof missionIndex !== 'number' || missionIndex < 0 || missionIndex >= 7) {
    return {
      ok: false,
      error: 'INVALID_MISSION_INDEX',
      message: '유효하지 않은 부스 번호입니다.'
    };
  }

  const uniqueCompleted = new Set(state.completed || []);
  if (uniqueCompleted.size >= 7) {
    return {
      ok: false,
      error: 'ALL_MISSIONS_ALREADY_COMPLETED',
      message: '이미 모든 7개 부스의 별빛 조각을 모두 모았습니다.'
    };
  }

  if (uniqueCompleted.has(missionIndex)) {
    return {
      ok: false,
      error: 'DUPLICATE_STAR_AWARD',
      message: '이미 별빛 조각을 획득한 부스입니다.'
    };
  }

  // Selected mission consistency check (if selectedMissionIndex is tracked)
  if (
    typeof state.selectedMissionIndex === 'number' &&
    state.selectedMissionIndex !== missionIndex
  ) {
    return {
      ok: false,
      error: 'SELECTED_MISSION_MISMATCH',
      message: '현재 선택하여 진행 중인 부스와 일치하지 않습니다.'
    };
  }

  // 3. Unlock and pending status check
  if (state.unlocked !== missionIndex || state.pendingMission !== missionIndex) {
    return {
      ok: false,
      error: 'BOOTH_NOT_UNLOCKED_OR_PENDING',
      message: '부스 현장 확인 및 활동 수행이 먼저 완료되어야 합니다.'
    };
  }

  // 4. Record metadata check
  const record = state.records?.[missionIndex];
  const evidenceId = record?.evidenceId;
  if (!evidenceId || typeof evidenceId !== 'string' || !evidenceId.trim()) {
    return {
      ok: false,
      error: 'MISSING_EVIDENCE_ID',
      message: '미션 인증샷 기록이 존재하지 않습니다.'
    };
  }

  // 5. Deep IndexedDB evidence verification
  const evidence = await evidenceLookup(evidenceId);
  if (!evidence) {
    return {
      ok: false,
      error: 'EVIDENCE_NOT_FOUND_IN_STORAGE',
      message: '기기 저장소에서 인증샷 사진 데이터를 찾을 수 없습니다.'
    };
  }

  // Participant ID match check (prevents cross-contamination across profiles on same device)
  if (evidence.participantId !== state.participantId) {
    return {
      ok: false,
      error: 'PARTICIPANT_ID_MISMATCH',
      message: '현재 학생의 프로필과 일치하지 않는 인증샷입니다.'
    };
  }

  // Mission index match check
  if (evidence.mission !== missionIndex) {
    return {
      ok: false,
      error: 'MISSION_INDEX_MISMATCH',
      message: '해당 부스의 인증샷이 아닙니다.'
    };
  }

  // Evidence kind check: A ZEP quiz screenshot cannot masquerade as the field activity photo!
  if (evidence.kind === 'zep_quiz' || evidence.activitySlot === 'quiz') {
    return {
      ok: false,
      error: 'INVALID_EVIDENCE_KIND',
      message: '퀴즈 결과 스크린샷은 현장 활동 사진으로 인정되지 않습니다.'
    };
  }

  if (!evidence.jpeg || typeof evidence.jpeg !== 'string' || !evidence.jpeg.startsWith('data:image/')) {
    return {
      ok: false,
      error: 'INVALID_PHOTO_DATA',
      message: '인증샷 사진 데이터 형식이 올바르지 않습니다.'
    };
  }

  // 6. ZEP station verification
  // ZEP 퀴즈는 학생이 현장에서 풀고, 별빛은 활동 인증샷으로 지급합니다 (2026-10-09 운영 방식 단순화).
  // 퀴즈 결과 캡처 제출·서버 승인 요구는 없앴습니다.

  return {
    ok: true,
    evidence
  };
}
