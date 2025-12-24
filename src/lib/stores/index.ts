import { persisted } from './persistence';
import { synced } from './synced';
import type { QuizConfig, QuizRecord, WrongNote, QuestionMemos } from '../types';
import { writable } from 'svelte/store';

// synced( localStorageKey, firestoreDocId, initialValue )

export const quizConfig = synced<QuizConfig>('quiz_config', 'config', {
    category: '공법',              // 공법/민사법/형사법
    startYear: 2018,
    endYear: 2024,
    examTypes: ['official'],       // Default: 변호사시험 only
    selectedRounds: [],            // Will be computed on load
    selectedSubjects: [],          // 하위 과목 ['헌법', '행정법']
    selectedCodes: [],             // 세부 분류 코드
    questionCount: 10,
    prioritizeUnseen: true,
    shuffleOptions: true
});

export const quizHistory = synced<QuizRecord[]>('quiz_history', 'history', []);

export const wrongNotes = synced<WrongNote[]>('quiz_wrong_notes', 'wrong_notes', []);

export const questionMemos = synced<QuestionMemos>('quiz_question_memos', 'question_memos', {});

export const seenIds = synced<string[]>('quiz_seen_ids', 'seen_ids', []);

// Mission / Gamification Store
import { getInitialMissionState } from '../logic/missions';
import type { MissionState } from '../types';
export const missionStore = synced<MissionState>('quiz_mission_state', 'mission', getInitialMissionState());

// Session state is kept local
export const quizSession = persisted<any>('quiz_session_active', null);

// Data stores
export const allQuestions = writable<any[]>([]);
export const isDataLoading = writable<boolean>(false);
export const dataError = writable<string | null>(null);

export * from './data';
export * from './auth';
export * from './gamification';
