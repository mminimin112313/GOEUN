<script lang="ts">
    import { page } from "$app/stores";
    import { quizHistory } from "$lib/stores";
    import { goto } from "$app/navigation";
    import { ArrowLeft } from "lucide-svelte";
    import ExamReport from "$lib/components/ExamReport.svelte";
    import type { QuizRecord } from "$lib/types";

    $: id = $page.params.id;
    $: record = $quizHistory.find((r) => r.id === id);

    function handleBack() {
        goto("/history");
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

    {#if record}
        <ExamReport {record} />
    {:else}
        <div class="retro-window p-8 text-center text-gray-500">
            RECORD NOT FOUND
        </div>
    {/if}
</div>
