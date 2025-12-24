<script lang="ts">
    import { missionStore } from "$lib/stores";
    import {
        getLevelInfo,
        getNextLevelInfo,
        getXpForLevel,
    } from "$lib/logic/missions";
    import { Flame, Star, Trophy, Target } from "lucide-svelte";

    // Reactive Level Info
    $: levelInfo = getLevelInfo($missionStore.totalXp);
    $: nextLevelInfo = getNextLevelInfo(levelInfo.level);
    $: nextXpRequired = nextLevelInfo
        ? nextLevelInfo.xpRequired
        : getXpForLevel(101); // Max level fallback
    $: xpToNext = Math.max(0, nextXpRequired - $missionStore.totalXp);
    $: progressPercent = Math.min(
        100,
        ($missionStore.dailyProgress / $missionStore.dailyTarget) * 100,
    );
</script>

<div
    class="glass-card rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500"
>
    <!-- Background Gradient Animation -->
    <div
        class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
    ></div>

    <div
        class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6"
    >
        <!-- Left: Level & Profile -->
        <div class="flex items-center gap-4">
            <div class="relative">
                <div
                    class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg transform group-hover:rotate-6 transition-transform"
                >
                    <Trophy size={28} />
                </div>
                <div
                    class="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm"
                >
                    LV.{levelInfo.level}
                </div>
            </div>
            <div>
                <h3
                    class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5"
                >
                    Current Rank
                </h3>
                <div
                    class="text-xl font-black text-slate-800 flex items-center gap-2"
                >
                    {levelInfo.title}
                    <span
                        class="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full"
                    >
                        {xpToNext} XP to next
                    </span>
                </div>
            </div>
        </div>

        <!-- Center: Daily Mission -->
        <div class="flex-1 w-full md:w-auto">
            <div class="flex justify-between items-end mb-2">
                <div
                    class="flex items-center gap-2 text-sm font-bold text-slate-600"
                >
                    <Target size={16} class="text-rose-500" />
                    Daily Goal
                </div>
                <div class="text-xs font-black text-slate-400">
                    <span class="text-indigo-600 text-lg"
                        >{$missionStore.dailyProgress}</span
                    >
                    / {$missionStore.dailyTarget}
                </div>
            </div>

            <div
                class="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative"
            >
                <!-- Progress Bar -->
                <div
                    class="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style="width: {progressPercent}%"
                >
                    <div
                        class="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"
                    ></div>
                </div>
            </div>
        </div>

        <!-- Right: Streak -->
        <div class="flex items-center gap-3 pl-4 md:border-l border-slate-100">
            <div class="text-right">
                <div class="text-[10px] font-black text-slate-400 uppercase">
                    Streak
                </div>
                <div class="text-2xl font-black text-slate-800">
                    {$missionStore.currentStreak}<span
                        class="text-sm text-slate-400 font-bold">days</span
                    >
                </div>
            </div>
            <div
                class="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 animate-[pulse_3s_infinite]"
            >
                <Flame
                    size={24}
                    fill="currentColor"
                    class={$missionStore.currentStreak > 0
                        ? "text-orange-500"
                        : "text-slate-300"}
                />
            </div>
        </div>
    </div>
</div>

<style>
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
</style>
