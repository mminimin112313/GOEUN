<script lang="ts">
    import { gamification } from "$lib/stores";
    import { onMount } from "svelte";
    import { Trophy, X } from "lucide-svelte";
    import { fly } from "svelte/transition";
    import type { Mission } from "$lib/stores/gamification";

    // Subscribe to store to find completed but unclaimed missions that we haven't shown yet?

    $: unclaimed = [
        ...$gamification.missions.daily.map((m) => ({
            ...m,
            category: "daily" as const,
        })),
        ...$gamification.missions.weekly.map((m) => ({
            ...m,
            category: "weekly" as const,
        })),
        ...$gamification.missions.tutorial.map((m) => ({
            ...m,
            category: "tutorial" as const,
        })),
    ].filter((m) => m.isCompleted && !m.claimed);

    function claim(m: any) {
        gamification.claimMission(m.id, m.category);
    }
</script>

{#if unclaimed.length > 0}
    <div
        class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
        {#each unclaimed.slice(0, 1) as m (m.id)}
            <div
                transition:fly={{ y: -20, duration: 500 }}
                class="pointer-events-auto bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 rounded-lg flex items-center gap-4 w-80"
            >
                <div
                    class="bg-yellow-100 p-2 rounded-full border-2 border-black"
                >
                    <Trophy size={24} class="text-yellow-600" />
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-sm font-pixel text-blue-600">
                        MISSION COMPLETE!
                    </h4>
                    <p class="text-xs font-bold mt-1">{m.desc}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">
                        Reward: +{m.rewardXp} XP
                    </p>
                </div>
                <button
                    on:click={() => claim(m)}
                    class="bg-[#FF66CC] hover:bg-[#FF3399] text-white text-xs font-bold px-3 py-1.5 rounded border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                >
                    GET
                </button>
            </div>
        {/each}

        {#if unclaimed.length > 1}
            <div
                class="text-right text-[10px] font-bold text-white drop-shadow-md pr-2"
            >
                + {unclaimed.length - 1} more missions pending...
            </div>
        {/if}
    </div>
{/if}
