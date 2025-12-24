<script lang="ts">
    import { quizHistory } from "$lib/stores";
    import { goto } from "$app/navigation";
    import {
        History,
        Trophy,
        Clock,
        TrendingUp,
        ChevronRight,
        Trash2,
        Calendar,
        BarChart2,
    } from "lucide-svelte";
    import type { QuizRecord } from "$lib/types";
    import { CATEGORY_MAP } from "$lib/config";

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    function formatDate(dateStr: string, timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleDateString("ko-KR", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function deleteRecord(record: QuizRecord) {
        if (confirm("DELETE THIS RECORD?")) {
            $quizHistory = $quizHistory.filter((r) => r.id !== record.id);
        }
    }

    function clearAllHistory() {
        if (confirm("WARNING: DELETE ALL HISTORY?")) {
            $quizHistory = [];
        }
    }

    // Sort by timestamp descending
    $: sortedHistory = [...$quizHistory].sort(
        (a, b) => b.timestamp - a.timestamp,
    );

    // Stats
    $: totalQuizzes = $quizHistory.length;
    $: totalQuestions = $quizHistory.reduce((sum, h) => sum + h.total, 0);
    $: avgScore =
        totalQuizzes > 0
            ? Math.round(
                  $quizHistory.reduce(
                      (sum, h) => sum + (h.score / h.total) * 100,
                      0,
                  ) / totalQuizzes,
              )
            : 0;

    // Category Stats for Chart
    $: categoryStats = Object.keys(CATEGORY_MAP).map((cat) => {
        const catHistory = $quizHistory.filter((h) => h.category === cat);
        const count = catHistory.length;
        const totalScore = catHistory.reduce(
            (sum, h) => sum + (h.score / h.total) * 100,
            0,
        );
        const avg = count > 0 ? Math.round(totalScore / count) : 0;
        return { cat, avg, count };
    });
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Header -->
    <header class="retro-window bg-[#E0F7FA]">
        <div class="retro-header !bg-[#26C6DA]">
            <span>📊 HISTORY.dat</span>
        </div>
        <div class="p-4 text-center">
            <h1 class="text-2xl font-pixel text-[#00ACC1] animate-bounce-pixel">
                MY STATS
            </h1>
            <p class="text-xs font-bold text-gray-500 mt-1">
                Check your progress
            </p>
        </div>
    </header>

    <!-- Stats Summary -->
    <div class="grid grid-cols-3 gap-2">
        <div class="retro-window p-2 text-center bg-white">
            <div class="text-xl font-pixel text-[#FF66CC]">{totalQuizzes}</div>
            <div class="text-[10px] font-bold">TOTAL</div>
        </div>
        <div class="retro-window p-2 text-center bg-white">
            <div class="text-xl font-pixel text-[#66CCFF]">{avgScore}%</div>
            <div class="text-[10px] font-bold">AVG</div>
        </div>
        <div class="retro-window p-2 text-center bg-white">
            <div class="text-xl font-pixel text-[#99FF99]">
                {totalQuestions}
            </div>
            <div class="text-[10px] font-bold">SOLVED</div>
        </div>
    </div>

    <!-- Chart (CSS Bar Chart) -->
    <section class="retro-window">
        <div class="retro-header !bg-[#FFFF99] !text-black !border-b-2">
            <div class="flex items-center gap-2">
                <BarChart2 size={16} />
                <span>PERFORMANCE BY SUBJECT</span>
            </div>
        </div>
        <div class="p-4 bg-white space-y-3">
            {#each categoryStats as stat}
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-bold">
                        <span>{stat.cat} ({stat.count})</span>
                        <span>{stat.avg}%</span>
                    </div>
                    <div
                        class="w-full h-4 bg-gray-100 border border-black relative"
                    >
                        <div
                            class="h-full bg-[#66CCFF] border-r border-black transition-all duration-1000"
                            style="width: {stat.avg}%"
                        ></div>
                        <!-- Grid lines -->
                        <div class="absolute inset-0 flex">
                            <div
                                class="flex-1 border-r border-gray-300 border-dashed"
                            ></div>
                            <div
                                class="flex-1 border-r border-gray-300 border-dashed"
                            ></div>
                            <div
                                class="flex-1 border-r border-gray-300 border-dashed"
                            ></div>
                            <div class="flex-1"></div>
                        </div>
                    </div>
                </div>
            {/each}
            {#if totalQuizzes === 0}
                <div class="text-center text-xs text-gray-400 py-2">
                    No data available
                </div>
            {/if}
        </div>
    </section>

    <!-- History List -->
    <section class="space-y-3">
        <div class="flex items-center justify-between px-1">
            <h2 class="font-pixel text-sm flex items-center gap-2">
                <Calendar size={16} class="text-[#FF66CC]" />
                RECENT LOGS
            </h2>
            {#if $quizHistory.length > 0}
                <button
                    class="text-[10px] bg-black text-white px-2 py-0.5 font-bold hover:bg-red-500 transition-colors"
                    on:click={clearAllHistory}
                >
                    CLEAR ALL
                </button>
            {/if}
        </div>

        {#if sortedHistory.length === 0}
            <div class="retro-window p-8 text-center bg-gray-50">
                <div class="text-3xl mb-2">💾</div>
                <p class="text-xs font-bold text-gray-400">EMPTY LOG</p>
                <button
                    class="btn-retro btn-retro-pink mt-4 text-xs"
                    on:click={() => goto("/settings")}
                >
                    Solve First Quiz
                </button>
            </div>
        {:else}
            <div class="space-y-2">
                {#each sortedHistory as record}
                    {@const percentage = Math.round(
                        (record.score / record.total) * 100,
                    )}

                    <div
                        class="retro-window p-0 flex text-left group hover:translate-x-1 transition-transform cursor-pointer"
                        on:click={() => goto(`/history/${record.id}`)}
                    >
                        <!-- Score Box -->
                        <div
                            class="w-16 border-r-2 border-black flex items-center justify-center bg-[#FFF0F5] group-hover:bg-[#FF66CC] transition-colors"
                        >
                            <div class="text-center">
                                <div
                                    class="font-pixel text-lg font-bold group-hover:text-white transition-colors"
                                >
                                    {percentage}
                                </div>
                                <div
                                    class="text-[8px] font-bold text-gray-500 group-hover:text-white"
                                >
                                    PTS
                                </div>
                            </div>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 p-3 min-w-0">
                            <div class="font-bold text-sm text-black truncate">
                                {record.category}
                                {record.round}
                            </div>
                            <div
                                class="text-[10px] text-gray-500 font-bold mt-1 flex gap-2"
                            >
                                <span
                                    >{record.score}/{record.total} Correct</span
                                >
                                <span>•</span>
                                <span>{formatTime(record.timeTaken)}</span>
                            </div>
                            <div
                                class="text-[10px] text-gray-400 font-mono mt-1"
                            >
                                {formatDate(record.date, record.timestamp)}
                            </div>
                        </div>

                        <!-- Delete -->
                        <button
                            class="w-10 flex items-center justify-center hover:bg-red-100 transition-colors border-l-2 border-black/10"
                            on:click|stopPropagation={() =>
                                deleteRecord(record)}
                        >
                            <Trash2 size={16} class="text-red-400" />
                        </button>
                    </div>
                {/each}
            </div>
        {/if}
    </section>
</div>
