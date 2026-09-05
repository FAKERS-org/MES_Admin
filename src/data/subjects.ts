import { Atom, BookOpen, BookText, Brain, FlaskConical, FunctionSquare, Languages } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";
import { institutions } from "@/data/institutions";

export interface ExamSubject {
  id: string;
  titleKey: TranslationKey;
  typeKey: TranslationKey;
  icon: LucideIcon;
  questionCount: number;
  durationMinutes: number;
  marks?: number;
}

export interface ExamGroup {
  groupKey?: TranslationKey;
  flagCode?: string;
  subjects: ExamSubject[];
  combinedExam?: boolean;
}

const grammar: ExamSubject = {
  id: "grammar",
  titleKey: "subjects.ifl.grammar",
  typeKey: "examType.mcq",
  icon: Languages,
  questionCount: 30,
  durationMinutes: 30,
  marks: 40,
};

const vocabulary: ExamSubject = {
  id: "vocabulary",
  titleKey: "subjects.ifl.vocabulary",
  typeKey: "examType.mcq",
  icon: BookText,
  questionCount: 30,
  durationMinutes: 30,
  marks: 30,
};

const readings: ExamSubject = {
  id: "readings",
  titleKey: "subjects.ifl.readings",
  typeKey: "examType.mcq",
  icon: BookOpen,
  questionCount: 30,
  durationMinutes: 40,
  marks: 30,
};

export const subjectsByInstitution: Record<string, { titleKey: TranslationKey; groups: ExamGroup[] }> = {
  itc: {
    titleKey: "overview.institutions.itc",
    groups: [
      {
        subjects: [
          { id: "math", titleKey: "subjects.itc.math", typeKey: "examType.mcq", icon: FunctionSquare, questionCount: 30, durationMinutes: 120 },
          { id: "physics", titleKey: "subjects.itc.physics", typeKey: "examType.mcq", icon: Atom, questionCount: 30, durationMinutes: 120 },
          { id: "chemistry", titleKey: "subjects.itc.chemistry", typeKey: "examType.mcq", icon: FlaskConical, questionCount: 30, durationMinutes: 120 },
          { id: "logic", titleKey: "subjects.itc.logic", typeKey: "examType.mcq", icon: Brain, questionCount: 30, durationMinutes: 60 },
        ],
      },
    ],
  },
  ifl: {
    titleKey: "overview.institutions.ifl",
    groups: [
      { groupKey: "subjects.ifl.english", flagCode: "gb", subjects: [grammar, vocabulary, readings], combinedExam: true },
      { groupKey: "subjects.ifl.chinese", flagCode: "cn", subjects: [grammar, vocabulary, readings], combinedExam: true },
      { groupKey: "subjects.ifl.korean", flagCode: "kr", subjects: [grammar, vocabulary, readings], combinedExam: true },
    ],
  },
};

export function findSubject(
  institution: string,
  subjectId: string,
): { subject: ExamSubject; group: ExamGroup } | null {
  const data = subjectsByInstitution[institution];
  if (!data) return null;
  for (const group of data.groups) {
    const subject = group.subjects.find((s) => s.id === subjectId);
    if (subject) return { subject, group };
  }
  return null;
}

export const supportedInstitutions = institutions.filter((i) => i.id in subjectsByInstitution);

export function getSubjectCount(institutionId: string): number {
  const data = subjectsByInstitution[institutionId];
  if (!data) return 0;
  return data.groups.reduce((sum, group) => sum + group.subjects.length, 0);
}
