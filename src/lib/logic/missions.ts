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

// 10 Stages Configuration
const STAGES = [
    {
        name: "로스쿨 신입생",
        image: "/assets/chars/level1_sprite_3x3.png",
        desc: "법학의 세계에 오신 것을 환영합니다! 🐣"
    },
    {
        name: "민법총칙 마스터", // Lv 11
        image: "/assets/chars/level1_sprite_3x3.png",
        desc: "민법의 기초를 다졌습니다."
    },
    {
        name: "판례 수집가",   // Lv 21
        image: "/assets/chars/level1_sprite_3x3.png",
        desc: "판례가 머릿속에 쌓이고 있어요."
    },
    {
        name: "형법 전문가",     // Lv 31
        image: "/assets/chars/level1_sprite_3x3.png", // Missing asset fallback
        desc: "범죄와 형벌을 꿰뚫어봅니다."
    },
    {
        name: "모의고사 랭커",   // Lv 41
        image: "/assets/chars/level4_sprite_3x3.png", // Using available asset
        desc: "실전 감각이 최고조에 달했습니다!"
    },
    {
        name: "졸업시험 합격자", // Lv 51
        image: "/assets/chars/level4_sprite_3x3.png",
        desc: "이제 변호사시험만 남았습니다."
    },
    {
        name: "변호사시험 응시생", // Lv 61
        image: "/assets/chars/level4_sprite_3x3.png",
        desc: "떨리는 마음으로 시험장에 입장합니다."
    },
    {
        name: "수습 변호사",    // Lv 71
        image: "/assets/chars/level4_sprite_3x3.png",
        desc: "실무의 세계는 냉혹하군요."
    },
    {
        name: "파트너 변호사",  // Lv 81
        image: "/assets/chars/level4_sprite_3x3.png",
        desc: "로펌의 주축이 되었습니다."
    },
    {
        name: "대법관",        // Lv 91~100
        image: "/assets/chars/level4_sprite_3x3.png",
        desc: "법의 정점에 도달하셨습니다. ⚖️"
    }
];

// XP Curve Constant
// XP required for level L = BASE_XP * L * (L - 1)
// Adjust BASE_XP to control difficulty.
// If BASE_XP = 50:
// Lv 2: 50 * 2 * 1 = 100 XP
// Lv 10: 50 * 10 * 9 = 4500 XP
// Lv 100: 50 * 100 * 99 = 495,000 XP
const BASE_XP = 50;

export function getXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return BASE_XP * level * (level - 1);
}

export function getLevelInfo(xp: number): LevelInfo {
    // 1. Calculate Level from XP
    // XP = 50 * L * (L - 1)  =>  XP/50 = L^2 - L  => L^2 - L - (XP/50) = 0
    // L = (1 + sqrt(1 + 4 * (XP/50))) / 2
    let level = Math.floor((1 + Math.sqrt(1 + 4 * (xp / BASE_XP))) / 2);

    // Clamp level
    if (level < 1) level = 1;
    if (level > 100) level = 100;

    // 2. Determine Stage (1-10)
    // Stage 0: 1-10, Stage 1: 11-20, ...
    const stageIndex = Math.floor((level - 1) / 10);
    const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];

    return {
        level,
        title: stage.name,
        xpRequired: getXpForLevel(level),
        characterImage: stage.image,
        description: stage.desc
    };
}

export function getNextLevelInfo(currentLevel: number): LevelInfo | null {
    if (currentLevel >= 100) return null;
    const nextLevel = currentLevel + 1;
    const stageIndex = Math.floor((nextLevel - 1) / 10);
    const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];

    return {
        level: nextLevel,
        title: stage.name, // Usually same title unless crossing stage boundary
        xpRequired: getXpForLevel(nextLevel),
        characterImage: stage.image,
        description: stage.desc
    };
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

// Base XP rewards (will be multiplied by level multiplier)
export const XP_REWARDS = {
    CORRECT_ANSWER: 10,   // Base XP per correct answer
    COMPLETE_QUIZ: 50,    // Base completion bonus
    PERFECT_SCORE: 100,   // Base perfect score bonus
    DAILY_GOAL: 150       // Base daily goal bonus
};

/**
 * Calculate XP reward with quadratic scaling based on current level
 * Formula: baseXP * (1 + level^2 / 500)
 * - Level 1: multiplier = 1.002 (almost no boost)
 * - Level 10: multiplier = 1.2 (20% boost)
 * - Level 50: multiplier = 6 (6x boost)
 * - Level 100: multiplier = 21 (21x boost)
 */
export function getXpReward(baseXp: number, currentLevel: number): number {
    const multiplier = 1 + (currentLevel * currentLevel) / 500;
    return Math.round(baseXp * multiplier);
}

/**
 * Get XP rewards scaled to current level
 */
export function getScaledXpRewards(currentLevel: number) {
    return {
        CORRECT_ANSWER: getXpReward(XP_REWARDS.CORRECT_ANSWER, currentLevel),
        COMPLETE_QUIZ: getXpReward(XP_REWARDS.COMPLETE_QUIZ, currentLevel),
        PERFECT_SCORE: getXpReward(XP_REWARDS.PERFECT_SCORE, currentLevel),
        DAILY_GOAL: getXpReward(XP_REWARDS.DAILY_GOAL, currentLevel)
    };
}
