import { ParticipantState, AppScreen } from '../types';

const SCREENS: Record<AppScreen, true> = {
  treasure:true, start:true, characters:true, prologue:true, enroll:true, camera:true, thinking:true,
  assigned:true, map:true, scan:true, dialogue:true, mission:true, evidence:true,
  reward:true, passport:true, bag:true, journal:true, portfolio:true, survey:true,
  ending:true, admin:true, 'admin-login':true, minigame:true, 'junior-sky':true,
  'junior-final':true, 'field-guide':true, observatory:true, tickets:true, arcade:true
};
const isMission = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) < 7;

/**
 * Validates whether the participant is allowed to view targetScreen
 * based on current progress, enrollment, mission state, and administrator authentication.
 *
 * Free-Order Policy:
 * - Students can choose any of the 7 school booths in any order.
 * - Selection is tracked by state.selectedMissionIndex (0..6).
 * - Code scanning (scan) and mission screens require matching selectedMissionIndex.
 * - All 7 distinct mission IDs must be completed to unlock finale screens (ending, portfolio, survey).
 * - 'admin' screen requires verified server-side admin authentication (isAdmin === true).
 * - 'observatory' (별빛 관측실) is open to enrolled students anytime.
 */
export function validateScreenGuard(
  targetScreen: AppScreen,
  state: ParticipantState,
  isAdmin: boolean = false
): AppScreen {
  // Browser history can contain stale or malformed screen names after an update.
  if (!Object.prototype.hasOwnProperty.call(SCREENS, targetScreen)) return state.name && state.house !== null ? 'map' : 'start';
  // 1. Admin access guard: MUST be authenticated with custom claim admin:true
  if (targetScreen === 'admin') {
    if (!isAdmin) {
      return 'admin-login';
    }
    return 'admin';
  }

  // 2. Open informational screens (accessible to anyone)
  if (['start', 'characters', 'prologue', 'minigame', 'field-guide', 'treasure', 'admin-login'].includes(targetScreen)) {
    return targetScreen;
  }

  // A spoken hat starts after the portrait, or an explicit accessibility fallback.
  if (targetScreen === 'thinking' && !state.photo && !state.sortingPhotoSkipped) return state.name ? 'camera' : 'enroll';

  // 3. Enrollment & Sorting flow guards
  if (!Number.isInteger(state.house) || state.house! < 0 || state.house! > 3) {
    if (['enroll', 'camera', 'thinking', 'assigned'].includes(targetScreen)) {
      return targetScreen;
    }
    // Protected in-game screen attempted before enrollment/sorting
    return state.name ? 'enroll' : 'start';
  }

  // At this point: state.house !== null (student is enrolled and sorted)
  const uniqueCompletedCount = new Set((state.completed || []).filter(isMission)).size;
  const isAllCompleted = uniqueCompletedCount === 7;

  // Validate selection even for finished students reopening a mission record.
  if (targetScreen === 'mission' && !isMission(state.selectedMissionIndex)) return 'map';
  if (targetScreen === 'reward' && (!isMission(state.selectedMissionIndex) || !state.completed.includes(state.selectedMissionIndex))) return 'map';

  // 4. Post-completion rules (all 7 distinct missions completed)
  if (isAllCompleted) {
    // When all 7 are collected, scan / evidence / reward redirect to ending
    if (['scan', 'evidence'].includes(targetScreen)) {
      return 'ending';
    }
    // Ending, portfolio, survey, map, passport, journal, bag, observatory are allowed
    return targetScreen;
  }

  // 5. Pre-completion rules (unique completed < 7)
  // Ending, portfolio, and survey strictly require all 7 fragments
  if (['ending', 'portfolio', 'survey', 'junior-final'].includes(targetScreen)) {
    return 'map';
  }

  // 6. Observatory (별빛 관측실) is freely accessible for enrolled students
  if (targetScreen === 'observatory') {
    return 'observatory';
  }

  // 7. Mission screen guard: requires a valid selectedMissionIndex
  if (targetScreen === 'mission') {
    const selected = state.selectedMissionIndex;
    if (!isMission(selected)) {
      return 'map';
    }
    // If mission is not yet unlocked and not completed, student must unlock via scan screen
    if (state.unlocked !== selected && !state.completed.includes(selected)) {
      return 'scan';
    }
    return 'mission';
  }

  // 8. Evidence photo screen guard: requires selectedMissionIndex matching unlocked and pendingMission
  if (targetScreen === 'evidence') {
    const selected = state.selectedMissionIndex;
    if (!isMission(selected)) {
      return 'map';
    }
    if (state.unlocked !== selected || state.pendingMission !== selected) {
      return 'map';
    }
    return 'evidence';
  }

  // 9. Scan screen guard: requires a valid selectedMissionIndex
  if (targetScreen === 'scan') {
    const selected = state.selectedMissionIndex;
    if (!isMission(selected)) {
      return 'map';
    }
    // If this booth is already completed, return to map/mission
    if (state.completed.includes(selected)) {
      return 'mission';
    }
    return 'scan';
  }

  // 10. Dialogue screen guard: must have an active scene
  if (targetScreen === 'dialogue') {
    if (!state.story?.scene) {
      return 'map';
    }
    return 'dialogue';
  }

  // 11. In-game exploration screens: map, passport, bag, journal
  return targetScreen;
}
