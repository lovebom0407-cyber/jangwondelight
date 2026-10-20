import { confirmDialog } from '../DialogHost';
import React, { useState, useEffect } from 'react';
import { ParticipantState, ZepSubmissionStatus, DutyAssignment, GradeQuizItem } from '../../types';
import {
  HOUSES,
  getMissions,
  INTRO_DIALOGUE,
  FINALE_DIALOGUE,
  getAdminCodes,
  saveAdminCodes,
  getAdminZepLinks,
  saveAdminZepLinks,
  getStationPlaces,
  saveStationPlaces,
  getGradeQuizzes,
  saveGradeQuizzes,
  getGradeQuizStatus
} from '../../data/storyData';
import { getMissionNumber } from '../../data/standardMissions';
import { getDutyAssignments, saveDutyAssignments } from '../../data/eventPlanData';
import { listAllLocalParticipants, saveParticipant } from '../../services/storage';
import { getAllEvidence } from '../../services/evidenceDb';
import { verifyAdminSessionLive, isUsingInitialPassword } from '../../services/adminAuth';
import { AdminPasswordPanel } from './AdminPasswordPanel';
import { RewardSettingsPanel } from './RewardSettingsPanel';
import { setMasterMode, useMasterMode } from '../../services/masterMode';
import {
  CharacterFace,
  FacelessSortingHat
} from '../characterAssets';
import { CHARACTERS } from '../../data/characters';
import { flattenScript } from '../../services/script';
import {
  ArrowLeft,
  KeyRound,
  Save,
  RotateCcw,
  ExternalLink,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Eye,
  RefreshCw,
  MapPin,
  ClipboardList,
  LogOut,
  ShieldAlert,
  Gamepad2,
  Users,
  HelpCircle,
  Check,
  Edit3,
  Gift
} from 'lucide-react';

interface Props {
  isAdmin: boolean;
  adminEmail?: string | null;
  onNavigate: (screen: any) => void;
  onSignOut: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminScreen: React.FC<Props> = ({
  isAdmin,
  adminEmail,
  onNavigate,
  onSignOut,
  onShowToast
}) => {
  const [tab, setTab] = useState<
    'codes' | 'places' | 'duty' | 'quizzes' | 'overview' | 'story' | 'records' | 'operations' | 'preview' | 'account' | 'rewards'
  >(() => (isUsingInitialPassword() ? 'account' : 'codes'));
  const [initialPw, setInitialPw] = useState<boolean>(isUsingInitialPassword());
  const masterOn = useMasterMode();
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '', '']);
  const [zepLinks, setZepLinks] = useState<string[]>(['', '', '', '', '', '', '']);
  const [places, setPlaces] = useState<string[]>(getStationPlaces());
  const [dutyAssignments, setDutyAssignments] = useState<DutyAssignment[]>(getDutyAssignments());
  const [gradeQuizzes, setGradeQuizzes] = useState<GradeQuizItem[]>(getGradeQuizzes());
  const [selectedQuizGrade, setSelectedQuizGrade] = useState<number>(1);
  const [deviceRecords, setDeviceRecords] = useState<ParticipantState[]>([]);
  const [evidenceCount, setEvidenceCount] = useState<{ total: number; uploaded: number; pending: number }>({
    total: 0,
    uploaded: 0,
    pending: 0
  });
  const [previewChapter, setPreviewChapter] = useState<number>(0);

  useEffect(() => {
    // Only load operational data if verified admin
    if (!isAdmin) return;

    setCodes(getAdminCodes());
    setPlaces(getStationPlaces());
    setZepLinks(getAdminZepLinks());
    setDeviceRecords(listAllLocalParticipants());
    getAllEvidence().then(list => {
      const uploaded = list.filter(p => p.status === 'uploaded').length;
      const pending = list.filter(p => p.status !== 'uploaded').length;
      setEvidenceCount({ total: list.length, uploaded, pending });
    }).catch(() => {});
  }, [isAdmin]);

  // Deny access if not authenticated with custom claim admin:true
  if (!isAdmin) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in max-w-[430px] mx-auto text-center pt-8">
        <div className="rounded-3xl border-2 border-[#ff6b6b]/60 bg-[#2b1010] p-6 space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-[#ff8080] mx-auto animate-pulse" />
          <h2 className="font-serif text-2xl font-bold text-[#ffd2d2]">
            접근이 거부되었습니다 (Default Deny)
          </h2>
          <p className="text-xs text-[#fca5a5] leading-relaxed">
            운영실은 이 기기의 운영자 계정으로 로그인한 경우에만 열립니다.
            비로그인, 일반 학생, 또는 익명 사용자의 직접 접근이 전면 차단됩니다.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('admin-login')}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#e4bb70] text-[#1c1204] hover:brightness-105 transition-all cursor-pointer"
            >
              운영자 로그인 화면으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveCodes = async () => {
    if (!isAdmin) {
      onShowToast('권한 오류: 관리자 권한이 없습니다.');
      return;
    }

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    // Check for duplicate non-empty codes across different missions
    const normalized = codes.map((c, i) => ({
      code: String(c ?? '').trim().toUpperCase(),
      missionIndex: i,
      missionTitle: getMissions()[i]?.title || `부스 ${i + 1}`
    }));

    const nonEmptyList = normalized.filter(item => item.code !== '');
    const duplicateItem = nonEmptyList.find(
      (item, idx) => nonEmptyList.findIndex(other => other.code === item.code) !== idx
    );

    if (duplicateItem) {
      const conflicting = nonEmptyList.filter(item => item.code === duplicateItem.code);
      const conflictTitles = conflicting.map(c => `0${c.missionIndex + 1} ${c.missionTitle}`).join(', ');
      onShowToast(`중복 코드 오류: 서로 다른 부스(${conflictTitles})에 동일한 코드("${duplicateItem.code}")를 설정할 수 없습니다.`);
      return;
    }

    saveAdminCodes(codes);
    onShowToast('현장 인증 코드가 안전하게 저장되었습니다.');
  };

  const handleResetCodes = async () => {
    if (!isAdmin) {
      onShowToast('권한 오류: 관리자 권한이 없습니다.');
      return;
    }

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    if (await confirmDialog('모든 현장 인증 코드를 초기 공란("")으로 비울까요?')) {
      const empty = ['', '', '', '', '', '', ''];
      setCodes(empty);
      saveAdminCodes(empty);
      onShowToast('모든 현장 코드가 초기화(공란)되었습니다.');
    }
  };

  const handleSavePlaces = async () => {
    if (!isAdmin) {
      onShowToast('권한 오류: 관리자 권한이 없습니다.');
      return;
    }

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    saveStationPlaces(places);
    onShowToast('부스 장소 명칭이 현재 브라우저에 저장되었습니다.');
  };

  const handleRefreshRecords = async () => {
    if (!isAdmin) return;

    const isLive = await verifyAdminSessionLive(false);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    setDeviceRecords(listAllLocalParticipants());
    getAllEvidence().then(list => {
      const uploaded = list.filter(p => p.status === 'uploaded').length;
      const pending = list.filter(p => p.status !== 'uploaded').length;
      setEvidenceCount({ total: list.length, uploaded, pending });
    }).catch(() => {});
    onShowToast('기기 기록 목록을 새로고침했습니다.');
  };

  const handleSaveZepLinks = async () => {
    if (!isAdmin) {
      onShowToast('권한 오류: 관리자 권한이 없습니다.');
      return;
    }

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    saveAdminZepLinks(zepLinks);
    onShowToast('ZEP 퀴즈 링크 설정이 안전하게 저장되었습니다.');
  };

  const handleResetZepLinks = async () => {
    if (!isAdmin) return;

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onNavigate('admin-login');
      return;
    }

    if (await confirmDialog('모든 미션의 ZEP 퀴즈 링크를 초기 공란("")으로 비울까요?')) {
      const empty = ['', '', '', '', '', '', ''];
      setZepLinks(empty);
      saveAdminZepLinks(empty);
      onShowToast('모든 ZEP 퀴즈 링크가 초기화되었습니다.');
    }
  };

  const handleToggleApproveZep = async (participantName: string, missionIdx: number) => {
    if (!isAdmin) return;

    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }

    const target = deviceRecords.find(p => p.name === participantName);
    if (!target) return;

    const currentStatus = target.records?.[missionIdx]?.zepQuizStatus;
    const nextStatus: ZepSubmissionStatus = currentStatus === 'approved' ? 'reviewPending' : 'approved';

    const updatedRecords = {
      ...target.records,
      [missionIdx]: {
        ...target.records?.[missionIdx],
        zepQuizStatus: nextStatus
      }
    };

    const updatedParticipant = {
      ...target,
      records: updatedRecords
    };

    saveParticipant(updatedParticipant);
    setDeviceRecords(listAllLocalParticipants());
    onShowToast(`${participantName} 학생의 부스 0${missionIdx + 1} ZEP 상태가 [${nextStatus === 'approved' ? '승인 완료' : '확인 대기'}]로 변경되었습니다.`);
  };

  const handleSaveDuties = async () => {
    if (!isAdmin) return;
    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }
    saveDutyAssignments(dutyAssignments);
    onShowToast('교직원 업무분장안이 안전하게 저장되었습니다.');
  };

  const handleUpdateDuty = (id: string, field: 'dept' | 'task' | 'status' | 'notes', val: string) => {
    setDutyAssignments(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveQuizzes = async () => {
    if (!isAdmin) return;
    const isLive = await verifyAdminSessionLive(true);
    if (!isLive) {
      onShowToast('세션 만료: 관리자 권한이 확인되지 않았습니다.');
      onNavigate('admin-login');
      return;
    }
    saveGradeQuizzes(gradeQuizzes);
    onShowToast('학년별 퀴즈(60문항) 설정이 안전하게 저장되었습니다.');
  };

  const handleUpdateQuiz = (quizId: string, partial: Partial<GradeQuizItem>) => {
    setGradeQuizzes(prev =>
      prev.map(q => (q.id === quizId ? { ...q, ...partial } : q))
    );
  };

  const missions = getMissions();

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 학생 웹앱으로
        </button>

        <div className="flex items-center gap-2">
          {adminEmail && (
            <span className="hidden sm:inline text-[11px] font-mono text-[#a8bccc]">
              {adminEmail}
            </span>
          )}
          <span className="text-[11px] font-bold text-[#e4bb70] bg-[#11223b] px-2.5 py-1 rounded-full border border-[#b7985b]/30">
            운영자 모드
          </span>
          <button
            type="button"
            onClick={() => {
              onSignOut();
              onNavigate('start');
              onShowToast('관리자 로그아웃되었습니다.');
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff9885] hover:text-[#ffb3a4] bg-[#2a1313] hover:bg-[#3d1818] border border-[#7a2e2e]/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          JANGWON · CONTROL ROOM
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          별밤학교 운영실
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          사라진 별빛지도 · 현장 코드 및 장소 설정 · 운영 준비 안내
        </p>
      </div>

      {/* Realistic School Notice */}
      <div className="rounded-xl p-3.5 bg-[#17253d] border-l-4 border-[#e4bb70] text-xs text-[#c5d5ec] leading-relaxed space-y-1">
        <p>
          <strong>운영자 핵심 안내:</strong> 등장인물 10종(해리·헤르미온느·론·말포이·볼드모트·덤블도어·맥고나걸·해그리드·헤드위그·스네이프, 마법사의 돌 기준)은 <strong>웹앱 속 디지털 캐릭터</strong>입니다.
          실제 운동장에 호박이나 마법 소품을 배치할 필요가 없으며, 실제 학교 체험 부스의 배움과 사진으로 일곱 기록을 완성하는 서사입니다.
        </p>
        <p className="text-[11px] text-[#9eb2ce]">
          * 모든 현장 QR/수동 코드는 기본 공란(`""`)이며, 운영자가 직접 코드를 등록해야 학생이 해당 부스 미션을 열 수 있습니다.
        </p>
      </div>

      {initialPw && (
        <div role="alert" className="rounded-xl p-3.5 bg-[#3a1d0c] border-2 border-[#e08a3c] text-xs text-[#ffe0c2] leading-relaxed flex items-start justify-between gap-3">
          <span>
            <strong className="text-[#ffb36b]">초기 비밀번호(1234)로 로그인했습니다.</strong> 다른 사람이 운영실에 들어오지 못하도록 이 기기의 비밀번호를 지금 바꿔 주세요.
          </span>
          <button
            type="button"
            onClick={() => setTab('account')}
            className="shrink-0 px-3 py-2 rounded-lg bg-[#ffb36b] text-[#2a1405] font-bold cursor-pointer"
          >
            변경하기
          </button>
        </div>
      )}

      {/* 마스터(테스트) 모드 */}
      <div className={`rounded-2xl p-4 border-2 flex items-center justify-between gap-3 ${masterOn ? 'bg-[#2a1650] border-[#a78bfa]' : 'bg-[#0d1c32] border-[#3b4e6d]'}`}>
        <div className="text-left space-y-0.5">
          <div className="text-sm font-bold text-[#f6ebd5]">🧪 마스터(테스트) 모드 {masterOn ? '켜짐' : '꺼짐'}</div>
          <p className="text-[11px] text-[#c4b5fd] leading-relaxed">
            인증샷 없이 별빛 받기 · 대화 건너뛰기 · 미니게임 바로 배우기 · 볼드모트 바로 이기기 · 현장 코드 생략. 이 기기에만 적용돼요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMasterMode(!masterOn);
            onShowToast(masterOn ? '마스터 모드를 껐습니다.' : '마스터 모드를 켰습니다. 시작 화면에서 학생처럼 진행해 보세요.');
          }}
          className={`shrink-0 min-h-[44px] px-4 rounded-xl font-bold text-sm cursor-pointer ${masterOn ? 'bg-[#a78bfa] text-[#1a0b3a]' : 'bg-[#7c3aed] text-white'}`}
        >
          {masterOn ? '끄기' : '켜기'}
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'codes', label: '현장 코드 설정', icon: <KeyRound className="w-3.5 h-3.5" /> },
          { id: 'places', label: '부스 장소 편집', icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: 'duty', label: '업무분장 관리', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'quizzes', label: '학년별 퀴즈(60문항)', icon: <HelpCircle className="w-3.5 h-3.5" /> },
          { id: 'operations', label: '운영준비물', icon: <ClipboardList className="w-3.5 h-3.5" /> },
          { id: 'overview', label: '전체 구성', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'story', label: '스토리 / 대사', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'records', label: '기기 참여자 기록', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          { id: 'preview', label: '장별 미리보기', icon: <Eye className="w-3.5 h-3.5" /> },
          { id: 'rewards', label: '보상·룰렛 설정', icon: <Gift className="w-3.5 h-3.5" /> },
          { id: 'account', label: '계정·비밀번호', icon: <KeyRound className="w-3.5 h-3.5" /> }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`px-3 py-2 rounded-xl whitespace-nowrap font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-[#e4bb70] text-[#1c1408] font-bold shadow'
                : 'bg-[#101e33] text-[#a9bccf] hover:bg-[#162a47]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'rewards' && <RewardSettingsPanel onShowToast={onShowToast} />}

      {tab === 'account' && (
        <AdminPasswordPanel
          adminEmail={adminEmail}
          onChanged={() => setInitialPw(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* ============================================================== */}
      {/* TAB 1: FIELD CODES CONFIGURATION (Default Empty!) */}
      {/* ============================================================== */}
      {tab === 'codes' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#ffd880] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#ffd880]" />
                <span>7개 부스 현장 인증 코드 (QR 텍스트 / 수동 코드)</span>
              </h3>
              <button
                type="button"
                onClick={handleResetCodes}
                className="text-[11px] text-[#ff8e77] hover:text-[#ffa391] flex items-center gap-1 border border-[#ff8e77]/40 px-2 py-1 rounded cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> 초기 공란으로 리셋
              </button>
            </div>

            <p className="text-xs text-[#a0b5ce] leading-relaxed">
              * 코드가 <strong>빈 문자열(공란)</strong>인 부스는 학생 웹앱에서 빈 QR이나 빈 입력으로 절대 통과되지 않습니다.<br />
              * 각 장소 안내판에 부착할 고유 인증 코드를 입력하고 아래 <strong>[설정 저장]</strong>을 누르세요.
            </p>

            <div className="space-y-3 pt-2">
              {missions.map((m, i) => {
                const currentVal = codes[i] || '';
                const isConfigured = currentVal.trim() !== '';

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-[#374c6b]/50 bg-[#081220] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#e4bb70]">
                          0{getMissionNumber(i)}
                        </span>
                        <strong className="text-xs font-serif text-[#f6ebd5]">
                          {m.title}
                        </strong>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isConfigured
                              ? 'bg-[#183d2e] text-[#63d9a5] border border-[#2e7457]'
                              : 'bg-[#3b1d1d] text-[#ff9885] border border-[#6b2c2c]'
                          }`}
                        >
                          {isConfigured ? '코드 활성화됨' : '미설정 (공란 · 진입 차단)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7d92ad]">
                        {m.place}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:max-w-xs w-full">
                      <input
                        type="text"
                        value={currentVal}
                        placeholder="공란 (미설정)"
                        onChange={e => {
                          const next = [...codes];
                          next[i] = e.target.value.toUpperCase();
                          setCodes(next);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#050c18] border border-[#485f83] text-[#ffd880] font-mono text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveCodes}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>현장 코드 설정 저장하기</span>
              </button>
            </div>
          </div>

          {/* ZEP QUIZ Link Configuration Card (Default Empty!) */}
          <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#ffd880] flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#ffd880]" />
                <span>7개 부스 ZEP QUIZ 링크 설정 (미션별 기본 공란)</span>
              </h3>
              <button
                type="button"
                onClick={handleResetZepLinks}
                className="text-[11px] text-[#ff8e77] hover:text-[#ffa391] flex items-center gap-1 border border-[#ff8e77]/40 px-2 py-1 rounded cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> 초기 공란으로 리셋
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#091526] border border-[#253956] text-xs text-[#a0b5ce] leading-relaxed space-y-1">
              <p>
                * ZEP QUIZ는 부스에 비치된 QR로 참여합니다. 이곳의 링크 입력 여부와 관계없이 학생은 현장에서 퀴즈를 풀고 별밤학교 앱에 활동사진을 올려 인증합니다.
              </p>
              <p className="text-amber-300/90 font-medium">
                * QR 코드 자체 사진 대신 퀴즈에 참여하는 활동사진으로 인증합니다. 사진·별빛은 기기에 보관하고, 보호자가 최종 PDF 제출을 누를 때만 선생님께 PDF를 보냅니다.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {missions.map((m, i) => {
                const currentLink = zepLinks[i] || '';
                const isConfigured = currentLink.trim() !== '';

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-[#374c6b]/50 bg-[#081220] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#e4bb70]">
                          0{getMissionNumber(i)}
                        </span>
                        <strong className="text-xs font-serif text-[#f6ebd5]">
                          {m.title}
                        </strong>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                          isConfigured
                            ? 'bg-[#183d2e] text-[#63d9a5] border border-[#2e7457]'
                            : 'bg-[#253245] text-[#8ca3be] border border-[#3b4e6d]'
                        }`}
                      >
                        {isConfigured ? 'ZEP 연동 활성화 (새 탭)' : '준비 중 (기존 앱 내 퀴즈 진행)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 w-full">
                      <input
                        type="url"
                        value={currentLink}
                        placeholder="예: https://zep.us/play/... (공란 시 앱 내 퀴즈 진행)"
                        onChange={e => {
                          const next = [...zepLinks];
                          next[i] = e.target.value.trim();
                          setZepLinks(next);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#050c18] border border-[#485f83] text-[#ffd880] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveZepLinks}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>ZEP 링크 설정 저장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STATION PLACES EDITING */}
      {/* ============================================================== */}
      {tab === 'places' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-5 space-y-3 shadow-xl">
            <h3 className="font-serif text-base font-bold text-[#ffd880] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#ffd880]" />
              <span>7개 부스 실제 장소 명칭 편집</span>
            </h3>

            <p className="text-xs text-[#a0b5ce] leading-relaxed">
              학교 현장 배치(운동장 동·서편, 체육관, 새도서관 등)에 맞게 부스 장소 명칭을 수정할 수 있습니다.<br />
              * 장소 수정은 현재 브라우저 설정이며 다른 기기로 자동 배포되지 않습니다.
            </p>

            <div className="space-y-3 pt-2">
              {missions.map((m, i) => (
                <div key={m.id} className="p-3 rounded-xl bg-[#081220] border border-[#2f4260] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-[#f6ebd5]">0{getMissionNumber(i)}. {m.title}</span>
                    <span className="text-[10px] text-[#e4bb70]">{m.unlockedClueTitle}</span>
                  </div>
                  <input
                    type="text"
                    value={places[i] || ''}
                    onChange={e => {
                      const next = [...places];
                      next[i] = e.target.value;
                      setPlaces(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1a2d] border border-[#485f83] text-[#f6ebd5] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSavePlaces}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>장소 명칭 저장하기</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: DUTY ASSIGNMENTS (10/7 확정 업무분장안) */}
      {/* ============================================================== */}
      {tab === 'duty' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#ffd880] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ffd880]" />
                <span>2026 장원 별밤학교 교직원 업무분장 (10/7 확정안)</span>
              </h3>
            </div>

            <div className="rounded-xl p-3 bg-[#17253d] border-l-4 border-[#e4bb70] text-xs text-[#c5d5ec] leading-relaxed space-y-1">
              <p>
                <strong>보안 및 권한 주의사항:</strong> 역할 및 세부 업무는 <strong>관리자 운영실에서만 편집</strong> 가능합니다.
                개인정보 보호를 위해 학생 공개 화면이나 외부에는 비상연락처 및 학생 명부가 노출되지 않습니다.
              </p>
              <p className="text-[11px] text-[#ffd880]">
                * 6학년/과학의 [천체관측 전문가 지원]은 제안 상태이므로 [담당미정]으로 표기되며 임의로 확정하지 않습니다.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {dutyAssignments.map((duty) => (
                <div
                  key={duty.id}
                  className="p-3 rounded-xl bg-[#081220] border border-[#2f4260] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-[#1a3356] text-[#ffd880]">
                        {duty.dept}
                      </span>
                      <span className="text-[11px] text-[#8ea4be]">장소/비고: {duty.notes}</span>
                    </div>
                    <select
                      value={duty.status}
                      onChange={e => handleUpdateDuty(duty.id, 'status', e.target.value as any)}
                      className={`text-xs px-2 py-1 rounded-lg font-bold border ${
                        duty.status === '확정'
                          ? 'bg-[#143d2c] border-[#297856] text-[#69e0ab]'
                          : duty.status === '담당미정'
                          ? 'bg-[#3b2413] border-[#7d4e2a] text-[#fca364]'
                          : 'bg-[#213554] border-[#395c8c] text-[#a9c9f0]'
                      }`}
                    >
                      <option value="확정">확정</option>
                      <option value="협조협의">협조협의</option>
                      <option value="담당미정">담당미정 (제안상태)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#7f98b6] block">담당 업무</label>
                    <input
                      type="text"
                      value={duty.task}
                      onChange={e => handleUpdateDuty(duty.id, 'task', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0e1a2d] border border-[#3b4f6d] text-[#f6ebd5] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#7f98b6] block">비고 (운영실/장소 등 - 개인 비상연락처 공개 금지)</label>
                    <input
                      type="text"
                      value={duty.notes || ''}
                      onChange={e => handleUpdateDuty(duty.id, 'notes', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0e1a2d] border border-[#3b4f6d] text-[#cbd8ea] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveDuties}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>업무분장 저장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: GRADE QUIZZES (60 QUESTIONS STRUCTURE) */}
      {/* ============================================================== */}
      {tab === 'quizzes' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-5 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-base font-bold text-[#ffd880] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#ffd880]" />
                <span>학년별 퀴즈 문항 구조 (총 60문항 체계)</span>
              </h3>
              <div className="text-xs bg-[#132742] px-3 py-1 rounded-full border border-[#2b4870] text-[#cbdcf2]">
                등록 완료: <strong className="text-[#62d29e]">{gradeQuizzes.filter(q => q.isRegistered).length}</strong> / 60문항
                (미등록: <strong className="text-[#fca364]">{gradeQuizzes.filter(q => !q.isRegistered).length}</strong>)
              </div>
            </div>

            <div className="rounded-xl p-3 bg-[#1e1509] border-l-4 border-[#d97706] text-xs text-[#fed7aa] leading-relaxed space-y-1">
              <p>
                <strong>중요 원칙:</strong> 실제 교사 제출 문항은 미확보 상태입니다. 관리자에서 학년별 문항 작성 및 미등록(준비중) 표시가 가능한 구조로 지원되며, <strong>미등록 문항을 완성된 60문항이라고 주장하지 않습니다.</strong>
              </p>
              <p className="text-[11px] text-[#fcd34d]">
                * 미등록 상태의 문항은 학생 화면에서 '현장 부스 안내판 대체 활동'으로 부드럽게 전환(fallback)됩니다.
              </p>
            </div>

            {/* Grade Switcher */}
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
              {[1, 2, 3, 4, 5, 6].map(g => {
                const count = gradeQuizzes.filter(q => q.grade === g && q.isRegistered).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedQuizGrade(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedQuizGrade === g
                        ? 'bg-[#ffd880] text-[#1c1305] shadow'
                        : 'bg-[#102038] text-[#9eb7d6] hover:bg-[#182f52]'
                    }`}
                  >
                    <span>{g}학년 ({count}/10)</span>
                  </button>
                );
              })}
            </div>

            {/* Quiz List for Selected Grade */}
            <div className="space-y-3 pt-2">
              {gradeQuizzes
                .filter(q => q.grade === selectedQuizGrade)
                .map(quiz => (
                  <div
                    key={quiz.id}
                    className="p-3.5 rounded-xl bg-[#081220] border border-[#2f4260] space-y-2.5 text-xs text-[#cbd8ea]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f314c] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#e4bb70] bg-[#12223a] px-2 py-0.5 rounded">
                          {quiz.id}
                        </span>
                        <span className="text-[11px] text-[#8da6c5]">
                          연계: {quiz.boothIndex + 1}번 부스 ({missions[quiz.boothIndex]?.title})
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quiz.isRegistered}
                          onChange={e => handleUpdateQuiz(quiz.id, { isRegistered: e.target.checked })}
                          className="w-4 h-4 accent-[#e4bb70]"
                        />
                        <span className={`text-[11px] font-bold ${quiz.isRegistered ? 'text-[#62d29e]' : 'text-[#fca364]'}`}>
                          {quiz.isRegistered ? '등록 완료' : '미등록 (준비 중)'}
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#7f98b6] block">문항 제목</label>
                      <input
                        type="text"
                        value={quiz.title}
                        onChange={e => handleUpdateQuiz(quiz.id, { title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0e1a2d] border border-[#3b4f6d] text-[#f6ebd5] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#7f98b6] block">질문 내용</label>
                      <textarea
                        rows={2}
                        value={quiz.question}
                        onChange={e => handleUpdateQuiz(quiz.id, { question: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0e1a2d] border border-[#3b4f6d] text-[#f6ebd5] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(quiz.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="space-y-1">
                          <div className="text-[10px] text-[#7f98b6] flex items-center justify-between">
                            <span>보기 {optIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuiz(quiz.id, { answer: optIdx })}
                              className={`cursor-pointer px-1.5 py-0.5 rounded text-[9px] ${
                                quiz.answer === optIdx
                                  ? 'bg-[#1b5e3f] text-[#69e0ab] font-bold'
                                  : 'text-[#6f839c] hover:text-[#ffd880]'
                              }`}
                            >
                              {quiz.answer === optIdx ? '★ 정답' : '정답설정'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const nextOpts = [...quiz.options];
                              nextOpts[optIdx] = e.target.value;
                              handleUpdateQuiz(quiz.id, { options: nextOpts });
                            }}
                            className="w-full px-2.5 py-1 rounded bg-[#0e1a2d] border border-[#3b4f6d] text-[#f6ebd5] text-xs focus:ring-1 focus:ring-[#e4bb70] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#7f98b6] block">힌트</label>
                        <input
                          type="text"
                          value={quiz.hint || ''}
                          onChange={e => handleUpdateQuiz(quiz.id, { hint: e.target.value })}
                          className="w-full px-3 py-1 rounded bg-[#0e1a2d] border border-[#3b4f6d] text-[#cbd8ea] text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#7f98b6] block">대체 활동 안내</label>
                        <input
                          type="text"
                          value={quiz.alternativeActivity || ''}
                          onChange={e => handleUpdateQuiz(quiz.id, { alternativeActivity: e.target.value })}
                          className="w-full px-3 py-1 rounded bg-[#0e1a2d] border border-[#3b4f6d] text-[#cbd8ea] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveQuizzes}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>학년별 퀴즈 설정 저장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: OPERATING CHECKLIST & DRIVE */}
      {/* ============================================================== */}
      {tab === 'operations' && (
        <div className="space-y-4 text-xs">
          {/* Real Equipment Preparation Checklist */}
          <div className="p-5 rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] space-y-3 shadow-xl">
            <h3 className="font-serif text-sm font-bold text-[#ffd880] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#ffd880]" />
              <span>실제 학교 현장 운영 준비물 체크리스트</span>
            </h3>

            <div className="space-y-2 text-[#cbd8ea]">
              {[
                { title: '1. 별자리 관찰 부스', desc: '카시오페이아 관찰 안내판, W/M 별자리 활동지 및 필기구' },
                { title: '2. 행성 탐험 부스', desc: '태양계 행성 비교 전시 패널, 고리 행성(토성) 모형 또는 사진 자료' },
                { title: '3. 규칙 퀴즈 부스', desc: '숫자 규칙(2→4→8→16) 퀴즈 안내판 (실제 호박·유령 소품은 필요 없음)' },
                { title: '4. 도서 탐색 부스', desc: '우주, 인공지능, 마법/상상 주제의 실제 어린이 도서 비치 (새 도서관 연계)' },
                { title: '5. 6학년 AI 그림책 부스', desc: '6학년 학생들이 창작한 실제 AI 그림책 전시물' },
                { title: '6. AI 체험부스', desc: 'AI 활용 체험 콘텐츠 / 다양한 AI 체험 활동 / 가족이 함께 즐기는 체험 (현장 운영진 세부 설정 및 안내)' },
                { title: '7. 의상·가족 포토존', desc: '마법 모자/망토 의상, 포토존 배경 또는 네컷 사진 프레임 (*예시 도안·변경될 수 있음)' },
                { title: '8. 최종 천체관측 부스', desc: '운동장 천체망원경 관측 부스 및 천문 지도 선생님 배치' }
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#081220] border border-[#2b3e5c] space-y-0.5">
                  <strong className="text-[#ffd880]">{item.title}</strong>
                  <p className="text-[11px] text-[#9eb2ce]">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#1b2b45] text-[#ffd880] leading-relaxed">
              <strong>* 중요 확인:</strong> 캐릭터 해리, 헤르미온느, 론, 말포이, 볼드모트는 <strong>웹앱 화면 속 디지털 안내자</strong>입니다.
              실제 운동장에 호박 유령이나 숨겨진 마법 상자를 별도로 배치할 필요가 없습니다.
            </div>
          </div>

          <section className="p-5 rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] space-y-3" data-local-photo-status>
            <h3 className="font-bold text-[#ffd880]">이 기기의 인증샷 · {evidenceCount.total}장</h3>
            <p className="text-sm text-[#b8cbdf]">사진은 이 브라우저의 기기 저장소에만 보관됩니다. 다른 참가자의 휴대폰 사진을 이 운영실에서 조회하거나 중앙 수집하지 않습니다.</p>
            <button type="button" className="field-back" onClick={handleRefreshRecords}>기기 기록 새로고침</button>
          </section>

          {/* Survey Google Forms Links */}
          <div className="p-5 rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] space-y-3 shadow-xl">
            <h3 className="font-serif text-sm font-bold text-[#ffd880] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#ffd880]" />
              <span>교육 효과 설문 및 결과 시트 링크</span>
            </h3>

            <div className="space-y-2">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf2lx2IyMA5l-IUmRhgrEMNMhsMCCVmYDy8GDSCqSDVumpK8Q/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-[#13243d] border border-[#3a4f70] text-[#ffd880] hover:bg-[#1a3154] font-medium"
              >
                1. 참여자용 Google 설문지 열기 ↗
              </a>
              <a
                href="https://docs.google.com/forms/d/1vWFI_vzM4KqgbwFhrvPnu0O-qXwzEbHTz89h5UtRxbI/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-[#13243d] border border-[#3a4f70] text-[#cbd8ea] hover:bg-[#1a3154]"
              >
                2. 운영자용 설문 편집 페이지 ↗
              </a>
              <a
                href="https://docs.google.com/spreadsheets/d/1JT7gx2T3R2vJgCfJWFxey-wUbOVZlTI8vZN9fWeGo24/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-[#13243d] border border-[#3a4f70] text-[#cbd8ea] hover:bg-[#1a3154]"
              >
                3. 응답 결과 Google 스프레드시트 ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: OVERVIEW */}
      {/* ============================================================== */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-[#0f1d33] border border-[#b7985b]/30">
              <div className="text-[10px] uppercase text-[#e4bb70]">STORY</div>
              <div className="text-xl font-bold text-[#f6ebd5] mt-1">일곱 기록</div>
              <p className="text-[11px] text-[#8ea3c2] mt-0.5">부스 체험으로 채우는 디지털 별지도</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0f1d33] border border-[#b7985b]/30">
              <div className="text-[10px] uppercase text-[#e4bb70]">HOUSES</div>
              <div className="text-xl font-bold text-[#f6ebd5] mt-1">4개 기숙사</div>
              <p className="text-[11px] text-[#8ea3c2] mt-0.5">용기, 지혜, 창의, 사랑의 별</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0f1d33] border border-[#b7985b]/30">
              <div className="text-[10px] uppercase text-[#e4bb70]">FINALE</div>
              <div className="text-xl font-bold text-[#f6ebd5] mt-1">천체관측</div>
              <p className="text-[11px] text-[#8ea3c2] mt-0.5">하늘의 초대장 & 실제 천체망원경</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1c32] border border-[#b7985b]/30 space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#ffd880]">
              2026 장원 별밤학교 초대 캐릭터 및 상징
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CHARACTERS.map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-[#091426] border border-[#2f4260] flex flex-col items-center text-center space-y-1">
                  <CharacterFace speaker={c.id} size={80} framed={true} />
                  <strong className="text-xs text-[#f6ebd5]">{c.name}</strong>
                  <span className="text-[10px] text-[#e4bb70]">{c.role}</span>
                  <span className="text-[9px] text-[#8fa7c7] font-mono">{c.id}.png</span>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-[#091426] border border-[#2f4260] flex flex-col items-center text-center space-y-1">
                <FacelessSortingHat size={80} />
                <strong className="text-xs text-[#f6ebd5]">분류모자 (소품)</strong>
                <span className="text-[10px] text-[#e5b84c]">기숙사 배정 AR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: STORY & DIALOGUES */}
      {/* ============================================================== */}
      {tab === 'story' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0d1c32] border border-[#b7985b]/30 space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#ffd880]">
              처음 이야기 (헤드위그의 입학 편지)
            </h3>
            <div className="space-y-1.5 pl-2 border-l-2 border-[#b7985b]/50">
              {flattenScript(INTRO_DIALOGUE).map((d, i) => (
                <p key={i} className="text-[#cbd8ea]">
                  <strong className="text-[#ffd880] mr-2">{d[0]}:</strong>
                  {d[1]}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {missions.map((m, i) => (
              <details key={m.id} className="rounded-xl border border-[#3b4e6d] bg-[#0c182c] p-4">
                <summary className="font-serif font-bold text-[#f6ebd5] cursor-pointer">
                  0{getMissionNumber(i)} {m.lessonName} · {m.title} ({m.place}) · {m.speakers.join('·')}
                </summary>

                <div className="pt-3 space-y-3 border-t border-[#293a54] mt-3">
                  <div className="space-y-1">
                    <span className="font-bold text-[#ffd880]">부스 안내 대사:</span>
                    {flattenScript(m.introLines).map(([sp, l], j) => (
                      <p key={j} className="text-[#b5c7dd] pl-2">
                        {sp}: {l}
                      </p>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#142640] space-y-1">
                    <span className="font-bold text-[#62d29e]">해금되는 디지털 기록:</span>
                    <p className="font-bold text-[#ffd880] pl-2">{m.unlockedClueTitle}</p>
                    <p className="text-[11px] text-[#cfe4dc] pl-2">{m.unlockedClueDesc}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-[#ffd880]">완수 축하 대사:</span>
                    {flattenScript(m.rewardLines).map(([sp, l], j) => (
                      <p key={j} className="text-[#b5c7dd] pl-2">
                        {sp}: {l}
                      </p>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#0d1c32] border border-[#b7985b]/30 space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#ffd880]">
              마지막 이야기 대사
            </h3>
            <div className="space-y-1.5 pl-2 border-l-2 border-[#b7985b]/50">
              {flattenScript(FINALE_DIALOGUE).map((d, i) => (
                <p key={i} className="text-[#cbd8ea]">
                  <strong className="text-[#ffd880] mr-2">{d[0]}:</strong>
                  {d[1]}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: DEVICE RECORDS */}
      {/* ============================================================== */}
      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#aebecd]">
              이 기기에 저장된 학생 프로필: <strong>{deviceRecords.length}명</strong>
            </span>
            <button
              type="button"
              onClick={handleRefreshRecords}
              className="px-2.5 py-1.5 rounded-lg bg-[#112038] border border-[#b7985b]/40 text-[#ffd880] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> 새로고침
            </button>
          </div>

          {deviceRecords.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#445b7f] text-center text-xs text-[#8ca2be]">
              이 브라우저에 등록된 학생 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {deviceRecords.map(rec => {
                const house = rec.house !== null ? HOUSES[rec.house] : null;
                const pCode = rec.participantCode || `BW-${rec.participantId.slice(0, 4).toUpperCase()}`;

                return (
                  <div
                    key={rec.participantId}
                    className="p-4 rounded-xl border border-[#3b4e6c] bg-[#0c182c] space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-serif text-[#ffd880]">
                            {rec.name}
                          </strong>
                          <span className="text-[#cbd8ea]">
                            ({rec.family || '가족 미입력'})
                          </span>
                          {house && (
                            <span className="font-semibold" style={{ color: house.color }}>
                              ● {house.name}
                            </span>
                          )}
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1c2e47] text-[#9eb6d4] border border-[#3b4e6d]/40">
                            기기 ID: {rec.participantId.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8fa3bd]">
                          미션 완료: <strong>{new Set(rec.completed || []).size} / 7</strong> · {new Set(rec.completed || []).size >= 7 ? '전체 완수' : '자유 탐험 진행 중'}
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-[#8ea3c2]">
                        <span>{rec.photo ? '입학사진 등록됨 ✓' : '입학사진 없음'}</span>
                      </div>
                    </div>

                    {/* ZEP Quiz Status per Station */}
                    <div className="pt-2 border-t border-[#1e3049] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#b5cce6]">ZEP 퀴즈 결과 제출 현황:</span>
                        <span className="text-[10px] text-amber-300/90 font-medium">이전 버전의 ZEP 기록 · 기기에 보관됨</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getMissions(rec.experienceMode).map((m, mIdx) => {
                          const r = rec.records?.[mIdx];
                          const hasZep = r?.zepQuizSubmitted;

                          return (
                            <div
                              key={mIdx}
                              className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                hasZep
                                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                                  : 'bg-[#081220] border-[#20314a] text-[#6d829d]'
                              }`}
                            >
                              <div className="truncate mr-2">
                                <span className="font-mono font-bold mr-1">0{getMissionNumber(mIdx, rec.experienceMode)}</span>
                                <span>{m.title}: </span>
                                <strong>
                                  {hasZep ? '● 캡처 기기 저장됨' : '미제출'}
                                </strong>
                              </div>

                              {hasZep && (
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1d2d42] text-[#8ea4be] border border-[#3b4f6e]/40"
                                  title="서버 검토 기능 연결 전까지 별빛 조각 지급이 불가합니다."
                                >
                                  서버 검토 미연결
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: CHAPTER PREVIEW */}
      {/* ============================================================== */}
      {tab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#aebecd]">미리볼 부스 선택:</span>
            <div className="flex gap-1 overflow-x-auto">
              {missions.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreviewChapter(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    previewChapter === i ? 'bg-[#ffd880] text-[#1c1408]' : 'bg-[#101f36] text-[#a0b5ce]'
                  }`}
                >
                  0{getMissionNumber(i)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl border-2 border-[#b7985b]/40 bg-[#0d1c32] space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#304462] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#e4bb70]">
                  ADMIN CHAPTER PREVIEW (미리보기 모드)
                </span>
                <h3 className="font-serif text-lg font-bold text-[#f6ebd5]">
                  제 {previewChapter + 1}장: {missions[previewChapter]?.title}
                </h3>
                <p className="text-xs text-[#8fa2be]">
                  장소: {missions[previewChapter]?.place}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#c5d5ec] leading-relaxed">
              <p>
                <strong>부스 체험 스토리:</strong><br />
                {missions[previewChapter]?.story}
              </p>

              <div className="p-3 rounded-xl bg-[#13243d] border border-[#2c3f5c]">
                <strong className="text-[#ffd880]">현장 부스 활동 안내:</strong>
                <p className="mt-1">{missions[previewChapter]?.boothGuide}</p>
              </div>

              {missions[previewChapter]?.question ? (
                <div className="p-3 rounded-xl bg-[#13243d] border border-[#2c3f5c] space-y-1">
                  <p className="font-bold text-[#ffd880]">
                    부스 퀴즈: {missions[previewChapter]?.question}
                  </p>
                  <p className="text-[#62d29e] font-semibold">
                    정답: {missions[previewChapter]?.options?.[missions[previewChapter]?.answer || 0]}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#13243d] border border-[#2c3f5c]">
                  <p className="font-bold text-[#ffd880]">
                    현장 활동: {missions[previewChapter]?.activity}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#0c2420] border border-[#2d7363] space-y-1 text-[#cfece1]">
                <strong className="text-[#62d29e]">완수 후 해금될 디지털 기록:</strong>
                <p className="font-bold text-[#ffd880]">{missions[previewChapter]?.unlockedClueTitle}</p>
                <p className="text-[11px] leading-relaxed">{missions[previewChapter]?.unlockedClueDesc}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#11233b] border border-[#2d4668] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#ffd880] flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-[#ffd880]" />
                    <span>ZEP QUIZ 연동 현황:</span>
                  </span>
                  <span className="text-[10px] text-[#a0bad6]">
                    {zepLinks[previewChapter] ? 'ZEP 연동 활성화' : '기존 앱 내 퀴즈/활동 진행'}
                  </span>
                </div>
                {zepLinks[previewChapter] ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-[#b8d1ea] truncate">
                      연결 링크: <span className="font-mono text-[#ffd880]">{zepLinks[previewChapter]}</span>
                    </p>
                    <div className="p-2 rounded bg-[#091526] border border-[#233852] text-[11px] text-[#9cb4ce] space-y-1">
                      <span className="font-semibold text-[#ffd880] block">학생 화면 ZEP 닉네임 안내 문구:</span>
                      <p className="italic text-[#d2e2f4]">
                        “ZEP 닉네임에는 별밤학교 앱에 입력한 자신의 이름을 똑같이 적어 주세요. 동명이인은 앱과 ZEP 모두 김장원(3학년 1반)처럼 입력하세요. 퀴즈 완료 후 이름·퀴즈 제목·점수 또는 완료 표시가 보이도록 결과 화면을 캡처해 제출해 주세요.”
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#7f98b6]">
                    * 현재 링크가 공란이며, 학생 앱에서는 위 현장 부스 활동/퀴즈로 자동 진행됩니다.
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#ffb099] italic">
              * 관리자 미리보기 모드는 텍스트 점검용이며 실제 학생 진행 상태를 변경하거나 업로드를 실행하지 않습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
