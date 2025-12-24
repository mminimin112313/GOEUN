/**
 * 변호사시험 Quiz App 타입 정의
 */

// ============ Taxonomy 관련 ============

export interface TaxonomyDepth3 {
    depth3_code: string;
    depth3_name: string;
}

export interface TaxonomyDepth2 {
    depth2_code: string;
    depth2_name: string;
    depth3_items: TaxonomyDepth3[];
}

export interface TaxonomyDepth1 {
    depth1_code: string;
    depth1_name: string;
    depth2_items: TaxonomyDepth2[];
}

export interface TaxonomyFile {
    subject: string;
    categories: TaxonomyDepth1[];
}

export interface MasterCode {
    subject: string;
    path: string;
}

export type MasterCodes = Record<string, MasterCode>;

// ============ 문제 관련 ============

export interface Question {
    id: number;
    subjects: string[];      // ["CON_01_02_02"] 분류 코드 배열
    question: string;
    passage?: string | null; // 지문 (nullable)
    options: string[];
    answer: number;          // 1-based (원본 유지)

    // UI helper for randomized order
    displayOptions?: { text: string; originalIndex: number }[];
    examInfo?: {
        category: string;
        round: string;
        examName?: string; // e.g. "제1회 변호사시험"
        examYear?: string; // e.g. "2012"
    };
}

export interface ExamData {
    exam_title: string;      // "제1회 변호사시험"
    year: string;            // "2012"
    subject_category: string; // "공법"
    questions: Question[];
}

// ============ 퀴즈 설정 ============

export interface QuizConfig {
    category: string;           // '공법' | '민사법' | '형사법'

    // New Range Filters
    startYear: number;          // 2012 ~ 2024
    endYear: number;
    examTypes: string[];        // ['official', '6mo', '8mo', '10mo']

    // Legacy (Computed from Range) - kept for compatibility if needed, but primary logic moves to range
    selectedRounds: string[];   // ['1회', '2회'] - Computed

    selectedSubjects: string[]; // ['헌법', '행정법'] - 하위 과목 선택
    selectedCodes: string[];    // ['CON_01', 'ADM_02_01'] - 세부 분류 코드
    questionCount: number;
    prioritizeUnseen: boolean;
    shuffleOptions: boolean;
}

// ============ 학습 기록 ============

export interface QuizRecord {
    id: number;              // Timestamp
    date: string;
    timestamp: number;
    category: string;
    round: string;
    score: number;
    total: number;
    timeTaken: number;
    questions: Question[];
    answers: Record<number, number>; // qIndex -> selectedOption (1-based)
    questionTimes?: number[];
}

export interface WrongNote extends Question {
    timestamp: number;
    wrongCount: number;
    consecutiveCorrect: number;
    lastWrongDate?: number;
    lastReviewDate?: number;
    isGraduated?: boolean;
    memo?: string;
    examInfo?: {
        category: string;
        round: string;
    };
}

// ============ 게이미피케이션 ============

export interface MissionState {
    lastActiveDate: string;
    currentStreak: number;
    maxStreak: number;
    dailyProgress: number;
    dailyTarget: number;
    totalXp: number;
}
