<script lang="ts">
    import { onMount } from "svelte";
    import {
        examDataService,
        type ExamQuestion,
    } from "$lib/services/examService";

    let loaded = false;
    let questions: ExamQuestion[] = [];
    let filteredQuestions: ExamQuestion[] = [];
    let stats = {
        totalExams: 0,
        totalQuestions: 0,
    };

    let criteria = {
        yearStart: 2012,
        yearEnd: 2024,
        type: "all",
        category: "",
        keyword: "",
    };

    async function init() {
        console.log("Initializing service...");
        await examDataService.init();
        loaded = true;
        refreshExams();
    }

    function refreshExams() {
        const exams = examDataService.getLoadedExams();
        stats.totalExams = exams.length;
        questions = examDataService.getAllQuestions();
        stats.totalQuestions = questions.length;
        applyFilter();
    }

    function applyFilter() {
        filteredQuestions = examDataService.filterQuestions({
            yearRange: [criteria.yearStart, criteria.yearEnd],
            type: criteria.type as any,
            categories: criteria.category ? [criteria.category] : [],
            keyword: criteria.keyword,
        });
    }

    onMount(() => {
        // Auto init on mount for testing
        init();
    });
</script>

<div class="p-8 space-y-4">
    <h1 class="text-2xl font-bold">Exam Data Caching Service Test</h1>

    <div class="p-4 border rounded bg-gray-50">
        <h2 class="text-xl font-semibold mb-2">Status</h2>
        <p>Service Loaded: {loaded ? "✅ Yes" : "❌ No"}</p>
        <p>Total Exams Loaded: {stats.totalExams}</p>
        <p>Total Questions in Memory: {stats.totalQuestions}</p>
        <button
            class="px-4 py-2 bg-blue-500 text-white rounded mt-2"
            on:click={init}
            disabled={loaded}
        >
            Re-Initialize
        </button>
    </div>

    <div class="p-4 border rounded bg-gray-50 space-y-2">
        <h2 class="text-xl font-semibold">Filters</h2>

        <div class="flex gap-4 items-center">
            <label>
                Year Range:
                <input
                    type="number"
                    bind:value={criteria.yearStart}
                    class="border p-1 w-20"
                    on:change={applyFilter}
                />
                ~
                <input
                    type="number"
                    bind:value={criteria.yearEnd}
                    class="border p-1 w-20"
                    on:change={applyFilter}
                />
            </label>

            <label>
                Type:
                <select
                    bind:value={criteria.type}
                    class="border p-1"
                    on:change={applyFilter}
                >
                    <option value="all">All</option>
                    <option value="official">Official (변호사시험)</option>
                    <option value="mock">Mock (모의고사)</option>
                </select>
            </label>

            <label>
                Category:
                <select
                    bind:value={criteria.category}
                    class="border p-1"
                    on:change={applyFilter}
                >
                    <option value="">All</option>
                    <option value="공법">공법</option>
                    <option value="민사법">민사법</option>
                    <option value="형사법">형사법</option>
                </select>
            </label>

            <label>
                Keyword:
                <input
                    type="text"
                    bind:value={criteria.keyword}
                    class="border p-1"
                    placeholder="Search..."
                    on:input={applyFilter}
                />
            </label>
        </div>
    </div>

    <div class="p-4 border rounded">
        <h2 class="text-xl font-semibold mb-2">
            Results: {filteredQuestions.length} Questions
        </h2>

        <div class="h-96 overflow-y-auto border p-2 bg-white font-mono text-sm">
            {#each filteredQuestions.slice(0, 50) as q}
                <div class="border-b py-2 mb-2">
                    <div class="font-bold text-blue-600">
                        [{q.exam_year}
                        {q.exam_round}
                        {q.subject_category}] - {q.exam_type}
                    </div>
                    <div class="mb-1">{q.question}</div>
                    <div class="text-xs text-gray-500">
                        Source: {q.exam_title}
                    </div>
                </div>
            {/each}
            {#if filteredQuestions.length > 50}
                <div class="text-center py-2 text-gray-500">
                    ... and {filteredQuestions.length - 50} more ...
                </div>
            {/if}
        </div>
    </div>
</div>
