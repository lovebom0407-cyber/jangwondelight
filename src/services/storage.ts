import { experienceForGrade } from './experience';
import { ParticipantState } from '../types';
import { emptyRewards, reconcileRewards } from './rewards';
import { normalizeClassroom } from './participantInfo';

const PREFIX = 'jangwon-starlight-2026-';
const ACTIVE_KEY = PREFIX + 'active-v2';
const DRAFT_KEY = PREFIX + 'draft-v2';
const PROFILE_PREFIX = PREFIX + 'profile-v2:';

/** Remove obsolete app-owned cloud credentials without touching profiles/photos. */
export function clearLegacyCloudCredentials() {
  try {
    const keys: string[] = [];
    for (let i=0; i<localStorage.length; i++) {
      const key=localStorage.key(i);
      if (key && /^jangwon-cloud-(login|dirty)-v1:/.test(key)) keys.push(key);
    }
    keys.forEach(key=>localStorage.removeItem(key));
  } catch {}
}

export function normalizeIdentity(name: string): string {
  return String(name || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
}

export function generateParticipantCode(seed?: string): string {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const num = Math.abs(hash % 9000) + 1000;
    return `BW-${num}`;
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `BW-${randomNum}`;
}

export function createBlankState(): ParticipantState {
  const id = crypto.randomUUID();
  return {
    participantId: id,
    participantCode: generateParticipantCode(id),
    name: '',
    school: '장원초',
    grade: '3학년',
    classroom: '',
    family: '',
    cloudPhotoConsent: false,
    house: null,
    photo: null,
    completed: [],
    selectedMissionIndex: null,
    unlocked: null,
    pendingMission: null,
    records: {},
    reflection: {},
    story: {
      introDone: false,
      finaleDone: false,
      scene: null,
      inspected: {},
      deduced: {},
      evidence: []
    },
    observatory: {
      completedConstellations: []
    },
    spells: [],
    rewards: emptyRewards(),
    arcade: { cleared: {} }
  };
}

function getProfileKey(name: string): string {
  return PROFILE_PREFIX + encodeURIComponent(normalizeIdentity(name));
}

export function loadParticipant(name: string): ParticipantState | null {
  const norm = normalizeIdentity(name);
  if (!norm) return null;
  try {
    const raw = localStorage.getItem(getProfileKey(norm));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return cleanParticipantState(parsed);
  } catch {
    return null;
  }
}

export function saveParticipant(state: ParticipantState) {
  const norm = normalizeIdentity(state.name);
  if (!norm) return;
  try {
    localStorage.setItem(getProfileKey(norm), JSON.stringify(state));
    localStorage.setItem(ACTIVE_KEY, norm);
    localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    // If quota exceeded due to large photo, try stripping photo
    try {
      const stripped = { ...state, photo: null };
      localStorage.setItem(getProfileKey(norm), JSON.stringify(stripped));
      localStorage.setItem(ACTIVE_KEY, norm);
    } catch {}
    throw err;
  }
}

export function saveDraft(name: string, family: string, school: string = '장원초', grade: string = '3학년', classroom: string = '') {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, family, school, grade, classroom: normalizeClassroom(classroom) }));
  } catch {}
}

export function loadDraft(): { name: string; family: string; school?: string; grade?: string; classroom?: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadCurrentParticipant(): ParticipantState | null {
  try {
    const activeName = localStorage.getItem(ACTIVE_KEY);
    if (activeName) {
      const loaded = loadParticipant(activeName);
      if (loaded) return loaded;
    }
    const draft = loadDraft();
    if (draft && (draft.name || draft.family)) {
      const b = createBlankState();
      b.name = draft.name;
      b.family = draft.family;
      if (draft.school) b.school = draft.school;
      if (draft.grade) b.grade = draft.grade;
      if (draft.classroom) b.classroom = normalizeClassroom(draft.classroom);
      return b;
    }
  } catch {}
  return null;
}

export function removeParticipant(name: string) {
  const norm = normalizeIdentity(name);
  if (!norm) return;
  try {
    localStorage.removeItem(getProfileKey(norm));
    localStorage.removeItem(DRAFT_KEY);
    if (localStorage.getItem(ACTIVE_KEY) === norm) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {}
}

export function listAllLocalParticipants(): ParticipantState[] {
  const list: ParticipantState[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PROFILE_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          const state = cleanParticipantState(parsed);
          if (state) list.push(state);
        }
      }
    }
  } catch {}
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function cleanParticipantState(s: any): ParticipantState | null {
  if (!s || typeof s.name !== 'string') return null;
  const blank = createBlankState();
  const id = typeof s.participantId === 'string' && s.participantId.trim() ? s.participantId : crypto.randomUUID();
  const house = Number.isInteger(s.house) && s.house >= 0 && s.house <= 3 ? s.house : null;
  // Free choice: completed array contains unique valid mission IDs 0..6 (no sequential truncation!)
  const completed = Array.isArray(s.completed)
    ? (Array.from(new Set(s.completed.filter((x: any) => Number.isInteger(x) && x >= 0 && x < 7))) as number[])
    : [];

  const rawSelected = Number.isInteger(s.selectedMissionIndex) && s.selectedMissionIndex >= 0 && s.selectedMissionIndex < 7
    ? s.selectedMissionIndex
    : (Number.isInteger(s.unlocked) && s.unlocked >= 0 && s.unlocked < 7 ? s.unlocked : null);

  const rawRecords = s.records && typeof s.records === 'object' && !Array.isArray(s.records) ? { ...s.records } : {};

  // Normalize per-mission status records
  for (let m = 0; m < 7; m++) {
    if (!rawRecords[m] || typeof rawRecords[m] !== 'object' || Array.isArray(rawRecords[m])) rawRecords[m] = {};
    if (completed.includes(m)) {
      rawRecords[m].status = 'completed';
    } else if (s.pendingMission === m) {
      rawRecords[m].status = 'pending_verification';
    } else if (s.unlocked === m) {
      rawRecords[m].status = rawRecords[m].status || 'in_progress';
    } else {
      rawRecords[m].status = rawRecords[m].status || 'not_started';
    }
  }

  const rawObservatory = s.observatory && typeof s.observatory === 'object'
    ? {
        completedConstellations: Array.isArray(s.observatory.completedConstellations) ? s.observatory.completedConstellations : [],
        customConstellation: s.observatory.customConstellation || undefined,
        lastViewedConstellation: s.observatory.lastViewedConstellation || undefined,
        lastObservationDate: s.observatory.lastObservationDate || undefined,
        lastObservationHour: typeof s.observatory.lastObservationHour === 'number' ? s.observatory.lastObservationHour : undefined
      }
    : { completedConstellations: [] };

  return {
    ...blank,
    ...s,
    cloudPhotoConsent: false,
    sortingPhotoSkipped: s.sortingPhotoSkipped === true,
    participantId: id,
    participantCode: s.participantCode || generateParticipantCode(id || s.name),
    experienceMode: s.experienceMode === 'junior' || s.experienceMode === 'standard' ? s.experienceMode : experienceForGrade(s.grade || '3학년'),
    school: s.school || '장원초',
    grade: s.grade || '3학년',
    classroom: normalizeClassroom(s.classroom),
    house,
    completed,
    selectedMissionIndex: rawSelected,
    unlocked: Number.isInteger(s.unlocked) && s.unlocked >= 0 && s.unlocked < 7 ? s.unlocked : null,
    pendingMission: Number.isInteger(s.pendingMission) && s.pendingMission >= 0 && s.pendingMission < 7 ? s.pendingMission : null,
    records: rawRecords,
    reflection: s.reflection && typeof s.reflection === 'object' ? s.reflection : {},
    story: {
      ...blank.story,
      ...(s.story || {})
    },
    observatory: rawObservatory,
    fieldObservation: s.fieldObservation && typeof s.fieldObservation.note === 'string' && typeof s.fieldObservation.recordedAt === 'string' && Number.isFinite(Date.parse(s.fieldObservation.recordedAt)) ? { target: String(s.fieldObservation.target || '').slice(0,80), note: s.fieldObservation.note.slice(0,1000), recordedAt: s.fieldObservation.recordedAt } : undefined,
    rewards: reconcileRewards(s.rewards, completed, rawRecords),
    arcade: {
      cleared: Object.fromEntries(
        Object.entries((s.arcade && typeof s.arcade.cleared === 'object' && s.arcade.cleared) || {})
          .filter(([k, v]) => /^(\d|troll|ep\d+)$/.test(k) && Number.isInteger(v))
          .map(([k, v]) => [k, Math.max(0, Math.min(10, v as number))])
      ),
      seen: Array.isArray(s.arcade?.seen) ? s.arcade.seen.filter((x: any) => typeof x === 'string').slice(0, 50) : [],
      duel: { loadout: Array.isArray(s.arcade?.duel?.loadout) ? s.arcade.duel.loadout.filter((x: any) => typeof x === 'string').slice(0, 4) : [] }
    },
    spells: Array.isArray(s.spells)
      ? (Array.from(new Set(s.spells.filter((x: any) => Number.isInteger(x) && x >= 0 && x < 7))) as number[])
      : []
  };
}
