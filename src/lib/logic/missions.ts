/**
 * 게이미피케이션 로직 - 레벨 시스템 및 미션
 */

import type { MissionState } from '../types';

// XP Table & Levels
export interface LevelInfo {
    level: number;
    title: string;
    xpRequired: number; // Cumulative XP needed to reach this level
    characterImage: string;
    description: string;
}

// 8 Stages: 로1-1 ~ 변호사
export const LEVELS: LevelInfo[] = [
    {
        level: 1,
        title: '로스쿨 1-1',
        xpRequired: 0,
        characterImage: '/assets/chars/level1_sprite_3x3.png',
        description: '법학의 세계에 오신 것을 환영합니다! 🐣'
    },
    {
        level: 2,
        title: '로스쿨 1-2',
        xpRequired: 100,
        characterImage: '/assets/chars/level1_sprite_3x3.png',
        description: '민법총칙이 조금씩 이해되기 시작했어요.'
    },
    {
        level: 3,
        title: '로스쿨 2-1',
        xpRequired: 300,
        characterImage: '/assets/chars/level2_sprite_3x3.png',
        description: '판례 암기의 늪에 빠지셨군요... 🔥'
    },
    {
        level: 4,
        title: '로스쿨 2-2',
        xpRequired: 600,
        characterImage: '/assets/chars/level2_sprite_3x3.png',
        description: '형사소송법이 눈에 들어오기 시작합니다.'
    },
    {
        level: 5,
        title: '로스쿨 3-1',
        xpRequired: 1000,
        characterImage: '/assets/chars/level2_sprite_3x3.png',
        description: '이제 실전입니다. 기록형 모의고사를 준비하세요!'
    },
    {
        level: 6,
        title: '로스쿨 3-2',
        xpRequired: 1500,
        characterImage: '/assets/chars/level2_sprite_3x3.png',
        description: '졸업시험 통과! 변호사시험이 코앞입니다.'
    },
    {
        level: 7,
        title: '시험임박',
        xpRequired: 2200,
        characterImage: '/assets/chars/level3_sprite_3x3.png',
        description: '🔥 불타오르는 합격의 의지! 마지막 스퍼트!'
    },
    {
        level: 8,
        title: '변호사',
        xpRequired: 3000,
        characterImage: '/assets/chars/level4_sprite_3x3.png',
        description: '축하합니다! 정의의 수호자가 되셨습니다. ⚖️'
    }
];

export function getLevelInfo(xp: number): LevelInfo {
    // Find the highest level where xp >= required
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpRequired) {
            return LEVELS[i];
        }
    }
    return LEVELS[0];
}

export function getNextLevelInfo(currentLevel: number): LevelInfo | null {
    if (currentLevel >= LEVELS.length) return null;
    return LEVELS[currentLevel]; // indexing works because level is 1-based, array is 0-based
}

export function getInitialMissionState(): MissionState {
    return {
        lastActiveDate: new Date().toISOString(),
        currentStreak: 0,
        maxStreak: 0,
        dailyProgress: 0,
        dailyTarget: 30, // 30 questions per day
        totalXp: 0
    };
}

// XP rewards
export const XP_REWARDS = {
    CORRECT_ANSWER: 10,
    COMPLETE_QUIZ: 50,
    PERFECT_SCORE: 100,
    DAILY_GOAL: 200
};
