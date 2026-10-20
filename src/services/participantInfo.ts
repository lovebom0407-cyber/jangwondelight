export function normalizeClassroom(value: unknown): string {
  const text = String(value ?? '').normalize('NFKC').trim().replace(/반\s*$/, '').trim().slice(0, 20);
  return /^\d{1,2}$/.test(text) ? String(Number(text)) : text;
}

export function classroomLabel(value: unknown): string {
  const classroom = normalizeClassroom(value);
  return classroom ? `${classroom}반` : '반미입력';
}

export function fullSchoolName(value: unknown): string {
  const school = String(value ?? '').normalize('NFC').trim();
  if (!school || school === '기타') return '학교미입력';
  return school.endsWith('초') ? `${school}등학교` : school;
}
