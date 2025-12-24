import { base } from '$app/paths';

/**
 * 변호사시험 Quiz App 설정
 * - SQLite 제거, JSON 직접 로드 방식
 */
export const CONFIG = {
    EXAMS_PATH: `${base}/data/exams`,
    TAXONOMY_PATH: `${base}/data/taxonomy`
};

/**
 * 3대 카테고리 → 7법 매핑
 */
export const CATEGORY_MAP: Record<string, { name: string; subjects: string[] }> = {
    '공법': {
        name: '공법',
        subjects: ['헌법', '행정법']
    },
    '민사법': {
        name: '민사법',
        subjects: ['민법', '민사소송법', '상법']
    },
    '형사법': {
        name: '형사법',
        subjects: ['형법', '형사소송법']
    }
};

/**
 * 과목 코드 prefix 매핑
 */
export const SUBJECT_CODE_MAP: Record<string, string> = {
    '민법': 'CIV',
    '민사소송법': 'CPL',
    '상법': 'COM',
    '형법': 'CRI',
    '형사소송법': 'CRL',
    '헌법': 'CON',
    '행정법': 'ADM'
};

/**
 * 사용 가능한 회차 목록 (1~14회 + 모의고사 확장 예정)
 */
export const EXAM_YEARS = Array.from({ length: 14 }, (_, i) => 2012 + i);

export const EXAM_TYPES = [
    { id: 'official', label: '변호사시험', suffix: '' },
    { id: '6mo', label: '6월 모의', suffix: '_6mo' },
    { id: '8mo', label: '8월 모의', suffix: '_8mo' },
    { id: '10mo', label: '10월 모의', suffix: '_10mo' }
];

export function getRoundName(year: number, typeId: string): string {
    const round = year - 2011;
    const type = EXAM_TYPES.find(t => t.id === typeId);
    return `${round}회${type?.suffix || ''}`;
}

export const EXAM_ROUNDS = EXAM_YEARS.map(y => getRoundName(y, 'official')); // Compatibility
export const AVAILABLE_ROUNDS = EXAM_YEARS.flatMap(y => EXAM_TYPES.map(t => getRoundName(y, t.id)));

export const ROUND_LABELS: Record<string, string> = {
    ...Object.fromEntries(EXAM_YEARS.map(y => {
        const r = y - 2011;
        return [
            [`${r}회`, `제${r}회 변호사시험 (${y})`],
            [`${r}회_6mo`, `${y}년 6월 모의고사`],
            [`${r}회_8mo`, `${y}년 8월 모의고사`],
            [`${r}회_10mo`, `${y}년 10월 모의고사`]
        ];
    }).flat())
};

/**
 * 카테고리별 파일명
 */
export const CATEGORY_FILES: Record<string, string> = {
    '공법': '공법.json',
    '민사법': '민사법.json',
    '형사법': '형사법.json'
};
