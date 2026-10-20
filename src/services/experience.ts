export type ExperienceMode = 'junior' | 'standard';
export function experienceForGrade(grade: string): ExperienceMode {
  return ['유치원','1학년','2학년'].includes(grade) ? 'junior' : 'standard';
}
