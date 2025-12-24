/**
 * 데이터 로드 유틸리티
 * - JSON 기반 시험 데이터/Taxonomy 로드
 */

import { CONFIG, CATEGORY_FILES } from '../config';
import type { ExamData, MasterCodes, TaxonomyFile } from '../types';

let cachedMasterCodes: MasterCodes | null = null;
const examCache = new Map<string, ExamData>();
const taxonomyCache = new Map<string, TaxonomyFile>();

/**
 * 특정 회차의 카테고리 시험 데이터 로드
 */
export async function loadExamData(round: string, category: string): Promise<ExamData> {
    const cacheKey = `${round}_${category}`;

    if (examCache.has(cacheKey)) {
        return clone(examCache.get(cacheKey)!);
    }

    const fileName = CATEGORY_FILES[category];
    if (!fileName) {
        throw new Error(`Unknown category: ${category}`);
    }

    const url = `${CONFIG.EXAMS_PATH}/${round}/${fileName}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load exam data: ${response.statusText}`);
        }

        const data: ExamData = await response.json();
        examCache.set(cacheKey, data);
        console.log(`Loaded ${data.questions.length} questions from ${round} ${category}`);
        return clone(data);
    } catch (e) {
        console.error(`Error loading exam data: ${url}`, e);
        throw e;
    }
}

/**
 * 여러 회차 데이터 로드 및 병합
 */
export async function loadMultipleExams(rounds: string[], category: string): Promise<ExamData> {
    const results = await Promise.all(
        rounds.map(async (r): Promise<ExamData | null> => {
            try {
                const data = await loadExamData(r, category);
                // Inject exam info into each question
                const qs = data.questions.map(q => ({
                    ...q,
                    examInfo: { category, round: r }
                }));
                return { ...data, questions: qs };
            } catch (e) {
                console.warn(`Skipping missing round: ${r}`, e);
                return null;
            }
        })
    );

    // Explicitly assert typings to filters
    const validData = results.filter((d) => d !== null) as ExamData[];

    if (validData.length === 0) {
        throw new Error("No exam data could be loaded");
    }

    // Merge questions
    const mergedQuestions = validData.flatMap(d => d.questions);

    // Return a composite ExamData
    return {
        exam_title: `${validData.map(d => d.exam_title).join(', ')}`,
        year: validData[0].year, // Or range?
        subject_category: category,
        questions: mergedQuestions
    };
}

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 마스터 코드 매핑 로드
 */
export async function loadMasterCodes(): Promise<MasterCodes> {
    if (cachedMasterCodes) {
        return cachedMasterCodes;
    }

    const url = `${CONFIG.TAXONOMY_PATH}/master_codes.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load master codes: ${response.statusText}`);
        }

        cachedMasterCodes = await response.json();
        console.log(`Loaded master codes with ${Object.keys(cachedMasterCodes!).length} entries`);
        return cachedMasterCodes!;
    } catch (e) {
        console.error('Error loading master codes', e);
        throw e;
    }
}

/**
 * 특정 과목 Taxonomy 로드
 */
export async function loadTaxonomy(subject: string): Promise<TaxonomyFile> {
    if (taxonomyCache.has(subject)) {
        return taxonomyCache.get(subject)!;
    }

    const url = `${CONFIG.TAXONOMY_PATH}/${subject}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load taxonomy: ${response.statusText}`);
        }

        const data: TaxonomyFile = await response.json();
        taxonomyCache.set(subject, data);
        return data;
    } catch (e) {
        console.error(`Error loading taxonomy: ${subject}`, e);
        throw e;
    }
}

/**
 * 여러 과목의 Taxonomy 일괄 로드
 */
export async function loadTaxonomies(subjects: string[]): Promise<TaxonomyFile[]> {
    return Promise.all(subjects.map(s => loadTaxonomy(s)));
}

/**
 * 코드로 과목 경로 조회 (master_codes 활용)
 */
export async function getCodePath(code: string): Promise<string> {
    const masterCodes = await loadMasterCodes();
    return masterCodes[code]?.path || code;
}

/**
 * 코드로 과목명 조회
 */
export async function getCodeSubject(code: string): Promise<string> {
    const masterCodes = await loadMasterCodes();
    return masterCodes[code]?.subject || '알 수 없음';
}
