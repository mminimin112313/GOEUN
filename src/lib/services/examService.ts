import { base } from '$app/paths';

export interface ExamQuestion {
    id: number;
    subjects: string[];
    question: string;
    passage: string | null;
    options: string[];
    answer: number;
    // Augmented fields
    exam_round?: string;
    exam_year?: string;
    exam_type?: 'official' | 'mock';
    subject_category?: string;
    exam_title?: string;
}

export interface ExamRound {
    round: string;
    year: string;
    type: 'official' | 'mock';
    exam_title: string;
    subjects: {
        category: string;
        questionCount: number;
        taxonomy_stats: Record<string, number>;
        path: string; // relative path from static
        data?: {
            exam_title: string;
            year: number;
            subject_category: string;
            questions: ExamQuestion[];
        }; // Cache for loaded data
    }[];
}

export interface FilterCriteria {
    yearRange?: [number, number];
    type?: 'official' | 'mock' | 'all';
    categories?: string[]; // '공법', '민사법', etc.
    subjects?: string[]; // Taxonomy codes
    keyword?: string; // Search in question/passage
}

class ExamDataService {
    private exams: ExamRound[] = [];
    private isLoaded = false;
    private isLoading = false;

    async init() {
        if (this.isLoaded || this.isLoading) return;
        this.isLoading = true;

        try {
            console.log('[ExamDataService] Loading exam index...');
            const indexRes = await fetch(`${base}/data/exam_index.json`);
            if (!indexRes.ok) throw new Error('Failed to load exam index');

            const examIndex: ExamRound[] = await indexRes.json();

            // Parallel fetch of all exam files
            const fetchPromises = examIndex.map(async (exam) => {
                const subjectPromises = exam.subjects.map(async (subj) => {
                    try {
                        // subj.path is relative to static, e.g. "data/exams/11회/공법.json"
                        // we need to prepend base if strictly needed, but fetch usually handles relative to root if valid URL
                        // However, static files are served at root or base. 
                        // Let's assume subj.path starts with "data/...".
                        const path = subj.path.startsWith('/') ? subj.path.slice(1) : subj.path;
                        const validUrl = `${base}/${path}`;

                        const res = await fetch(validUrl);
                        if (!res.ok) {
                            console.warn(`[ExamDataService] Failed to load ${validUrl}`);
                            return;
                        }
                        const data = await res.json();
                        subj.data = data;
                    } catch (e) {
                        console.error(`[ExamDataService] Error loading ${subj.path}:`, e);
                    }
                });
                await Promise.all(subjectPromises);
                return exam;
            });

            this.exams = await Promise.all(fetchPromises);
            this.isLoaded = true;
            console.log(`[ExamDataService] Loaded ${this.exams.length} exam rounds.`); // debug
        } catch (e) {
            console.error('[ExamDataService] Initialization failed:', e);
        } finally {
            this.isLoading = false;
        }
    }

    getLoadedExams() {
        return this.exams;
    }

    getAllQuestions(): ExamQuestion[] {
        const all: ExamQuestion[] = [];
        for (const round of this.exams) {
            for (const subj of round.subjects) {
                if (subj.data && subj.data.questions) {
                    subj.data.questions.forEach(q => {
                        // Augment with metadata for easy filtering
                        q.exam_round = round.round;
                        q.exam_year = round.year;
                        q.exam_type = round.type;
                        q.subject_category = subj.category;
                        q.exam_title = round.exam_title; // or subj.data.exam_title
                        all.push(q);
                    });
                }
            }
        }
        return all;
    }

    filterQuestions(criteria: FilterCriteria): ExamQuestion[] {
        let questions = this.getAllQuestions();

        if (criteria.yearRange) {
            const [start, end] = criteria.yearRange;
            questions = questions.filter(q => {
                const y = parseInt(q.exam_year || '0');
                return y >= start && y <= end;
            });
        }

        if (criteria.type && criteria.type !== 'all') {
            questions = questions.filter(q => q.exam_type === criteria.type);
        }

        if (criteria.categories && criteria.categories.length > 0) {
            questions = questions.filter(q => q.subject_category && criteria.categories!.includes(q.subject_category));
        }

        if (criteria.subjects && criteria.subjects.length > 0) {
            questions = questions.filter(q => {
                if (!q.subjects) return false;
                return q.subjects.some(code => criteria.subjects!.includes(code));
            });
        }

        if (criteria.keyword) {
            const k = criteria.keyword.toLowerCase();
            questions = questions.filter(q =>
                q.question.toLowerCase().includes(k) ||
                (q.passage && q.passage.toLowerCase().includes(k))
            );
        }

        return questions;
    }
}

export const examDataService = new ExamDataService();
