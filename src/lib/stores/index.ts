import { persisted } from './persistence';
import { synced } from './synced';
import type { QuizConfig, QuizRecord, WrongNote } from '../types';
import { writable } from 'svelte/store';

// synced( localStorageKey, firestoreDocId, initialValue )

export const quizConfig = synced<QuizConfig>('quiz_config', 'config', {
    category: '공법',              // 공법/민사법/형사법
    round: '1회',                  // 1회~12회
    selectedRounds: ['1회'],       // Default to 1st
    selectedSubjects: [],          // 하위 과목 ['헌법', '행정법']
    selectedCodes: [],             // 세부 분류 코드
    questionCount: 10,
    prioritizeUnseen: true,
    shuffleOptions: true
});

export const quizHistory = synced<QuizRecord[]>('quiz_history', 'history', []);

export const wrongNotes = synced<WrongNote[]>('quiz_wrong_notes', 'wrong_notes', []);

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
