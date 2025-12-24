import type { QuizRecord, Question, WrongNote } from '$lib/types';
import { SUBJECT_MAP } from '$lib/config';

export interface InsightMetric {
    title: string;
    value: string | number;
    subText: string;
    color: 'red' | 'blue' | 'orange' | 'emerald';
    link?: string;
}

/**
 * Finds the subject with the lowest accuracy from recent history.
 */
export function getWeakestSubjectAnalysis(history: QuizRecord[]): InsightMetric | null {
    if (history.length === 0) return null;

    const subjectStats: Record<string, { total: number, correct: number, name: string }> = {};

    // Helper to get generic name
    const getGenericName = (idOrName: string) => {
        // Try to find key in SUBJECT_MAP where value == idOrName
        const entry = Object.entries(SUBJECT_MAP).find(([k, v]) => v === idOrName || k === idOrName);
        return entry ? entry[0] : idOrName;
    };

    history.forEach(h => {
        const subName = getGenericName(h.subjectId || h.subject);
        if (!subjectStats[subName]) subjectStats[subName] = { total: 0, correct: 0, name: subName };

        subjectStats[subName].total += h.total;
        subjectStats[subName].correct += h.score;
    });

    // Find lowest accuracy (min 10 questions to be significant?)
    let weakest = null;
    let minAcc = 101;

    Object.values(subjectStats).forEach(stat => {
        if (stat.total < 5) return; // Skip if too few data
        const acc = (stat.correct / stat.total) * 100;
        if (acc < minAcc) {
            minAcc = acc;
            weakest = stat;
        }
    });

    if (!weakest) return null;

    return {
        title: '취약 과목',
        value: weakest.name,
        subText: `정답률 ${Math.round(minAcc)}%`,
        color: 'red',
        link: '/review'
    };
}

/**
 * Finds a subject that has been least explored.
 * Requires access to All Questions vs Seen IDs (or inferred from history size).
 * Since we might not have 'seenIds' mapped by subject easily, we can use history counts.
 */
export function getUnstudiedSubjectAnalysis(history: QuizRecord[], allQuestions: Question[]): InsightMetric | null {
    // 1. Count questions per subject in History
    const historyCounts: Record<string, number> = {};
    history.forEach(h => {
        // Identify subject
        const entry = Object.entries(SUBJECT_MAP).find(([k, v]) => v === h.subjectId || k === h.subject);
        const subKey = entry ? entry[1] : (h.subjectId || 'unknown');
        historyCounts[subKey] = (historyCounts[subKey] || 0) + h.total;
    });

    // 2. Map All Questions to subjects
    // We assume allQuestions store is populated (it loads at startup)
    const totalCounts: Record<string, number> = {};
    allQuestions.forEach(q => {
        const entry = Object.entries(SUBJECT_MAP).find(([k, v]) => k === q.subject || v === q.subject);
        const subKey = entry ? entry[1] : 'unknown';
        totalCounts[subKey] = (totalCounts[subKey] || 0) + 1;
    });

    // 3. Find subject with lowest "Coverage"
    let lowestSub = null;
    let lowestRatio = 1.01;

    Object.entries(SUBJECT_MAP).forEach(([k, v]) => { // v is ID 'civil_law'
        const total = totalCounts[v] || 0;
        if (total === 0) return;
        const studied = historyCounts[v] || 0;
        const ratio = studied / total;

        if (ratio < lowestRatio) {
            lowestRatio = ratio;
            lowestSub = { name: k, ratio };
        }
    });

    if (!lowestSub) return null;

    // If ratio is 0, it's "Unstarted"
    // If ratio is low, it's "Explore"
    return {
        title: '학습 필요',
        value: lowestSub.name,
        subText: `진도율 ${(lowestSub.ratio * 100).toFixed(1)}%`,
        color: 'blue'
    };
}

/**
 * Returns info about pending reviews
 */
export function getReviewStatusAnalysis(wrongNotes: WrongNote[]): InsightMetric {
    const pending = wrongNotes.filter(n => n.consecutiveCorrect === 0).length;

    return {
        title: '복습 대기',
        value: `${pending}문제`,
        subText: pending > 0 ? '지금 복습하세요!' : '모두 완료했습니다.',
        color: pending > 0 ? 'orange' : 'emerald',
        link: '/review'
    };
}
