<script lang="ts">
    import { quizHistory } from "$lib/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { RotateCcw, Home } from "lucide-svelte";
    import type { QuizRecord } from "$lib/types";
    import LevelProgress from "$lib/components/LevelProgress.svelte";
    import ExamReport from "$lib/components/ExamReport.svelte";

    let record: QuizRecord | null = null;

    onMount(() => {
        if ($quizHistory.length > 0) {
            record = $quizHistory[$quizHistory.length - 1];
        } else {
            goto("/");
        }
    });
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    {#if !record}
        <div class="font-pixel text-center py-20 text-gray-400">
            LOADING RESULT...
        </div>
    {:else}
        <!-- Level Progress (XP Update Check) -->
        <LevelProgress />

        <!-- Report Comp -->
        <ExamReport {record} />

        <!-- Buttons -->
        <div class="flex gap-3">
            <button
                class="flex-1 btn-retro bg-white hover:bg-gray-100 flex items-center justify-center gap-2 text-sm"
                on:click={() => goto("/settings")}
            >
                <RotateCcw size={16} /> RETRY_SESSION
            </button>
            <button
                class="flex-1 btn-retro btn-retro-pink flex items-center justify-center gap-2 text-sm"
                on:click={() => goto("/")}
            >
                <Home size={16} /> RETURN_ROOT
            </button>
        </div>
    {/if}
</div>
