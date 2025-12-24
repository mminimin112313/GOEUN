/**
 * 퀴즈 엔진 - 문제 필터링 및 세션 생성
 */

import type { Question, QuizConfig, ExamData } from '../types';
import { matchesSelectedCodes } from '../db/taxonomy';
import { CATEGORY_MAP, SUBJECT_CODE_MAP } from '../config';
import { missionStore } from '../stores';
import { XP_REWARDS } from './missions';
import { get } from 'svelte/store';

/**
 * ExamData에서 조건에 맞는 문제 필터링
 */
export function filterQuestions(examData: ExamData, config: QuizConfig): Question[] {
    let pool = [...examData.questions];

    // 1. 선택된 과목 필터 (비어있으면 전체)
    if (config.selectedSubjects.length > 0) {
        const validPrefixes = config.selectedSubjects
            .map(subj => SUBJECT_CODE_MAP[subj])
            .filter(Boolean);

        pool = pool.filter(q =>
            q.subjects.some(code =>
                validPrefixes.some(prefix => code.startsWith(prefix))
            )
        );
    }

    // 2. 세부 분류 코드 필터
    if (config.selectedCodes.length > 0) {
        pool = pool.filter(q =>
            matchesSelectedCodes(q.subjects, config.selectedCodes)
        );
    }

    return pool;
}

/**
 * 필터링된 문제 풀에서 세션 문제 생성
 */
export function createSessionQuestions(
    pool: Question[],
    seenIds: Set<string>,
    config: QuizConfig
): Question[] {
    const unseen = pool.filter(q => !seenIds.has(String(q.id)));
    const seen = pool.filter(q => seenIds.has(String(q.id)));

    // Shuffle helper
    const shuffle = <T>(array: T[]): T[] =>
        [...array].sort(() => Math.random() - 0.5);

    let selected: Question[] = [];
    const needed = config.questionCount;

    if (config.prioritizeUnseen) {
        // 안 푼 문제 우선
        if (unseen.length >= needed) {
            selected = shuffle(unseen).slice(0, needed);
        } else {
            selected = [
                ...shuffle(unseen),
                ...shuffle(seen).slice(0, needed - unseen.length)
            ];
        }
    } else {
        // 전체에서 랜덤
        selected = shuffle([...pool]).slice(0, needed);
    }

    // 선지 셔플 처리
    return selected.map(q => {
        const opts = q.options.map((text, i) => ({
            text: text.trim(),
            originalIndex: i + 1  // 1-based
        }));

        if (config.shuffleOptions) {
            opts.sort(() => Math.random() - 0.5);
        }

        return { ...q, displayOptions: opts };
    });
}

/**
 * 정답 확인 (1-based index)
 */
export function isCorrectAnswer(question: Question, selectedIndex: number): boolean {
    return question.answer === selectedIndex;
}

/**
 * 문제 통계 계산 및 XP 지급
 */
export function calculateScore(
    questions: Question[],
    answers: Record<number, number>
): { correct: number; total: number; percentage: number } {
    let correct = 0;

    questions.forEach((q, idx) => {
        const selected = answers[idx];
        if (selected !== undefined && isCorrectAnswer(q, selected)) {
            correct++;
        }
    });

    // XP 지급 로직
    const store = get(missionStore);
    let earnedXp = correct * XP_REWARDS.CORRECT_ANSWER;

    // 보너스: 다 맞으면 100XP, 그냥 완료하면 50XP
    if (correct === questions.length && questions.length > 0) {
        earnedXp += XP_REWARDS.PERFECT_SCORE;
    } else if (questions.length > 0) {
        earnedXp += XP_REWARDS.COMPLETE_QUIZ;
    }

    // 스토어 업데이트
    missionStore.update(s => ({
        ...s,
        totalXp: s.totalXp + earnedXp,
        lastActiveDate: new Date().toISOString()
    }));

    return {
        correct,
        total: questions.length,
        percentage: questions.length > 0
            ? Math.round((correct / questions.length) * 100)
            : 0
    };
}
