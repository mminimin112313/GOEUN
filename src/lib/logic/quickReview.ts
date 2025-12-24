/**
 * 빠른 복습 우선순위 로직
 * Quick Review Priority Logic
 */

import type { WrongNote } from '../types';

interface ReviewPriority {
    note: WrongNote;
    score: number;
}

/**
 * 복습 우선순위 계산 및 상위 N개 반환
 * Priority factors:
 * 1. Days since last review (higher = more priority)
 * 2. Consecutive correct count (lower = more priority)
 * 3. Wrong count (higher = more priority)
 */
export function calculateReviewPriority(notes: WrongNote[], count: number = 5): WrongNote[] {
    const now = Date.now();

    const scored: ReviewPriority[] = notes
        .filter(n => !n.isGraduated)
        .map(note => {
            let score = 0;

            // Factor 1: Days since last review (max 100 points)
            // Notes never reviewed get highest priority
            const lastReview = note.lastReviewDate || note.timestamp;
            const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);
            score += Math.min(daysSinceReview * 10, 100);

            // Factor 2: Consecutive correct count (0-3 range, inverted)
            // 0 correct = 60 points, 3 correct = 0 points
            score += (3 - Math.min(note.consecutiveCorrect, 3)) * 20;

            // Factor 3: Wrong count (5 points per wrong, max 50)
            score += Math.min(note.wrongCount * 5, 50);

            return { note, score };
        })
        .sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(s => s.note);
}

/**
 * 필터 적용 후 복습 대상 선별
 */
export function getQuickReviewQuestions(
    notes: WrongNote[],
    options?: {
        subjectFilter?: string;
        classificationFilter?: string[];
        count?: number;
    }
): WrongNote[] {
    let filtered = notes.filter(n => !n.isGraduated);

    // Subject filter (공법/민사법/형사법)
    if (options?.subjectFilter && options.subjectFilter !== 'all') {
        filtered = filtered.filter(n =>
            n.examInfo?.category === options.subjectFilter ||
            n.subject === options.subjectFilter
        );
    }

    // Classification filter (subjects codes)
    if (options?.classificationFilter && options.classificationFilter.length > 0) {
        filtered = filtered.filter(n =>
            n.subjects?.some(s =>
                options.classificationFilter!.some(f => s.startsWith(f))
            )
        );
    }

    return calculateReviewPriority(filtered, options?.count || 5);
}
