<script lang="ts">
    import { quizHistory } from "$lib/stores";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { RotateCcw, Home } from "lucide-svelte";
    import type { QuizRecord } from "$lib/types";
    import LevelProgress from "$lib/components/LevelProgress.svelte";
    import ExamReport from "$lib/components/ExamReport.svelte";

    let record: QuizRecord | null = null;
    let isLoading = true;

    // Reactive check for ID loading
    $: {
        const idParam = $page.url.searchParams.get("id");
        if (idParam) {
            const id = parseInt(idParam);
            const found = $quizHistory.find((h) => h.id === id);
            if (found) {
                record = found;
                isLoading = false;
            }
        }
    }

    onMount(() => {
        // Fallback for direct access without ID (Last Session)
        // Or timeout if ID provided but not found
        const timer = setTimeout(() => {
            if (!record) {
                const idParam = $page.url.searchParams.get("id");
                if (!idParam && $quizHistory.length > 0) {
                    record = $quizHistory[$quizHistory.length - 1];
                    isLoading = false;
                } else if (!idParam) {
                    // No ID and no history
                    goto("/");
                } else {
                    // ID provided but not found after timeout
                    isLoading = false; // Will show "Loading Result" ... wait, we need 'Record Not Found' equivalent state or just alert
                    if (!record) {
                        alert("기록을 찾을 수 없습니다.");
                        goto("/");
                    }
                }
            }
        }, 1000);
        return () => clearTimeout(timer);
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
