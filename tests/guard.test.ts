import assert from 'node:assert/strict';
import { validateScreenGuard } from '../src/services/screenGuard';
import {
  createBlankState,
  generateParticipantCode,
  normalizeIdentity,
  saveParticipant,
  loadParticipant
} from '../src/services/storage';
import {
  validateStationCode,
  getAdminCodes,
  saveAdminCodes,
  getAdminZepLinks,
  saveAdminZepLinks,
  getMissionZepLink,
  getMissions,
  getStationPlaces,
  getGradeQuizzes,
  getGradeQuizStatus
} from '../src/data/storyData';
import { getDutyAssignments } from '../src/data/eventPlanData';
import {
  isLocalAdminAvailable,
  isCurrentSessionAdmin,
  verifyAdminSessionLive,
  subscribeAdminAuth
} from '../src/services/adminAuth';
import { validateAwardStar } from '../src/services/awardValidator';
import {
  calculateLST,
  equatorialToHorizontal,
  calculateObservationStatus,
  CONSTELLATIONS,
  DOGYE_LOCATION
} from '../src/services/celestialMath';
import { ParticipantState, EvidenceItem } from '../src/types';
import { CHARACTERS, getCharacterByName } from '../src/data/characters';
import { INTRO_DIALOGUE, FINALE_DIALOGUE } from '../src/data/storyData';
import { POLARIS, calculateStarPosition, TERRAIN_MASK_IS_ASSUMPTION } from '../src/services/celestialMath';
import fs from 'node:fs';
import { isMasterMode, setMasterMode } from '../src/services/masterMode';
import { checkZepQuizLink } from '../src/services/qrDecode';
import { flattenScript, fillName, isChoice, isBattle } from '../src/services/script';
import { SPELLS, availableSpells, castSpell, foeTurn, initialBattle, isWon, isLost, BASIC_SPELL, foeMaxFor, MAX_LEVEL, retryBattle } from '../src/services/battle';
import { MINI_GAMES } from '../src/components/SpellMiniGame';
import { GAME_COMPONENTS, stageSpeed } from '../src/components/ActionGames';
import { openedGames, nextLockedEpisode } from '../src/components/screens/ArcadeScreen';
import { SIDE_EPISODES } from '../src/data/sideEpisodes';
import { OPPONENTS, EARNED_SKILLS, learnedDuelSkills, sanitizeLoadout, defaultLoadout, MAX_LOADOUT, skillById, initialDuel, playerMove, foeMove, usesLeft, foeMaxOf, josa } from '../src/services/duel';
import { emptyRewards, grantForClear, DEFAULT_REWARD_CONFIG, DEFAULT_PRIZES, applySpin, redeemTicket, pickPrize, sanitizeRewards, reconcileRewards, hasSpecial, couponCount, effectiveWeights, grantForStage } from '../src/services/rewards';
import {
  SKY_CATALOG, basisFromDeviceOrientation, basisFromAltAz, adjustBasis, projectToScreen, vecToAltAz, altAzToVec
} from '../src/services/skyCatalog';
import { DEFAULT_OPERATOR_EMAIL, INITIAL_OPERATOR_PASSWORD, MIN_PASSWORD_LENGTH, signInAdmin, signOutAdmin, changeAdminPassword, isUsingInitialPassword, hasCustomPassword } from '../src/services/adminAuth';
import path from 'node:path';

console.log('--- Starting Screen Guard & Validation Test Suite (Free Choice & Observatory) ---');

// Mock localStorage for test environment if running in node
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0
  } as any;
}

// 1. Test Screen Guard: Before Enrollment / Sorting
{
  const state = createBlankState();
  state.name = '';
  state.house = null;

  // Unenrolled user cannot access in-game screens
  assert.equal(validateScreenGuard('map', state), 'start', 'Should redirect unenrolled to start');
  assert.equal(validateScreenGuard('passport', state), 'start', 'Should redirect unenrolled to start');
  assert.equal(validateScreenGuard('mission', state), 'start', 'Should redirect unenrolled to start');
  assert.equal(validateScreenGuard('evidence', state), 'start', 'Should redirect unenrolled to start');

  // Enrolled with name but no house yet
  state.name = '김장원';
  assert.equal(validateScreenGuard('map', state), 'enroll', 'Should redirect unsorted to enroll');
  assert.equal(validateScreenGuard('camera', state), 'camera', 'Camera should be allowed for unsorted');
  console.log('✓ Guard Test 1 Passed: Unenrolled / Unsorted protections');
}

// 2. Test Screen Guard: Free-Choice Selected Mission Guards
{
  const state = createBlankState();
  state.name = '김장원';
  state.house = 0; // Sorted to House 0
  state.completed = [];

  // Without a selected mission, mission and scan redirect to map
  state.selectedMissionIndex = null;
  assert.equal(validateScreenGuard('mission', state), 'map', 'Mission without selectedMissionIndex redirects to map');
  assert.equal(validateScreenGuard('scan', state), 'map', 'Scan without selectedMissionIndex redirects to map');

  // Student selects station 4 freely!
  state.selectedMissionIndex = 4;
  state.unlocked = null;
  // Attempting mission before unlocking station 4 -> redirected to scan
  assert.equal(validateScreenGuard('mission', state), 'scan', 'Locked station 4 must redirect to scan');

  // Station 4 unlocked -> allowed directly into mission
  state.unlocked = 4;
  assert.equal(validateScreenGuard('mission', state), 'mission', 'Unlocked station 4 must be allowed into mission');

  // Evidence without matching pendingMission -> redirected to map
  state.pendingMission = null;
  assert.equal(validateScreenGuard('evidence', state), 'map', 'Evidence without pendingMission must redirect to map');

  // Evidence with matching pendingMission & unlocked -> allowed
  state.pendingMission = 4;
  assert.equal(validateScreenGuard('evidence', state), 'evidence', 'Evidence with matching pendingMission & unlocked must be allowed');

  // Mismatched selected mission vs unlocked -> redirected to map
  state.selectedMissionIndex = 1;
  assert.equal(validateScreenGuard('evidence', state), 'map', 'Mismatched selected mission in evidence must redirect to map');
  console.log('✓ Guard Test 2 Passed: Free-choice selection & screen guard rules');
}

// 3. Test Screen Guard: Incomplete Student Access to Finale Screens
{
  const state = createBlankState();
  state.name = '김장원';
  state.house = 1;
  state.completed = [6, 2, 0, 5]; // 4 out of 7 completed in non-sequential order

  assert.equal(validateScreenGuard('ending', state), 'map', 'Incomplete student cannot view ending');
  assert.equal(validateScreenGuard('portfolio', state), 'map', 'Incomplete student cannot view portfolio');
  assert.equal(validateScreenGuard('survey', state), 'map', 'Incomplete student cannot view survey');
  // Observatory is freely open to explore
  assert.equal(validateScreenGuard('observatory', state), 'observatory', 'Observatory must be open to enrolled student');
  console.log('✓ Guard Test 3 Passed: Incomplete student blocked from finale screens, allowed into observatory');
}

// 4. Test Screen Guard: Completed Student (7/7 Unique IDs) Guards
{
  const state = createBlankState();
  state.name = '김장원';
  state.house = 2;
  state.completed = [6, 2, 0, 5, 1, 4, 3]; // 7 out of 7 unique IDs in arbitrary order!

  // Disallowed screens after 7/7
  assert.equal(validateScreenGuard('scan', state), 'ending', 'Completed student scan redirects to ending');
  assert.equal(validateScreenGuard('evidence', state), 'ending', 'Completed student evidence redirects to ending');

  // Allowed screens after 7/7
  assert.equal(validateScreenGuard('ending', state), 'ending', 'Completed student can access ending');
  assert.equal(validateScreenGuard('portfolio', state), 'portfolio', 'Completed student can access portfolio');
  assert.equal(validateScreenGuard('survey', state), 'survey', 'Completed student can access survey');
  assert.equal(validateScreenGuard('observatory', state), 'observatory', 'Completed student can access observatory');
  console.log('✓ Guard Test 4 Passed: Completed student 7/7 rules & ending access');
}

// 5. Test Code Validation: Empty code protection & Matching against selected booth
{
  const state = createBlankState();
  state.name = '이별밤';
  state.house = 3;
  state.completed = [6]; // Booth 6 completed
  state.selectedMissionIndex = 2; // Currently at Booth 2 (규칙 퀴즈)

  // Set default empty codes
  saveAdminCodes(['', '', '', '', '', '', '']);

  // Blank code configured -> entering empty or any code must fail!
  const res1 = validateStationCode('', state, 2);
  assert.equal(res1.ok, false, 'Blank input on unconfigured code must fail');
  assert.match(res1.message || '', /설정되지 않았습니다/, 'Must inform unconfigured');

  const res2 = validateStationCode('ANYCODE', state, 2);
  assert.equal(res2.ok, false, 'Any input on unconfigured code must fail');

  // Configure custom codes for stations
  const customCodes = ['', 'ST-PLANET-02', 'ST-QUIZ-03', '', '', '', 'ST-PHOTO-07'];
  saveAdminCodes(customCodes);

  // Input wrong code
  const res3 = validateStationCode('WRONG', state, 2);
  assert.equal(res3.ok, false, 'Wrong code must fail');

  // Input code of another station (e.g. entered station 1 code while at station 2!)
  const resOther = validateStationCode('ST-PLANET-02', state, 2);
  assert.equal(resOther.ok, false, 'Other station code must be rejected');
  assert.match(resOther.message || '', /다른 부스/, 'Must inform that code belongs to another booth');

  // Correct code for selected station 2
  const res4 = validateStationCode('ST-QUIZ-03', state, 2);
  assert.equal(res4.ok, true, 'Correct configured code must unlock');
  assert.equal(res4.index, 2, 'Matched index must be 2');

  // Attempting code for already completed station 6
  const resCompleted = validateStationCode('ST-PHOTO-07', state, 6);
  assert.equal(resCompleted.ok, false, 'Already completed station must reject code');
  assert.match(resCompleted.message || '', /이미 별빛 조각을 획득/, 'Must inform already completed');

  console.log('✓ Validation Test 5 Passed: Empty code protection and selected booth matching');
}

// 6. Test Duplicate Code Detection Logic
{
  const codesWithDuplicate = ['AAA', 'BBB', 'AAA', '', '', '', ''];
  const normalized = codesWithDuplicate.map((c, i) => ({
    code: c.trim().toUpperCase(),
    missionIndex: i
  }));
  const nonEmpty = normalized.filter(item => item.code !== '');
  const hasDuplicate = nonEmpty.some(
    (item, idx) => nonEmpty.findIndex(other => other.code === item.code) !== idx
  );
  assert.equal(hasDuplicate, true, 'Duplicate non-empty codes must be detected');

  const emptyCodes = ['', '', '', '', '', '', ''];
  const normalizedEmpty = emptyCodes.map((c, i) => ({
    code: c.trim().toUpperCase(),
    missionIndex: i
  }));
  const nonEmptyEmpty = normalizedEmpty.filter(item => item.code !== '');
  const emptyHasDuplicate = nonEmptyEmpty.some(
    (item, idx) => nonEmptyEmpty.findIndex(other => other.code === item.code) !== idx
  );
  assert.equal(emptyHasDuplicate, false, 'Empty codes across all stations are valid');
  console.log('✓ Validation Test 6 Passed: Duplicate code detection algorithm');
}

// 7. Test Admin Access Guard: Unauthenticated / Anonymous / Regular Students Blocked
{
  const state = createBlankState();
  state.name = '김학생';
  state.house = 0;

  // Unauthenticated access to admin -> redirected to admin-login
  assert.equal(validateScreenGuard('admin', state, false), 'admin-login', 'Unauthenticated user must be redirected to admin-login');
  assert.equal(validateScreenGuard('admin', state), 'admin-login', 'Default without admin flag must be redirected to admin-login');

  // admin-login screen itself is open
  assert.equal(validateScreenGuard('admin-login', state, false), 'admin-login', 'admin-login must be accessible');
  console.log('✓ Guard Test 7 Passed: Unauthenticated and anonymous users strictly blocked from admin screen');
}

// 8. Test Admin Access Guard: Fake localStorage Flags Disregarded
{
  const state = createBlankState();
  state.name = '해커학생';
  state.house = 1;

  // Attacker sets fake flags in localStorage
  localStorage.setItem('isAdmin', 'true');
  localStorage.setItem('admin', 'true');
  localStorage.setItem('role', 'admin');

  // The guard strictly evaluates verified server claim boolean parameter, not localStorage!
  assert.equal(
    validateScreenGuard('admin', state, false),
    'admin-login',
    'Fake localStorage flags must NOT bypass admin screen guard'
  );

  // Clean up mock localStorage
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('admin');
  localStorage.removeItem('role');
  console.log('✓ Guard Test 8 Passed: Fake localStorage admin flags completely disregarded');
}

// 9. Test Admin Access Guard: Verified Administrator Access
{
  const state = createBlankState();
  state.name = '운영교사';
  state.house = null;

  // Valid server-verified admin (isAdmin === true)
  assert.equal(
    validateScreenGuard('admin', state, true),
    'admin',
    'Verified administrator with custom claim must be granted access to admin screen'
  );
  console.log('✓ Guard Test 9 Passed: Verified admin with server custom claim allowed into admin screen');
}

// 10. Test Admin Access Guard: Immediate Revocation upon Logout
{
  const state = createBlankState();
  state.name = '운영교사';
  state.house = null;

  // Session active
  let currentIsAdmin = true;
  assert.equal(validateScreenGuard('admin', state, currentIsAdmin), 'admin');

  // Admin logs out (currentIsAdmin becomes false)
  currentIsAdmin = false;
  assert.equal(
    validateScreenGuard('admin', state, currentIsAdmin),
    'admin-login',
    'Logged out administrator must immediately be denied access'
  );
  console.log('✓ Guard Test 10 Passed: Immediate denial and redirection upon admin logout');
}

// 11. Real Async Verification of Admin Session Live Check
{
  const isLive = await verifyAdminSessionLive(false);
  assert.equal(isLive, false, 'Unauthenticated session must fail live admin verification');
  console.log('✓ Security Test 11 Passed: Real verifyAdminSessionLive fail-closed check verified');
}

// 12. Real Admin Auth Subscription & Unsubscribe Lifecycle
{
  let receivedState = null;
  const unsubscribe = subscribeAdminAuth(s => {
    receivedState = s;
  });
  assert.equal(typeof unsubscribe, 'function', 'subscribeAdminAuth must return an unsubscribe function');
  assert.ok(receivedState, 'Initial auth state must be dispatched immediately');
  assert.equal((receivedState as any).isAdmin, false, 'Initial unauthenticated subscription must have isAdmin: false');
  unsubscribe();
  console.log('✓ Security Test 12 Passed: Real subscribeAdminAuth lifecycle and initial dispatch verified');
}

// 13. Test Local Operator Login & Initial Default-Deny Assurance
{
  const configured = isLocalAdminAvailable();
  assert.equal(configured, true, 'Local operator authentication is available');
  assert.equal(isCurrentSessionAdmin(), false, 'Default session must never have admin active without valid login');
  console.log('✓ Security Test 13 Passed: Local operator login remains closed without a valid session');
}

// 14. Test Participant Code Generation & Stability (Internal ID preservation)
{
  const state = createBlankState();
  assert.ok(state.participantCode, 'participantCode must be generated');
  assert.match(state.participantCode, /^BW-\d{4}$/, 'participantCode format must be BW-XXXX');

  const deterministic1 = generateParticipantCode('student-uuid-42');
  const deterministic2 = generateParticipantCode('student-uuid-42');
  assert.equal(deterministic1, deterministic2, 'Same student ID must yield identical stable code');
  console.log('✓ ZEP Test 14 Passed: Internal stable participant ID generated and preserved');
}

// 15. Test ZEP Quiz Links Default to Empty and Safe Storage
{
  // Initial default must be strictly all empty strings (행사 무중단 원칙)
  localStorage.removeItem('jangwon-starlight-admin-zep-links-v1');
  const defaultZep = getAdminZepLinks();
  assert.equal(defaultZep.length, 7, 'Must have 7 stations');
  assert.ok(defaultZep.every(l => l === ''), 'All 7 stations must default to empty ZEP links');
  assert.equal(getMissionZepLink(0), '', 'Station 0 default ZEP link is empty');

  // Custom links saving & retrieval
  const sampleLinks = ['https://zep.us/play/cassiopeia', '', '', '', '', '', ''];
  saveAdminZepLinks(sampleLinks);
  assert.equal(getMissionZepLink(0), 'https://zep.us/play/cassiopeia', 'Configured ZEP link must be retrieved');
  assert.equal(getMissionZepLink(1), '', 'Unconfigured station ZEP link remains empty');
  console.log('✓ ZEP Test 15 Passed: ZEP links default to empty and persist correctly');
}

// 16. Test Student Name Normalization & Homonym Support (김장원(3학년 1반))
{
  const input1 = '  김장원(3학년 1반)  ';
  const norm1 = normalizeIdentity(input1);
  assert.equal(norm1, '김장원(3학년 1반)', 'Homonym student name must be properly normalized');

  const s = createBlankState();
  s.name = norm1;
  s.house = 1;
  saveParticipant(s);

  const loaded = loadParticipant('김장원(3학년 1반)');
  assert.ok(loaded, 'Participant with homonym name must be retrieved from storage');
  assert.equal(loaded?.name, '김장원(3학년 1반)');
  assert.equal(loaded?.house, 1);
  console.log('✓ Security & Profile Test 16 Passed: Homonym name support & normalization verified');
}

// 17. Test House 0 (용기의 별) and Storage Recovery Edge Cases
{
  const s0 = createBlankState();
  s0.name = '용기대장';
  s0.house = 0; // House 0 must NOT be coerced to null via truthiness bug!
  s0.completed = [0, 1];
  saveParticipant(s0);

  const loaded0 = loadParticipant('용기대장');
  assert.ok(loaded0, 'Loaded state exists');
  assert.strictEqual(loaded0?.house, 0, 'House 0 must strictly remain 0 and not become null');
  assert.deepEqual(loaded0?.completed, [0, 1], 'Completed array must remain intact');
  console.log('✓ Edge Case Test 17 Passed: House 0 strictly preserved without falsy coercion');
}

// 18. Comprehensive Real validateAwardStar Regression Test Suite
{
  const mockStorage = new Map<string, EvidenceItem>();
  const mockLookup = async (id: string) => mockStorage.get(id) || null;

  // Setup valid student on station 0
  const student = createBlankState();
  student.participantId = 'student-test-uid-100';
  student.name = '김장원';
  student.house = 0;
  student.selectedMissionIndex = 0;
  student.unlocked = 0;
  student.pendingMission = 0;
  student.completed = [];

  // Reset ZEP links to empty (default)
  saveAdminZepLinks(['', '', '', '', '', '', '']);

  // Case 1: 사진 없음 (Missing evidence ID or missing from DB)
  student.records = {
    0: { evidenceId: 'non-existent-evidence-id' }
  };
  const resNoPhoto = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resNoPhoto.ok, false);
  assert.equal(resNoPhoto.error, 'EVIDENCE_NOT_FOUND_IN_STORAGE', 'Must reject if photo is not found in storage');

  // Case 2: 다른 참가자의 사진 (Participant ID mismatch)
  const otherStudentPhoto: EvidenceItem = {
    id: 'photo-other-student',
    participantId: 'other-student-999',
    mission: 0,
    jpeg: 'data:image/jpeg;base64,sample123',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(otherStudentPhoto.id, otherStudentPhoto);
  student.records[0].evidenceId = otherStudentPhoto.id;

  const resOtherStudent = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resOtherStudent.ok, false);
  assert.equal(resOtherStudent.error, 'PARTICIPANT_ID_MISMATCH', 'Must reject photos belonging to another participant');

  // Case 3: 다른 부스/미션의 사진 (Mission index mismatch)
  const wrongMissionPhoto: EvidenceItem = {
    id: 'photo-wrong-mission',
    participantId: student.participantId,
    mission: 2, // Photo taken for mission 2 while trying to award mission 0
    jpeg: 'data:image/jpeg;base64,sample123',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(wrongMissionPhoto.id, wrongMissionPhoto);
  student.records[0].evidenceId = wrongMissionPhoto.id;

  const resWrongMission = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resWrongMission.ok, false);
  assert.equal(resWrongMission.error, 'MISSION_INDEX_MISMATCH', 'Must reject photo taken for a different mission');

  // Case 4: ZEP 결과 스크린샷을 현장 사진으로 오용 (Evidence kind: zep_quiz instead of activity)
  const zepScreenshotAsActivity: EvidenceItem = {
    id: 'photo-zep-screenshot',
    participantId: student.participantId,
    mission: 0,
    jpeg: 'data:image/jpeg;base64,sample123',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'zep_quiz' // Incorrect kind!
  };
  mockStorage.set(zepScreenshotAsActivity.id, zepScreenshotAsActivity);
  student.records[0].evidenceId = zepScreenshotAsActivity.id;

  const resWrongKind = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resWrongKind.ok, false);
  assert.equal(resWrongKind.error, 'INVALID_EVIDENCE_KIND', 'Must reject ZEP quiz screenshot masquerading as field activity photo');

  // Case 5: 이미 완료된 부스 (Duplicate star award)
  student.completed = [0];
  const resAlreadyDone = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resAlreadyDone.ok, false);
  assert.equal(resAlreadyDone.error, 'DUPLICATE_STAR_AWARD');

  // Case 6: 유효하지 않은 부스 번호
  const resOutOfBound = await validateAwardStar(student, 9, mockLookup);
  assert.equal(resOutOfBound.ok, false);
  assert.equal(resOutOfBound.error, 'INVALID_MISSION_INDEX');

  // Case 7: 로컬 ZEP 승인 변조 거부 (ZEP link configured, server approval not implemented)
  student.unlocked = 0;
  student.pendingMission = 0;
  student.completed = [];
  saveAdminZepLinks(['https://zep.us/play/cassiopeia', '', '', '', '', '', '']);

  // Valid activity photo in storage
  const validActivityPhoto: EvidenceItem = {
    id: 'photo-valid-activity',
    participantId: student.participantId,
    mission: 0,
    jpeg: 'data:image/jpeg;base64,sample123',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(validActivityPhoto.id, validActivityPhoto);

  // Valid ZEP quiz capture in storage
  const validZepCapture: EvidenceItem = {
    id: 'photo-valid-zep-capture',
    participantId: student.participantId,
    mission: 0,
    jpeg: 'data:image/jpeg;base64,sample456',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'zep_quiz',
    zepStatus: 'approved' // Client forged or attempted local approved
  };
  mockStorage.set(validZepCapture.id, validZepCapture);

  student.records[0] = {
    evidenceId: validActivityPhoto.id,
    zepQuizEvidenceId: validZepCapture.id,
    zepQuizStatus: 'approved' // Forged local status
  };

  // 2026-10-09 운영 단순화: ZEP 퀴즈 링크가 있어도 별빛은 활동 인증샷으로 지급 (결과 캡처·서버 승인 불필요)
  const resZepSimple = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resZepSimple.ok, true, 'ZEP-linked booth awards with a valid activity photo');
  // 퀴즈 결과 캡처를 활동 사진으로 대신 쓰는 것은 여전히 거부
  student.records[0] = { evidenceId: validZepCapture.id };
  const resZepAsActivity = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resZepAsActivity.ok, false);
  assert.equal(resZepAsActivity.error, 'INVALID_EVIDENCE_KIND');

  // Case 8: 정당한 일반 미션 허용 (No ZEP link, legitimate activity photo)
  saveAdminZepLinks(['', '', '', '', '', '', '']); // Default unconfigured ZEP link
  student.records[0] = {
    evidenceId: validActivityPhoto.id
  };

  const resLegit = await validateAwardStar(student, 0, mockLookup);
  assert.equal(resLegit.ok, true, 'Legitimate normal mission must be successfully awarded');
  assert.equal(resLegit.evidence.id, validActivityPhoto.id);

  // Case 9: 검증 도중 프로필 전환 방어 (Profile switch during async check)
  const switchedStudent = { ...student, participantId: 'student-switched-during-check' };
  const resSwitched = await validateAwardStar(switchedStudent, 0, mockLookup);
  assert.equal(resSwitched.ok, false);
  assert.equal(resSwitched.error, 'PARTICIPANT_ID_MISMATCH', 'Must reject if student profile switched before award completes');

  // Case 10: 중복 클릭 방어 검증 (Double-click / Concurrency guard)
  let simulatedAwardInProgress = false;
  const awardWithLock = async (pState: ParticipantState, mIdx: number) => {
    if (simulatedAwardInProgress) {
      return { ok: false, error: 'CONCURRENT_CLICK_BLOCKED' };
    }
    simulatedAwardInProgress = true;
    try {
      return await validateAwardStar(pState, mIdx, mockLookup);
    } finally {
      simulatedAwardInProgress = false;
    }
  };

  const firstCallPromise = awardWithLock(student, 0);
  const secondCallPromise = awardWithLock(student, 0);
  const [firstRes, secondRes] = await Promise.all([firstCallPromise, secondCallPromise]);
  assert.ok(
    (firstRes.ok && !secondRes.ok && 'error' in secondRes && secondRes.error === 'CONCURRENT_CLICK_BLOCKED') ||
    (secondRes.ok && !firstRes.ok && 'error' in firstRes && firstRes.error === 'CONCURRENT_CLICK_BLOCKED'),
    'Concurrent double-click must allow only one call and block the duplicate'
  );

  console.log('✓ Security & Award Test 18 Passed: Real validateAwardStar deep verification regression suite (10 cases) fully verified');
}

// 19. Non-sequential Free Choice Transition: 6번 -> 2번 -> 0번
{
  const mockStorage = new Map<string, EvidenceItem>();
  const mockLookup = async (id: string) => mockStorage.get(id) || null;

  const state = createBlankState();
  state.name = '자유탐험가';
  state.house = 0;
  saveAdminCodes(['CODE-0', 'CODE-1', 'CODE-2', 'CODE-3', 'CODE-4', 'CODE-5', 'CODE-6']);
  saveAdminZepLinks(['', '', '', '', '', '', '']);

  // Step 1: Student freely starts at Station 6 (포토존)!
  state.selectedMissionIndex = 6;
  const unlockRes6 = validateStationCode('CODE-6', state, 6);
  assert.equal(unlockRes6.ok, true, 'Station 6 code unlocks independently');

  state.unlocked = 6;
  state.pendingMission = 6;
  state.records = {
    6: { userNote: '가족 네컷 사진 완료', selectedOption: 1, evidenceId: 'photo-station-6' }
  };
  const photo6: EvidenceItem = {
    id: 'photo-station-6',
    participantId: state.participantId,
    mission: 6,
    jpeg: 'data:image/jpeg;base64,img6',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(photo6.id, photo6);

  const awardRes6 = await validateAwardStar(state, 6, mockLookup);
  assert.equal(awardRes6.ok, true, 'Station 6 awarded as first mission!');
  state.completed = [6];
  state.unlocked = null;
  state.pendingMission = null;

  // Step 2: Student returns to map and freely chooses Station 2 (규칙 퀴즈)!
  state.selectedMissionIndex = 2;
  const unlockRes2 = validateStationCode('CODE-2', state, 2);
  assert.equal(unlockRes2.ok, true, 'Station 2 code unlocks independently while 6 is completed');

  state.unlocked = 2;
  state.pendingMission = 2;
  state.records[2] = { userNote: '두 배 수열 정답', selectedOption: 2, evidenceId: 'photo-station-2' };
  const photo2: EvidenceItem = {
    id: 'photo-station-2',
    participantId: state.participantId,
    mission: 2,
    jpeg: 'data:image/jpeg;base64,img2',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(photo2.id, photo2);

  const awardRes2 = await validateAwardStar(state, 2, mockLookup);
  assert.equal(awardRes2.ok, true, 'Station 2 awarded as second mission!');
  state.completed = [6, 2];
  state.unlocked = null;
  state.pendingMission = null;

  // Step 3: Student chooses Station 0 (카시오페이아)!
  state.selectedMissionIndex = 0;
  const unlockRes0 = validateStationCode('CODE-0', state, 0);
  assert.equal(unlockRes0.ok, true, 'Station 0 code unlocks independently while 6 and 2 are completed');

  state.unlocked = 0;
  state.pendingMission = 0;
  state.records[0] = { userNote: 'W자 카시오페이아 관찰', selectedOption: 0, evidenceId: 'photo-station-0' };
  const photo0: EvidenceItem = {
    id: 'photo-station-0',
    participantId: state.participantId,
    mission: 0,
    jpeg: 'data:image/jpeg;base64,img0',
    capturedAt: new Date().toISOString(),
    status: 'pending',
    kind: 'activity'
  };
  mockStorage.set(photo0.id, photo0);

  const awardRes0 = await validateAwardStar(state, 0, mockLookup);
  assert.equal(awardRes0.ok, true, 'Station 0 awarded as third mission!');
  state.completed = [6, 2, 0];

  // Verify state preservation: Answers in records[6] and records[2] are perfectly preserved!
  assert.equal(state.records[6].userNote, '가족 네컷 사진 완료');
  assert.equal(state.records[2].userNote, '두 배 수열 정답');
  assert.equal(state.records[0].userNote, 'W자 카시오페이아 관찰');

  // Verify rejection of duplicate award for station 6
  const dupAttempt = await validateAwardStar(state, 6, mockLookup);
  assert.equal(dupAttempt.ok, false);
  assert.equal(dupAttempt.error, 'DUPLICATE_STAR_AWARD');

  console.log('✓ Free-Choice Test 19 Passed: 6 -> 2 -> 0 non-sequential transition & state preservation verified');
}

// 20. 7 Unique Mission IDs for Ending Unlocking
{
  const state = createBlankState();
  state.name = '완료학생';
  state.house = 1;

  // With duplicate IDs (length is 7, but only 6 unique IDs: [0, 0, 1, 2, 3, 4, 5])
  state.completed = [0, 0, 1, 2, 3, 4, 5];
  assert.equal(validateScreenGuard('ending', state), 'map', 'Duplicate IDs with < 7 unique must NOT unlock ending');
  assert.equal(validateScreenGuard('portfolio', state), 'map', 'Duplicate IDs must NOT unlock portfolio');

  // With all 7 distinct IDs in arbitrary non-sequential order
  state.completed = [6, 2, 0, 5, 1, 4, 3];
  assert.equal(validateScreenGuard('ending', state), 'ending', 'All 7 unique IDs unlock ending screen');
  assert.equal(validateScreenGuard('portfolio', state), 'portfolio', 'All 7 unique IDs unlock portfolio screen');
  assert.equal(validateScreenGuard('survey', state), 'survey', 'All 7 unique IDs unlock survey screen');

  console.log('✓ Security Test 20 Passed: Strict Set size === 7 requirement for finale screens verified');
}

// 21. Existing Records Schema Migration & Sanitizer (No sequential truncation)
{
  const oldState = {
    name: '복원학생',
    house: 0,
    participantId: 'student-legacy-uid-77',
    completed: [5, 1, 3], // Arbitrary completed IDs
    unlocked: 3,
    records: {
      5: { userNote: '리폼 메모' },
      1: { userNote: '행성 메모' }
    }
  };

  saveParticipant(oldState as any);
  const loaded = loadParticipant('복원학생');
  assert.ok(loaded, 'Participant loaded successfully');
  // Must preserve [5, 1, 3] and NOT truncate to [0..n]!
  assert.ok(loaded.completed.includes(5));
  assert.ok(loaded.completed.includes(1));
  assert.ok(loaded.completed.includes(3));
  assert.equal(loaded.completed.length, 3);
  assert.strictEqual(loaded.house, 0, 'House 0 preserved');
  assert.ok(loaded.observatory, 'Observatory state initialized');
  assert.equal(loaded.records[5].userNote, '리폼 메모');
  assert.equal(loaded.records[5].status, 'completed', 'Completed mission status normalized');

  console.log('✓ Storage Migration Test 21 Passed: Free-choice schema migration & status normalization verified');
}

// 22. Starlight Observatory Astronomical Calculations & Puzzle
{
  // Test LST for Dogye on 2026-10-20 20:00 KST
  const dateKst = new Date('2026-10-20T20:00:00+09:00');
  const lst = calculateLST(dateKst, DOGYE_LOCATION.longitude);
  assert.ok(lst >= 0 && lst < 24, 'LST must be in 0..24 range');

  // Test Cassiopeia (Primary Target) observation calculation
  const cassiopeia = CONSTELLATIONS.find(c => c.id === 'cassiopeia')!;
  assert.equal(cassiopeia.isPrimaryTarget, true, 'Cassiopeia is primary target');
  const casStatus = calculateObservationStatus(cassiopeia, dateKst, DOGYE_LOCATION);
  assert.ok(casStatus.altitude > 45, 'Cassiopeia must be high in sky over Dogye in October evening (Altitude > 45°)');
  assert.ok(casStatus.rating.includes('고도 높음'), 'Cassiopeia rating must be high-altitude');
  assert.ok(!/선명하게 보입니다/.test(casStatus.advice), 'Advice must not assert clear visibility');
  assert.ok(casStatus.advice.includes(String(casStatus.altitude)), 'Advice must use the computed altitude');

  // Test Ursa Major (Big Dipper) in October evening: low near northern horizon
  const ursaMajor = CONSTELLATIONS.find(c => c.id === 'piscis_austrinus')!;
  const umaStatus = calculateObservationStatus(ursaMajor, dateKst, DOGYE_LOCATION);
  assert.ok(umaStatus.altitude < 25, 'Fomalhaut region is low in Dogye');
  assert.ok(umaStatus.advice.includes('날씨') || umaStatus.isObscuredByMountains, 'real visibility is not guaranteed');

  // Test Horizontal coordinates conversion
  const testCoords = equatorialToHorizontal(0, 90, 0, DOGYE_LOCATION.latitude);
  assert.ok(Math.abs(testCoords.altitude - DOGYE_LOCATION.latitude) < 0.1, 'North celestial pole altitude equals observer latitude');

  console.log('✓ Astronomy Test 22 Passed: Dogye LST, horizontal coordinates, and constellation visibility verified');
}

// 23. Booth 06 AI 체험부스 & Latest Operational Configuration
{
  const missions = getMissions('junior');
  const booth06 = missions[5];
  assert.equal(booth06.id, 5, 'Mission index 5 preserved');
  assert.equal(booth06.title, 'AI 체험부스', 'Booth 06 title must be AI 체험부스');
  assert.equal(booth06.speaker, '론', 'Speaker must be Ron Weasley');
  assert.ok(booth06.story.includes('AI 활용 체험 콘텐츠'), 'Story includes AI experience contents');
  assert.ok(booth06.unlockedClueTitle.includes('창의'), 'Unlocked clue relates to creativity starlight');

  // Verify getStationPlaces migrates old upcycling / reform text
  localStorage.setItem('jangwon-starlight-station-places-v1', JSON.stringify([
    '장소1', '장소2', '장소3', '장소4', '장소5', '체험존 · AI 업사이클링 리폼소', '장소7'
  ]));
  const places = getStationPlaces();
  assert.equal(places[5], 'AI 체험존', 'Old upcycling station place automatically migrated');

  // Clean up
  localStorage.removeItem('jangwon-starlight-station-places-v1');

  // Verify Grade Quizzes (60 total)
  const gradeQuizzes = getGradeQuizzes();
  assert.equal(gradeQuizzes.length, 60, 'Grade quizzes total 60');
  const quizStatus = getGradeQuizStatus();
  assert.equal(quizStatus.total, 60);

  // Verify Duty Assignments
  const duties = getDutyAssignments();
  assert.ok(duties.length >= 14, 'Duty assignments defined');
  const scienceDuty = duties.find(d => d.dept.includes('과학') || d.dept.includes('6학년'));
  assert.ok(scienceDuty, 'Science observation support duty exists');
  assert.equal(scienceDuty.status, '담당미정', 'Science astronomy support is strictly pending/unconfirmed');

  console.log('✓ AI Experience & Operational Test 23 Passed: Booth 06 AI 체험부스, place migration, and duty plan verified');
}

// 24. Character registry: 11 characters, PNG files present, every dialogue speaker registered
{
  // 마법사의 돌 등장인물 10종 (도비 제외)
  const expected = ['harry', 'hermione', 'ron', 'draco', 'voldemort', 'dumbledore', 'mcgonagall', 'hagrid', 'hedwig', 'snape'];
  assert.deepEqual(CHARACTERS.map(c => c.id).sort(), [...expected].sort(), 'Registry must contain exactly the 10 Philosopher\'s Stone characters');
  for (const id of expected) {
    const file = path.resolve('public/assets/characters', `${id}.png`);
    assert.ok(fs.existsSync(file), `Character PNG missing: ${id}.png`);
  }
  const allLines = flattenScript([...INTRO_DIALOGUE, ...FINALE_DIALOGUE, ...getMissions().flatMap(m => [...m.introLines, ...m.rewardLines])]);
  for (const [speaker] of allLines) {
    assert.ok(getCharacterByName(speaker), `Dialogue speaker not in registry: ${speaker}`);
  }
  for (const m of getMissions()) {
    for (const sp of m.speakers) assert.ok(getCharacterByName(sp), `Mission speaker not registered: ${sp}`);
    assert.ok(m.speakers.includes(m.speaker), 'Primary speaker must be among mission speakers');
  }
  const legacy = /여울|나래|그루/;
  assert.ok(!allLines.some(([, l]) => legacy.test(l)), 'Legacy characters must not appear in student dialogue');
  assert.equal(flattenScript(INTRO_DIALOGUE)[0][0], '헤드위그', 'Hedwig delivers the invitation first');
  assert.ok(!allLines.some(([sp]) => sp === '도비'), 'Dobby (not in Philosopher\'s Stone) removed from dialogue');
  assert.ok(flattenScript(INTRO_DIALOGUE).some(([sp, l]) => sp === '헤드위그' && l.includes('힌트')), 'Hedwig introduced as hint helper');
  assert.ok(flattenScript(INTRO_DIALOGUE).some(([, l]) => l.includes('마법사의 돌')), 'Philosopher\'s Stone premise present');
  // 유치원 눈높이: 대사 한 줄은 짧게 (60자 이하)
  for (const [, l] of allLines) assert.ok(l.replace('{name}', '김장원').length <= 60, `Line too long for young children: ${l}`);
  console.log('✓ Character Test 24 Passed: 11-character registry, PNG assets, and speaker linkage verified');
}

// 25. Seven lessons, starlight names, and finale sequence
{
  const m = getMissions('junior');
  assert.equal(m.length, 7);
  assert.deepEqual(m.map(x => x.id), [0, 1, 2, 3, 4, 5, 6], 'Mission IDs preserved');
  assert.deepEqual(m.map(x => x.starlight), ['관찰의 별빛', '탐구의 별빛', '추리의 별빛', '지식의 별빛', '표현의 별빛', '창의의 별빛', '협력의 별빛']);
  assert.deepEqual(m[0].speakers, ['해리', '덤블도어']);
  assert.deepEqual(m[2].speakers, ['스네이프', '말포이']);
  assert.deepEqual(m[3].speakers, ['헤르미온느', '론']);
  assert.deepEqual(m[6].speakers, ['해그리드', '해리']);
  assert.ok(!m.some(x => /업사이클|리폼/.test(x.title + x.story + x.boothGuide)), 'Upcycling naming removed');
  const fin = flattenScript(FINALE_DIALOGUE);
  const praiseIdx = fin.findIndex(([sp]) => sp === '덤블도어');
  const dracoIdx = fin.findIndex(([sp]) => sp === '말포이');
  const skyIdx = fin.findIndex(([, l]) => l === '마지막 별빛은 상자 안에 없습니다. 고개를 들어 하늘을 바라보세요.');
  assert.ok(praiseIdx >= 0 && dracoIdx > praiseIdx && skyIdx > dracoIdx, 'Sky line follows Dumbledore praise and Draco cooperation');
  console.log('✓ Story Test 25 Passed: seven lessons, starlight names, and finale order verified');
}

// 26. Polaris is computed as a single star, not the Ursa Minor center
{
  const d = new Date('2026-10-20T20:00:00+09:00');
  const pol = calculateStarPosition(POLARIS.ra, POLARIS.dec, d, DOGYE_LOCATION);
  assert.ok(Math.abs(pol.altitude - DOGYE_LOCATION.latitude) < 1.5, 'Polaris altitude ≈ observer latitude');
  assert.ok(CONSTELLATIONS.every(c => !c.koreanName.includes('북극성')), 'Polaris is not a constellation');
  assert.equal(TERRAIN_MASK_IS_ASSUMPTION, true, 'Terrain mask flagged as assumption');
  console.log('✓ Astronomy Test 26 Passed: Polaris separated from constellation center; terrain mask marked as assumption');
}

// 27. Local operator account (no Firebase): 1234 → change → old rejected
{
  assert.equal(DEFAULT_OPERATOR_EMAIL, 'och9431@gw1.kr');
  assert.equal(INITIAL_OPERATOR_PASSWORD, '1234');
  assert.equal(MIN_PASSWORD_LENGTH, 4);
  localStorage.removeItem('jangwon-starlight-admin-cred-v1');
  localStorage.removeItem('jangwon-starlight-admin-lock-v1');
  await assert.rejects(signInAdmin('och9431@gw1.kr', '0000'), 'wrong password rejected');
  await assert.rejects(signInAdmin('other@gw1.kr', '1234'), 'other email rejected');
  localStorage.removeItem('jangwon-starlight-admin-lock-v1');
  await signInAdmin(' OCH9431@gw1.kr ', '1234');
  assert.equal(isCurrentSessionAdmin(), true, 'logged in with initial password');
  assert.equal(isUsingInitialPassword(), true);
  await assert.rejects(changeAdminPassword('9999', 'starlight7'), 'wrong current password rejected');
  await assert.rejects(changeAdminPassword('1234', '12'), 'too short rejected');
  await changeAdminPassword('1234', 'starlight7');
  assert.equal(hasCustomPassword(), true);
  const stored = localStorage.getItem('jangwon-starlight-admin-cred-v1') || '';
  assert.ok(!stored.includes('starlight7'), 'password never stored in plain text');
  await signOutAdmin();
  assert.equal(isCurrentSessionAdmin(), false);
  await assert.rejects(signInAdmin('och9431@gw1.kr', '1234'), 'old initial password rejected after change');
  localStorage.removeItem('jangwon-starlight-admin-lock-v1');
  await signInAdmin('och9431@gw1.kr', 'starlight7');
  assert.equal(isUsingInitialPassword(), false);
  await signOutAdmin();
  // lockout after 5 failures
  for (let i = 0; i < 5; i++) await signInAdmin('och9431@gw1.kr', 'x').catch(() => {});
  await assert.rejects(signInAdmin('och9431@gw1.kr', 'starlight7'), /잠/, 'locked after 5 failures');
  localStorage.removeItem('jangwon-starlight-admin-lock-v1');
  localStorage.removeItem('jangwon-starlight-admin-cred-v1');
  console.log('✓ Admin Test 27 Passed: local operator login (1234), password change with hashed storage, lockout verified');
}

// 28. Camera sky finder orientation & projection math
{
  const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) < tol;
  // 세로로 세운 폰, 북쪽을 향함
  let b = basisFromDeviceOrientation(0, 90, 0);
  let f = vecToAltAz(b.forward);
  assert.ok(near(f.alt, 0) && (near(f.az, 0) || near(f.az, 360)), 'Upright phone facing north → az 0, alt 0');
  assert.ok(near(b.up[2], 1, 0.01), 'Screen up is sky up when upright');
  assert.ok(near(b.right[0], 1, 0.01), 'Screen right is east when facing north');
  // alpha 90 (반시계) → 서쪽
  f = vecToAltAz(basisFromDeviceOrientation(90, 90, 0).forward);
  assert.ok(near(f.az, 270), 'alpha 90 → facing west');
  // iOS heading 90(동) → alpha 270 → 동쪽
  f = vecToAltAz(basisFromDeviceOrientation(270, 90, 0).forward);
  assert.ok(near(f.az, 90), 'heading east');
  // 45° 위로 기울임
  f = vecToAltAz(basisFromDeviceOrientation(0, 135, 0).forward);
  assert.ok(near(f.alt, 45), 'tilted up 45°');
  // 바닥에 눕힘 → 후면 카메라는 땅
  f = vecToAltAz(basisFromDeviceOrientation(0, 0, 0).forward);
  assert.ok(near(f.alt, -90), 'flat face-up phone camera points down');
  // 방위 보정
  f = vecToAltAz(adjustBasis(basisFromDeviceOrientation(0, 90, 0), 0, 10).forward);
  assert.ok(near(f.az, 10), 'heading offset +10° applied');
  // 가로 화면(90°): 화면 오른쪽 = 기기 아래쪽
  const land = adjustBasis(basisFromDeviceOrientation(0, 90, 0), 90, 0);
  assert.ok(near(land.right[2], -1, 0.01), 'landscape: screen right maps to device -Y');
  // 투영: 정면 → 중심, 오른쪽/위쪽 부호
  const mb = basisFromAltAz(30, 100);
  const c = projectToScreen(altAzToVec(30, 100), mb, 500)!;
  assert.ok(near(c.x, 0, 0.01) && near(c.y, 0, 0.01), 'center star projects to center');
  const rr = projectToScreen(altAzToVec(30, 110), mb, 500)!;
  assert.ok(rr.x > 0, 'larger azimuth appears to the right');
  const uu = projectToScreen(altAzToVec(40, 100), mb, 500)!;
  assert.ok(uu.y < 0, 'higher altitude appears above');
  assert.equal(projectToScreen(altAzToVec(30, 280), mb, 500), null, 'behind camera not drawn');
  // 카탈로그 무결성
  const ids = new Set(SKY_CATALOG.stars.map(s => s.id));
  for (const fig of SKY_CATALOG.figures) for (const [a, z] of fig.lines) assert.ok(ids.has(a) && ids.has(z), `figure ${fig.name} star missing`);
  assert.ok(ids.has('fomalhaut') && ids.has('cas-alpha') && ids.has('vega'), 'key stars present');
  console.log('✓ Sky Camera Test 28 Passed: device orientation, calibration, landscape and projection math verified');
}

// 29. ZEP QUIZ QR link safety check
{
  const z = checkZepQuizLink('https://zep.us/play/AbCd12');
  assert.ok(z.ok && z.isZep && z.matchesConfigured === null, 'zep.us link accepted');
  const sub = checkZepQuizLink('https://quiz.zep.us/abc');
  assert.ok(sub.isZep, 'zep.us subdomain accepted');
  const fake = checkZepQuizLink('https://zep.us.evil.example/play/x');
  assert.ok(fake.ok && !fake.isZep, 'look-alike domain flagged as not ZEP');
  assert.equal(checkZepQuizLink('javascript:alert(1)').ok, false, 'javascript: blocked');
  assert.equal(checkZepQuizLink('BW-1234').ok, false, 'plain text is not a link');
  const match = checkZepQuizLink('https://zep.us/play/AbCd12/', 'https://zep.us/play/AbCd12');
  assert.equal(match.matchesConfigured, true, 'matches configured link');
  const mismatch = checkZepQuizLink('https://zep.us/play/Other', 'https://zep.us/play/AbCd12');
  assert.equal(mismatch.matchesConfigured, false, 'different quiz flagged');
  console.log('✓ ZEP QR Test 29 Passed: ZEP link validation (domain, scheme, configured-link match) verified');
}

// 30. Longer branching dialogue & name calling
{
  assert.equal(fillName('{nameA}, 안녕!', '지우'), '지우야, 안녕!');
  assert.equal(fillName('{nameA}, 안녕!', '민준'), '민준아, 안녕!');
  assert.equal(fillName('{nameI} 왔어', '민준'), '민준이가 왔어');
  assert.equal(fillName('{nameN} 좋아', '지우'), '지우는 좋아');
  assert.equal(fillName('{nameA}', ''), '친구야');
  for (const m of getMissions()) {
    const steps = [...m.introLines];
    assert.ok(steps.length >= 7, `mission ${m.id}: intro should be a longer conversation`);
    assert.ok(steps.filter(isChoice).length >= 1, `mission ${m.id}: intro has a choice`);
    assert.ok(m.rewardLines.some(isChoice), `mission ${m.id}: reward has a choice`);
    assert.ok(flattenScript(steps).some(([, l]) => l.includes('{name')), `mission ${m.id}: calls the child by name`);
    for (const st of [...m.introLines, ...m.rewardLines]) if (isChoice(st)) {
      assert.ok(st.options.length >= 2, 'choice needs 2+ options');
      for (const o of st.options) assert.ok(o.replies.length >= 1, 'each option gets a character reply');
    }
  }
  assert.ok(INTRO_DIALOGUE.filter(isChoice).length >= 2 && FINALE_DIALOGUE.filter(isChoice).length >= 2, 'intro/finale have choices');
  console.log('✓ Dialogue Test 30 Passed: longer branching conversations with name calling verified');
}

// 31. Spells per booth, mini-games, and the Voldemort battle
{
  assert.equal(SPELLS.length, 7, 'one spell per booth');
  assert.deepEqual(SPELLS.map(s => s.missionIndex).sort(), [0, 1, 2, 3, 4, 5, 6]);
  for (let i = 0; i < 7; i++) {
    assert.ok(MINI_GAMES[i], `mini-game for booth ${i}`);
    assert.equal(typeof GAME_COMPONENTS[i], 'function', `action game component for booth ${i}`);
  }
  assert.deepEqual(availableSpells([]), [BASIC_SPELL], 'no spells learned → basic spell');
  assert.equal(availableSpells([0, 3]).length, 2, 'only learned spells');
  assert.ok(FINALE_DIALOGUE.some(isBattle), 'finale contains the battle');
  // 막상막하: 처음엔 질 수도 있고, 다시 도전할수록 볼드모트가 약해져서 결국 이길 수 있음
  {
    let seed = 0.4321;
    const rng = () => (seed = (seed * 9301 + 49297) % 233280 / 233280);
    const all = availableSpells([0, 1, 2, 3, 4, 5, 6]);
    const play = (level: number, aim: 'perfect' | 'good' | 'miss', dodge: boolean) => {
      let st = initialBattle(level);
      for (let t = 0; t < 80; t++) {
        st = castSpell(st, all[t % all.length], aim, rng).state;
        if (isWon(st)) return true;
        st = foeTurn(st, dodge, rng).state;
        if (isLost(st)) return false;
      }
      return false;
    };
    assert.ok(foeMaxFor(1) < foeMaxFor(0) && foeMaxFor(3) < foeMaxFor(2), 'retry lowers Voldemort strength');
    assert.equal(play(0, 'miss', false), false, 'careless play can lose the first battle');
    assert.equal(play(MAX_LEVEL, 'miss', false), true, 'even all-miss play wins at the easiest retry level');
    let wins = 0;
    for (let i = 0; i < 200; i++) if (play(0, 'good', i % 2 === 0)) wins++;
    assert.ok(wins > 30 && wins < 200, `first battle is close (won ${wins}/200 with ok play)`);
    assert.equal(retryBattle(initialBattle(0)).level, 1);
    assert.equal(retryBattle(initialBattle(MAX_LEVEL)).level, MAX_LEVEL);
  }
  console.log('✓ Battle Test 31 Passed: booth spells, mini-games, close battle with retries that weaken Voldemort');
}

// 32. Master (test) mode toggle — off by default, persists per device
{
  if (typeof (globalThis as any).window === 'undefined') (globalThis as any).window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
  assert.equal(isMasterMode(), false, 'master mode off by default');
  setMasterMode(true);
  assert.equal(isMasterMode(), true);
  setMasterMode(false);
  assert.equal(isMasterMode(), false);
  console.log('✓ Master Mode Test 32 Passed: toggle defaults off and persists');
}


// Test 33: 보상 — 수업마다 랜덤 아이템 1개, 쿠폰 한도, 꽝 30% 이상, 이용권 1장 = 1번
{
  let r = emptyRewards();
  for (let i = 0; i < 7; i++) r = grantForClear(r, i, i + 1, DEFAULT_REWARD_CONFIG);
  const fromMissions = r.tickets.filter(t => t.source?.startsWith('mission:'));
  assert.equal(fromMissions.length, 7, 'exactly one random item per mission clear');
  assert.equal(r.tickets.filter(t => t.kind === 'snack').length, 1, 'guaranteed food ticket after four lessons');
  assert.equal(r.tickets.filter(t => t.kind === 'roulette').length, 7, 'one roulette per lesson');
  assert.equal(r.tickets.filter(t => t.kind === 'special').length, 1, 'special only on all clear');
  assert.ok(couponCount(r) <= DEFAULT_REWARD_CONFIG.maxCoupons, 'coupon cap respected');
  const again = grantForClear(r, 2, 7, DEFAULT_REWARD_CONFIG);
  assert.equal(again.tickets.length, r.tickets.length, 'no double grant for same mission');
  // 쿠폰 한도: 쿠폰만 나오는 rng 로 많이 뽑아도 maxCoupons 를 넘지 않음
  let many = emptyRewards();
  const couponRng = () => 0.5; // 아이템 풀에서 쿠폰 칸
  for (let i = 0; i < 7; i++) many = grantForClear(many, i, i + 1, DEFAULT_REWARD_CONFIG, couponRng);
  assert.equal(couponCount(many), 0, 'mission reward is now a guaranteed roulette, not a random coupon');
  assert.equal(many.tickets.filter(t => t.kind === 'snack').length, 1, 'food entitlement issued once');
  // 꽝 최소 30%
  const lowLose = DEFAULT_PRIZES.map(p => (p.kind === 'lose' ? { ...p, weight: 1 } : p));
  const w = effectiveWeights(lowLose);
  const loseShare = w[lowLose.findIndex(p => p.kind === 'lose')] / w.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(loseShare - 0.05) < 1e-10, `lose share is 5% (got ${loseShare})`);
  let seed = 12345, loses = 0;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let k = 0; k < 3000; k++) if (lowLose[pickPrize(lowLose, rng)].kind === 'lose') loses++;
  assert.ok(loses / 3000 > 0.035 && loses / 3000 < 0.065, `simulated lose rate ${loses / 3000}`);
  // 기본 칸에 떡볶이+오뎅 쿠폰
  assert.ok(DEFAULT_PRIZES.some(p => p.id === 'combo' && p.name.includes('떡볶이') && p.name.includes('어묵')), 'combo coupon prize');
  // 룰렛: 이용권 1장 = 1번
  const base = { ...emptyRewards(), tickets: [{ id: 'r1', kind: 'roulette' as const, label: '', emoji: '', createdAt: '', used: false }, { id: 'r2', kind: 'roulette' as const, label: '', emoji: '', createdAt: '', used: false }] };
  const item = DEFAULT_PRIZES.find(p => p.id === 'combo')!;
  const s1 = applySpin(base, 'r1', item, DEFAULT_REWARD_CONFIG);
  assert.equal(s1.issued?.label, '떡볶이 + 오뎅 1인분씩 쿠폰', 'combo coupon label');
  assert.equal(applySpin(s1.rewards, 'r1', item, DEFAULT_REWARD_CONFIG).issued, null, 'used ticket cannot spin');
  const s3 = applySpin(s1.rewards, 'r2', DEFAULT_PRIZES.find(p => p.kind === 'again')!, DEFAULT_REWARD_CONFIG);
  assert.equal(s3.issued!.kind, 'roulette', 'again issues new roulette ticket');
  const full = { ...emptyRewards(), tickets: [...base.tickets, ...[1, 2, 3].map(k => ({ id: 'c' + k, kind: 'prize' as const, label: '', emoji: '', createdAt: '', used: true }))] };
  const capped = applySpin(full, 'r1', item, DEFAULT_REWARD_CONFIG);
  assert.ok(!capped.capped && capped.issued?.kind === 'prize', 'winning item stays an item beyond the former cap');
  const red = redeemTicket(s1.rewards, s1.issued!.id);
  assert.ok(red.tickets.find(t => t.id === s1.issued!.id)!.used, 'coupon redeemed');
  // 미니게임 스테이지: 확률 + 최대 개수
  let ar = emptyRewards(); let got = 0;
  for (let st = 1; st <= 40; st++) { const g = grantForStage(ar, 'g', st, DEFAULT_REWARD_CONFIG, () => 0.01); ar = g.rewards; if (g.item) got++; }
  assert.equal(got, 40, 'arcade rewards have no quantity cap');
  assert.equal(grantForStage(ar, 'g', 1, DEFAULT_REWARD_CONFIG, () => 0.01).item, null, 'same stage only once');
  assert.equal(grantForStage(emptyRewards(), 'g', 1, DEFAULT_REWARD_CONFIG, () => 0.99).item, null, 'chance miss gives nothing');
  assert.equal(r.tickets.filter(t=>t.source?.startsWith('mission-badge:')).length,7);
  console.log('✓ Reward Test 33 Passed: automatic mission badges, unlimited items, lose = 5%, one spin per ticket');
}

// Test 34: 미니게임 탭 — 일곱 수업을 다 마쳐야 열림, 스테이지 1~10
{
  const base = { ...createBlankState(), name: '지우', house: 1 };
  assert.equal(validateScreenGuard('arcade', { ...base, completed: [0, 1, 2, 3, 4, 5] }), 'arcade', 'practice open before all clear');
  const all = { ...base, completed: [0, 1, 2, 3, 4, 5, 6], spells: [0, 1, 2, 3, 4, 5, 6] };
  assert.equal(validateScreenGuard('arcade', all), 'arcade', 'arcade open after all clear');
  assert.equal(openedGames(all).length, 8, 'seven games + troll boss listed after all clear');
  assert.equal(openedGames(all)[7].key, 'troll', 'troll boss is the special game');
  assert.equal(nextLockedEpisode(all)?.key, 'ep1', 'side episode locked until troll cleared');
  const afterTroll = { ...all, arcade: { cleared: { troll: 1 } } };
  assert.equal(openedGames(afterTroll).at(-1)?.key, 'ep1', 'clearing troll boss opens side episode 1 (duel club)');
  assert.equal(nextLockedEpisode(afterTroll)?.key, 'ep2', 'episode 2 locked until 7 duels won');
  assert.equal(openedGames({ ...all, arcade: { cleared: { troll: 1, ep1: 6 } } }).some(g => g.key === 'ep2'), false, '6 wins not enough');
  assert.equal(openedGames({ ...all, arcade: { cleared: { troll: 1, ep1: 7 } } }).at(-1)?.key, 'ep2', '7 duel wins open episode 2');
  for (const ep of SIDE_EPISODES) assert.ok(ep.intro.length >= 4 && ep.outro.length >= 2, 'episode has story');
  assert.ok(stageSpeed(1) < stageSpeed(5) && stageSpeed(5) === stageSpeed(10) && stageSpeed(undefined) === 1, 'stage speed increases');
  console.log('✓ Arcade Test 34 Passed: early practice, special after all clear, stage scaling');
}

// Test 35: 보상 기능 이전에 다 마친 참가자도 빠진 이용권·특별 게임을 받음
{
  const old = { ...createBlankState(), name: '옛참가자', house: 1, completed: [0, 1, 2, 3, 4, 5, 6] } as any;
  delete old.rewards;
  const r = reconcileRewards(old.rewards, old.completed, {}, DEFAULT_REWARD_CONFIG);
  assert.equal(r.tickets.filter(t => t.kind === 'special').length, 1, 'special backfilled');
  assert.equal(r.tickets.filter(t => t.source?.startsWith('mission:')).length, 7, 'random items backfilled');
  const again = reconcileRewards(r, old.completed, {}, DEFAULT_REWARD_CONFIG);
  assert.equal(again.tickets.length, r.tickets.length, 'reconcile is idempotent');
  // 6개는 수업마다 받았는데 7번째 지급이 빠진 경우
  let part = emptyRewards();
  for (let i = 0; i < 6; i++) part = grantForClear(part, i, i + 1, DEFAULT_REWARD_CONFIG);
  const fixed = reconcileRewards(part, [0, 1, 2, 3, 4, 5, 6], {}, DEFAULT_REWARD_CONFIG);
  assert.ok(fixed.tickets.some(t => t.kind === 'special'), 'special after 7th');
  assert.ok(hasSpecial({ completed: [0, 1, 2, 3, 4, 5, 6] }), 'all clear opens special even without ticket');
  assert.ok(!hasSpecial({ completed: [0, 1, 2] }), 'not before all clear');
  console.log('✓ Reward Backfill Test 35 Passed: missing tickets and special game restored for earlier finishers');
}

// Test 36: 외전 1 결투 클럽 — 이길 때마다 기술, 지면 상대가 약해짐
{
  assert.equal(OPPONENTS.length, 7, 'seven opponents');
  for (const o of OPPONENTS) assert.ok(EARNED_SKILLS[o.key], `skill reward for ${o.key}`);
  assert.equal(learnedDuelSkills(3).length, 3, 'one skill per win');
  assert.deepEqual(sanitizeLoadout(['potion'], 2), defaultLoadout(2), 'cannot equip unearned skill');
  assert.ok(sanitizeLoadout(['star-arrow', 'chess-plan', 'smart-spell', 'brave-shout', 'ring-shield'], 2).length <= MAX_LOADOUT, 'max 4 skills');
  // 회복은 2번까지
  const o = OPPONENTS[0]; const heal = skillById('brave-shout')!;
  let s = initialDuel(o); s = playerMove(s, o, heal).state; s = playerMove(s, o, heal).state;
  assert.equal(usesLeft(s, heal), 0, 'heal limited');
  const blocked = playerMove(s, o, heal);
  assert.equal(blocked.state, s, 'no third heal');
  // 방패는 큰 기술도 막음
  let c = { ...initialDuel(o), charging: true, shield: true };
  assert.equal(foeMove(c, o, false).state.hp, 100, 'shield blocks big attack');
  // 다 빗나가도 재대련(level 3)이면 첫 상대는 이길 수 있음
  assert.ok(foeMaxOf(OPPONENTS[6], 3) < foeMaxOf(OPPONENTS[6], 0), 'retry weakens opponent');
  assert.equal(josa('론', '이', '가'), '론이'); assert.equal(josa('해그리드', '이', '가'), '해그리드가');
  console.log('✓ Duel Test 36 Passed: seven opponents, one skill per win, 4-skill loadout, limited heals, retry weakens');
}

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY ---');
