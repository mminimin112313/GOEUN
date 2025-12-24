import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// --- Types ---
export interface UserProfile {
    level: number;
    xp: number;
    maxXp: number;
    rankTitle: string;
    rankId: number; // 1-6
    streak: number;
    lastStudyDate: string; // ISO Date String
    coins: number;
    mood: 'happy' | 'sleepy' | 'panicked';
}

export interface Mission {
    id: string;
    type: 'quiz_count' | 'quiz_score' | 'review_count' | 'streak' | 'memo_use' | 'nav_review';
    desc: string;
    target: number;
    current: number;
    rewardXp: number;
    isCompleted: boolean;
    claimed: boolean;
}

// --- Constants ---
const RANKS = [
    { id: 1, title: '공공 새싹', minLevel: 1 },
    { id: 2, title: '공공 학습자', minLevel: 6 },
    { id: 3, title: '공공 수험생', minLevel: 16 },
    { id: 4, title: '공공 합격생', minLevel: 31 },
    { id: 5, title: '공공 공무원', minLevel: 51 },
    { id: 6, title: '공공 마스터', minLevel: 71 }
];

const INITIAL_PROFILE: UserProfile = {
    level: 1,
    xp: 0,
    maxXp: 100,
    rankTitle: '공공 새싹',
    rankId: 1,
    streak: 0,
    lastStudyDate: '',
    coins: 0,
    mood: 'happy'
};

// --- Store Setup ---
interface MissionStore {
    daily: Mission[];
    weekly: Mission[];
    tutorial: Mission[];
}

interface GamificationState {
    profile: UserProfile;
    missions: MissionStore;
}

function createGamificationStore() {
    const { subscribe, set, update } = writable<GamificationState>({
        profile: INITIAL_PROFILE,
        missions: { daily: [], weekly: [], tutorial: [] }
    });

    // --- Mission Logic ---
    const MISSION_POOL_DAILY: Partial<Mission>[] = [
        { type: 'quiz_count', target: 10, rewardXp: 50, desc: '가벼운 몸풀기: 10문제' },
        { type: 'quiz_count', target: 30, rewardXp: 150, desc: '집중 학습: 30문제 돌파' },
        { type: 'quiz_score', target: 1, rewardXp: 100, desc: '실전 감각: 80점 이상 1회 달성' },
        { type: 'review_count', target: 5, rewardXp: 80, desc: '기억 되살리기: 오답 5개 복습' },
        { type: 'review_count', target: 20, rewardXp: 200, desc: '오답 청소부: 20개 정리하기' }
    ];

    const MISSION_POOL_WEEKLY: Partial<Mission>[] = [
        { type: 'quiz_count', target: 100, rewardXp: 500, desc: '주간 챌린지: 100문제 정복' },
        { type: 'quiz_count', target: 300, rewardXp: 1500, desc: '마라톤: 일주일 300문제' },
        { type: 'review_count', target: 50, rewardXp: 800, desc: '완벽주의자: 주간 오답 50개 삭제' },
        { type: 'streak', target: 5, rewardXp: 1000, desc: '끈기왕: 주 5일 출석체크' }
    ];

    function generateMissions(pool: Partial<Mission>[], count: number, prefix: string): Mission[] {
        const shuffled = pool.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map((m, i) => ({
            id: `${prefix}_${Date.now()}_${i}`,
            type: m.type!,
            desc: m.desc!,
            target: m.target!,
            current: 0,
            rewardXp: m.rewardXp!,
            isCompleted: false,
            claimed: false
        }));
    }

    function checkResets(state: { profile: UserProfile, missions: { daily: Mission[], weekly: Mission[] } }) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 1. Daily Reset (If empty or old/stored date differs - simple check: empty or manual reset flag if we had one)
        // Ideally we store 'lastDailyGenDate'. For now, let's stick to "If empty, gen". 
        // Real-world: Check date.

        let newDaily = state.missions.daily;
        if (state.missions.daily.length === 0) {
            newDaily = generateMissions(MISSION_POOL_DAILY, 3, 'd');
        }

        // 2. Weekly Reset (If empty or Monday)
        let newWeekly = state.missions.weekly;
        if (state.missions.weekly.length === 0) {
            newWeekly = generateMissions(MISSION_POOL_WEEKLY, 2, 'w');
        }

        if (newDaily !== state.missions.daily || newWeekly !== state.missions.weekly) {
            update(s => {
                const ns = { ...s, missions: { ...s.missions, daily: newDaily, weekly: newWeekly } };
                save(ns);
                return ns;
            });
        }
    }

    // Persistence
    if (browser) {
        const saved = localStorage.getItem('gamification');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migrate old structure if needed
                if (Array.isArray(parsed.missions)) {
                    parsed.missions = { daily: parsed.missions, weekly: [], tutorial: [] };
                }
                // Migration V2: Ensure 'tutorial' exists
                if (!parsed.missions.tutorial) {
                    parsed.missions.tutorial = [];
                }

                // Ensure badges exist for old profiles
                if (!parsed.profile.badges) {
                    parsed.profile.badges = [];
                }

                // Force Rank Title Update (Migration)
                // Always recalculate title based on level to apply theme changes
                const correctRank = RANKS.slice().reverse().find(r => parsed.profile.level >= r.minLevel) || RANKS[0];
                if (parsed.profile.rankTitle !== correctRank.title) {
                    parsed.profile.rankTitle = correctRank.title;
                    parsed.profile.rankId = correctRank.id; // Also ensure ID is correct
                }

                set(parsed);
                checkResets(parsed);
            } catch (e) { console.error('Failed to load gamification', e); }
        } else {
            const d = generateMissions(MISSION_POOL_DAILY, 3, 'd');
            const w = generateMissions(MISSION_POOL_WEEKLY, 2, 'w');
            // Initial Tutorial Missions
            const t: Mission[] = [
                { id: 'tut_quiz', type: 'quiz_count', desc: '첫 걸음: 문제 1개 풀기', target: 1, current: 0, rewardXp: 100, isCompleted: false, claimed: false },
                { id: 'tut_memo', type: 'memo_use', desc: '낙서왕: 문제 풀이 중 펜(메모) 써보기', target: 1, current: 0, rewardXp: 50, isCompleted: false, claimed: false },
                { id: 'tut_nav', type: 'nav_review', desc: '탐험가: 오답 노트 메뉴 구경하기', target: 1, current: 0, rewardXp: 50, isCompleted: false, claimed: false }
            ];

            const init = {
                profile: { ...INITIAL_PROFILE, badges: [] },
                missions: { daily: d, weekly: w, tutorial: t }
            };
            set(init);
            save(init);
        }
    }

    return {
        subscribe,

        // --- Actions ---
        addXp: (amount: number) => update(state => {
            let { xp, maxXp, level } = state.profile;
            xp += amount;

            while (xp >= maxXp) {
                xp -= maxXp;
                level++;
                maxXp = Math.floor(maxXp * 1.2);
            }

            const newRank = RANKS.slice().reverse().find(r => level >= r.minLevel) || RANKS[0];

            const newProfile = {
                ...state.profile,
                level, xp, maxXp,
                rankTitle: newRank.title,
                rankId: newRank.id
            };

            save({ ...state, profile: newProfile });
            return { ...state, profile: newProfile };
        }),

        updateMissionProgress: (type: Mission['type'], amount: number = 1) => update(state => {
            // Update BOTH daily and weekly
            const updateList = (list: Mission[]) => list.map(m => {
                if (m.type === type && !m.isCompleted) {
                    const newVal = Math.min(m.current + amount, m.target);
                    return { ...m, current: newVal, isCompleted: newVal >= m.target };
                }
                return m;
            });

            const newDaily = updateList(state.missions.daily);
            const newWeekly = updateList(state.missions.weekly);
            const newTutorial = updateList(state.missions.tutorial);

            const newState = { ...state, missions: { daily: newDaily, weekly: newWeekly, tutorial: newTutorial } };
            save(newState);
            return newState;
        }),

        claimMission: (id: string, category: 'daily' | 'weekly' | 'tutorial') => update(state => {
            const list = state.missions[category];
            const mission = list.find(m => m.id === id);
            if (!mission || !mission.isCompleted || mission.claimed) return state;

            let { xp, maxXp, level } = state.profile;
            xp += mission.rewardXp;
            while (xp >= maxXp) { xp -= maxXp; level++; maxXp = Math.floor(maxXp * 1.2); }
            const newRank = RANKS.slice().reverse().find(r => level >= r.minLevel) || RANKS[0];

            const newList = list.map(m => m.id === id ? { ...m, claimed: true } : m);

            const newState = {
                profile: { ...state.profile, level, xp, maxXp, rankTitle: newRank.title, rankId: newRank.id },
                missions: { ...state.missions, [category]: newList }
            };
            save(newState);
            return newState;
        }),

        // ... (checkStreak remains same)
        checkStreak: () => update(state => {
            const today = new Date().toISOString().split('T')[0];
            const last = state.profile.lastStudyDate ? state.profile.lastStudyDate.split('T')[0] : '';
            if (today === last) return state;
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            let newStreak = state.profile.streak;
            if (last === yesterday) newStreak++;
            else newStreak = 1;
            const newState = { ...state, profile: { ...state.profile, streak: newStreak, lastStudyDate: new Date().toISOString() } };
            save(newState);
            return newState;
        })
    };
}

// --- Helpers ---
function save(state: any) {
    if (browser) localStorage.setItem('gamification', JSON.stringify(state));
}

export const gamification = createGamificationStore();
