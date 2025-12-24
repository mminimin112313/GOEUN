<script lang="ts">
    import { quizHistory } from "$lib/stores";
    import { CATEGORY_MAP } from "$lib/config";
    import { BarChart3, Trophy, Target, TrendingUp } from "lucide-svelte";

    let selectedCategory = Object.keys(CATEGORY_MAP)[0]; // Default: First category

    // Reactive Stats
    $: categoryHistory = $quizHistory.filter(
        (h) => h.category === selectedCategory,
    );
    $: totalExams = categoryHistory.length;
    $: totalSolved = categoryHistory.reduce((sum, h) => sum + h.total, 0);

    // Average Score
    $: avgScore =
        totalExams > 0
            ? Math.round(
                  categoryHistory.reduce(
                      (sum, h) => sum + (h.score / h.total) * 100,
                      0,
                  ) / totalExams,
              )
            : 0;

    // Recent 10 Sessions for Chart
    $: recentSessions = categoryHistory
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-10); // Last 10

    // Helper to get bar height (max 100%)
    const getHeight = (score: number, total: number) =>
        Math.min(100, Math.round((score / total) * 100));
</script>

<div class="retro-window w-full bg-white">
    <!-- Header -->
    <div class="retro-header !bg-[#000] !text-[#00FF00]">
        <div class="flex items-center gap-2">
            <BarChart3 size={16} />
            <span>BATTLE_STATS_MONITOR.exe</span>
        </div>
        <div class="flex gap-1">
            <div class="retro-btn-control">_</div>
            <div class="retro-btn-control">X</div>
        </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b-2 border-black bg-gray-100">
        {#each Object.keys(CATEGORY_MAP) as cat}
            <button
                class="flex-1 py-2 text-xs font-bold transition-colors border-r-2 border-black last:border-r-0
                       {selectedCategory === cat
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:bg-gray-200'}"
                on:click={() => (selectedCategory = cat)}
            >
                {cat}
            </button>
        {/each}
    </div>

    <div class="p-4 space-y-4">
        <!-- Key Metrics -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    ACCURACY
                </div>
                <div class="text-xl font-pixel text-[#FF66CC]">{avgScore}%</div>
            </div>
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    SOLVED
                </div>
                <div class="text-xl font-pixel text-[#66CCFF]">
                    {totalSolved}
                </div>
            </div>
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    SESSIONS
                </div>
                <div class="text-xl font-pixel text-[#99FF99]">
                    {totalExams}
                </div>
            </div>
        </div>

        <!-- Pixel Chart -->
        <div
            class="relative h-32 border-2 border-black border-dashed bg-[#111] p-2 flex items-end gap-1 overflow-hidden"
        >
            <!-- Grid Lines -->
            <div
                class="absolute inset-0 pointer-events-none"
                style="background-image: linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px); background-size: 10px 10px; opacity: 0.5;"
            ></div>

            {#if recentSessions.length === 0}
                <div
                    class="absolute inset-0 flex items-center justify-center text-[#00FF00] font-mono text-xs animate-pulse"
                >
                    NO_DATA_DETECTED...
                </div>
            {:else}
                {#each recentSessions as session}
                    <div
                        class="flex-1 flex flex-col justify-end h-full group relative"
                    >
                        <!-- Tooltip -->
                        <div
                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white border border-black p-1 text-[10px] font-bold whitespace-nowrap z-10 w-max shadow-sm"
                        >
                            {((session.score / session.total) * 100).toFixed(
                                0,
                            )}% ({new Date(
                                session.timestamp,
                            ).toLocaleDateString()})
                        </div>

                        <!-- Bar -->
                        <div
                            class="w-full bg-[#00FF00] hover:bg-[#CCFF00] transition-all relative border-t-2 border-white"
                            style="height: {getHeight(
                                session.score,
                                session.total,
                            )}%"
                        >
                            <!-- Scanline effect on hover -->
                            <div
                                class="absolute inset-0 bg-black/10 group-hover:hidden"
                            ></div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="text-[9px] font-mono text-gray-400 text-right">
            * Displaying last {recentSessions.length} training sessions
        </div>
    </div>
</div>
