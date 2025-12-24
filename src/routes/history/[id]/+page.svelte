<script lang="ts">
    import { page } from "$app/stores";
    import { quizHistory } from "$lib/stores";
    import { goto } from "$app/navigation";
    import { ArrowLeft } from "lucide-svelte";
    import ExamReport from "$lib/components/ExamReport.svelte";
    import type { QuizRecord } from "$lib/types";
    import { onMount } from "svelte";

    let id: number;
    let record: QuizRecord | undefined;
    let isLoading = true;

    $: {
        if ($page.params.id) {
            id = parseInt($page.params.id);
            // Wait for history to populate if empty initially (though store sync might be active)
            // But we don't have a direct "sync complete" flag easily exposed on the store itself without checking internal state.
            // However, we can just reactively update 'record'.
            record = $quizHistory.find((r) => r.id === id);
        }
    }

    // specific timeout to stop showing loading if data never comes
    onMount(() => {
        const timer = setTimeout(() => {
            isLoading = false;
        }, 1000); // 1 sec timeout for initial load check
        return () => clearTimeout(timer);
    });

    // If we have record, we are done loading
    $: if (record) isLoading = false;

    function handleBack() {
        goto("/"); // Changed to home as history list is in dashboard now via 'Recent Logs'
    }
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Header -->
    <header class="retro-window bg-[#E0F7FA]">
        <div class="retro-header !bg-[#26C6DA]">
            <button
                class="hover:bg-black/20 p-1 rounded transition-colors"
                on:click={handleBack}
            >
                <ArrowLeft size={16} />
            </button>
            <span>LOG_VIEWER.exe</span>
        </div>
        <div class="p-4 text-center">
            <h1 class="text-xl font-pixel text-[#00ACC1]">REVIEW MODE</h1>
        </div>
    </header>

    {#if isLoading}
        <div class="retro-window p-8 text-center bg-white">
            <div class="text-2xl animate-spin mb-2">⏳</div>
            <div class="font-bold text-gray-400">LOADING DATA...</div>
        </div>
    {:else if record}
        <ExamReport {record} />
    {:else}
        <div class="retro-window p-8 text-center text-gray-500">
            RECORD NOT FOUND
        </div>
    {/if}
</div>
