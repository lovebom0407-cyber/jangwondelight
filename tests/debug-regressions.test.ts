import assert from 'node:assert/strict';
import { createBlankState, cleanParticipantState } from '../src/services/storage';
import { validateScreenGuard } from '../src/services/screenGuard';
const profile = { ...createBlankState(), name:'복구 점검', house:0, completed:[0,2] };

const migrated=cleanParticipantState({...profile,cloudPhotoConsent:true})!;
assert.equal(migrated.cloudPhotoConsent,false);assert.deepEqual(migrated.completed,profile.completed);
console.log('PASS: previously enabled cloud consent is disabled while preserving existing progress');

const repaired=cleanParticipantState({...profile,house:1.5,selectedMissionIndex:2.5,unlocked:2.5,pendingMission:2.5,records:{0:'damaged',2:{evidenceId:'keep-photo'}}})!;
assert.equal(repaired.house,null);assert.equal(repaired.selectedMissionIndex,null);assert.equal(repaired.unlocked,null);assert.equal(repaired.pendingMission,null);
assert.deepEqual(repaired.completed,[0,2]);assert.equal(repaired.records[2].evidenceId,'keep-photo');assert.equal(repaired.records[0].status,'completed');
console.log('PASS: malformed saved fields are repaired without losing valid photos or completed missions');

assert.equal(validateScreenGuard('retired-screen' as any,profile),'map');
assert.equal(validateScreenGuard('retired-screen' as any,createBlankState()),'start');
for(const bad of [null,undefined,NaN,1.5,-1,7])for(const screen of ['mission','scan','evidence'] as const)assert.equal(validateScreenGuard(screen,{...profile,selectedMissionIndex:bad as any}),'map');
assert.equal(validateScreenGuard('reward',{...profile,selectedMissionIndex:1}),'map');
assert.equal(validateScreenGuard('reward',{...profile,selectedMissionIndex:2}),'reward');
assert.equal(validateScreenGuard('ending',{...profile,completed:[0,1,2,3,4,5,99]}),'map');
assert.equal(validateScreenGuard('junior-final',{...profile,completed:[0,1,2,3,4,5,6]}),'junior-final');
assert.equal(validateScreenGuard('mission',{...profile,completed:[0,1,2,3,4,5,6],selectedMissionIndex:null}),'map');
assert.equal(validateScreenGuard('map',{...profile,house:1.5}),'enroll');
console.log('PASS: stale history, invalid selections and incomplete rewards cannot render broken screens');
console.log('ALL 3 DEBUG REGRESSION CHECKS PASSED');
