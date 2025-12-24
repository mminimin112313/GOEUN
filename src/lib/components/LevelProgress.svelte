<script lang="ts">
    import { isMissionBoardOpen } from "$lib/stores/ui";
    import { missionStore } from "$lib/stores";
    import { getLevelInfo, getNextLevelInfo } from "$lib/logic/missions";
    import { Sparkles, Zap } from "lucide-svelte";

    $: currentXp = $missionStore.totalXp;
    $: currentLevelInfo = getLevelInfo(currentXp);
    $: nextLevelInfo = getNextLevelInfo(currentLevelInfo.level);

    // XP Calculation
    $: levelStartXp = currentLevelInfo.xpRequired;
    $: nextLevelXp = nextLevelInfo
        ? nextLevelInfo.xpRequired
        : currentLevelInfo.xpRequired * 1.5; // Cap if max level
    $: progressPercent = Math.min(
        100,
        Math.max(
            0,
            ((currentXp - levelStartXp) / (nextLevelXp - levelStartXp)) * 100,
        ),
    );
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="retro-window p-4 flex gap-4 items-center mb-6 bg-white cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
    on:click={() => ($isMissionBoardOpen = true)}
>
    <!-- Character Avatar (Sprite Animation) -->
    <div class="flex-shrink-0 relative group">
        <div
            class="w-24 h-24 bg-[#FFF0F5] border-2 border-black overflow-hidden relative"
        >
            <div
                class="animate-sprite-grid"
                style="background-image: url('{currentLevelInfo.characterImage}');"
            ></div>
        </div>
        <div
            class="absolute -bottom-2 -right-2 bg-[#FFFF99] border border-black px-2 py-0.5 text-xs font-bold pixel-tag animate-pulse"
        >
            Lv.{currentLevelInfo.level}
        </div>
    </div>

    <!-- Stats & Progress -->
    <div class="flex-1 min-w-0 space-y-2">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <h3
                    class="text-xl font-bold font-pixel text-[#FF66CC] drop-shadow-sm"
                >
                    {currentLevelInfo.title}
                </h3>
                <Sparkles size={16} class="text-[#66CCFF] animate-spin-slow" />
            </div>
            <p class="text-xs text-gray-500 font-bold truncate">
                "{currentLevelInfo.description}"
            </p>
        </div>

        <!-- XP Bar -->
        <div class="relative w-full h-6 bg-white border-2 border-black p-0.5">
            <div
                class="h-full bg-gradient-to-r from-[#FF66CC] to-[#66CCFF] transition-all duration-500"
                style="width: {progressPercent}%"
            ></div>
            <div
                class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black mix-blend-plus-lighter z-10"
            >
                {currentXp} / {nextLevelXp} XP
            </div>
        </div>

        <div class="flex justify-between text-[10px] text-gray-500 font-bold">
            <span
                >Next: {nextLevelInfo ? nextLevelInfo.title : "MAX LEVEL"}</span
            >
            <span>{Math.floor(nextLevelXp - currentXp)} XP needed</span>
        </div>
    </div>
</div>
