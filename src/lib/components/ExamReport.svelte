<script lang="ts">
    import { isCorrectAnswer } from "$lib/logic/quizEngine";
    import { getCodePath } from "$lib/db";
    import { onMount } from "svelte";
    import { Trophy, ChevronDown, ChevronUp } from "lucide-svelte";
    import { quizHistory, questionMemos } from "$lib/stores";
    import type { QuizRecord } from "$lib/types";

    export let record: QuizRecord;

    let expandedQuestions: Set<number> = new Set();
    let subjectPaths: Record<string, string> = {};

    onMount(() => {
        loadSubjectPaths();
    });

    async function loadSubjectPaths() {
        for (const q of record.questions) {
            for (const code of q.subjects) {
                if (!subjectPaths[code]) {
                    subjectPaths[code] = await getCodePath(code);
                }
            }
        }
        subjectPaths = subjectPaths;
    }

    function toggleQuestion(idx: number) {
        if (expandedQuestions.has(idx)) {
            expandedQuestions.delete(idx);
        } else {
            expandedQuestions.add(idx);
        }
        expandedQuestions = expandedQuestions;
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    function updateMemo(idx: number, text: string) {
        const questionId = record.questions[idx].id;

        // 1. Update individual record (for immediate UI feedback in history view)
        if (!record.memos) record.memos = {};
        record.memos[idx] = text;

        // 2. Update central questionMemos (for cross-sharing and review page)
        if (!$questionMemos[questionId]) {
            $questionMemos[questionId] = {
                memo: text,
                wrongCount: 0,
                consecutiveCorrect: 0,
            };
        } else {
            $questionMemos[questionId].memo = text;
        }
        $questionMemos = $questionMemos;

        // 3. Persist individual record to history store
        quizHistory.update((history) => {
            const index = history.findIndex((h) => h.id === record.id);
            if (index !== -1) {
                const newHistory = [...history];
                newHistory[index] = { ...record };
                return newHistory;
            }
            return history;
        });
    }

    $: correctCount = record.questions.filter((q, i) =>
        isCorrectAnswer(q, record.answers[i]),
    ).length;
    $: wrongCount = record.total - correctCount;
    $: percentage = Math.round((correctCount / record.total) * 100);
</script>

<!-- Report Card (Neo-Retro) -->
<div class="retro-window w-full bg-white mb-6">
    <div class="retro-header !py-3">
        <div class="flex items-center gap-2">
            <span>📊 ANALYSIS_RESULT.log</span>
        </div>
        <div class="flex gap-1">
            <div class="retro-btn-control">_</div>
            <div class="retro-btn-control">X</div>
        </div>
    </div>

    <div class="p-8 text-center bg-white space-y-8">
        <!-- Score Big Display -->
        <div class="relative inline-block">
            <div class="absolute -top-3 -right-3">
                {#if percentage >= 60}
                    <div class="pixel-tag bg-[#99FF99] text-black">PASSED</div>
                {:else}
                    <div class="pixel-tag bg-[#FF6666] text-white">FAILED</div>
                {/if}
            </div>

            <div
                class="text-7xl font-pixel text-black tracking-tighter transform scale-y-110"
            >
                {percentage}%
            </div>
            <div
                class="text-xs font-mono text-gray-400 mt-2 tracking-[0.2em] uppercase"
            >
                Accuracy Rating
            </div>
        </div>

        <!-- Grid Stats -->
        <div
            class="grid grid-cols-3 gap-0 border-2 border-black divide-x-2 divide-black"
        >
            <div class="p-4 bg-gray-50">
                <div class="text-2xl font-pixel text-[#111]">
                    {correctCount}
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase mt-1">
                    Correct
                </div>
            </div>
            <div class="p-4 bg-gray-50">
                <div class="text-2xl font-pixel text-[#FF6666]">
                    {wrongCount}
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase mt-1">
                    Wrong
                </div>
            </div>
            <div class="p-4 bg-gray-50">
                <div class="text-2xl font-pixel text-[#66CCFF]">
                    {formatTime(record.timeTaken)}
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase mt-1">
                    Time
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Details -->
<section class="space-y-4">
    <div class="flex items-center gap-2 mb-2">
        <div class="w-1 h-4 bg-[#FF66CC]"></div>
        <h2 class="font-pixel text-lg tracking-wide">VECTOR DETAILS</h2>
    </div>

    <div class="border-2 border-black bg-white rounded-lg overflow-hidden">
        {#each record.questions as question, idx}
            {@const userAnswer = record.answers[idx]}
            {@const isCorrect = isCorrectAnswer(question, userAnswer)}
            {@const isExpanded = expandedQuestions.has(idx)}

            <div class="border-b-2 border-gray-100 last:border-b-0">
                <button
                    class="w-full text-left p-3 flex items-center gap-3 hover:bg-[#FFF0F5]"
                    on:click={() => toggleQuestion(idx)}
                >
                    <div
                        class="w-6 h-6 flex items-center justify-center border border-black font-bold text-xs
                                {isCorrect
                            ? 'bg-[#99FF99]'
                            : 'bg-[#FF6666] text-white'}"
                    >
                        {idx + 1}
                    </div>
                    <div class="flex-1 font-bold text-xs truncate">
                        {question.question}
                    </div>
                    {#if isExpanded}
                        <ChevronUp size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                </button>

                {#if isExpanded}
                    {@const sourceTitle =
                        question.examInfo?.examName || question.exam_title}
                    {@const sourceYear =
                        question.examInfo?.examYear || question.exam_year}
                    <div
                        class="p-4 bg-gray-50 border-t-2 border-black text-sm space-y-4 shadow-inner"
                    >
                        <!-- Source Info -->
                        {#if sourceTitle || sourceYear}
                            <div
                                class="text-[10px] font-bold text-gray-400 flex items-center gap-2"
                            >
                                <span>📌</span>
                                <span>
                                    {sourceYear || ""}
                                    {sourceTitle || "출처 불명"}
                                    {#if question.id}#{question.id}{/if}
                                </span>
                            </div>
                        {/if}

                        <div
                            class="font-bold text-gray-900 leading-relaxed font-sans text-base"
                        >
                            Q. {question.question}
                        </div>
                        <div class="space-y-1">
                            {#each question.options as opt, optIdx}
                                {@const isAns = optIdx + 1 === question.answer}
                                {@const isUser = optIdx + 1 === userAnswer}
                                <div
                                    class="p-3 border-2 flex gap-3 items-start transition-colors
                                            {isAns
                                        ? 'border-[#99FF99] bg-[#F0FFF0]'
                                        : 'border-gray-200 bg-white'}
                                            {isUser && !isAns
                                        ? '!border-[#FF6666] !bg-[#FFF0F0]'
                                        : ''}"
                                >
                                    <span class="font-mono text-gray-500 mt-0.5"
                                        >{optIdx + 1}</span
                                    >
                                    <span class="text-gray-900">{opt}</span>
                                    {#if isAns}
                                        <span
                                            class="text-[#26C6DA] font-bold ml-auto"
                                            >ANS</span
                                        >
                                    {/if}
                                    {#if isUser && !isAns}
                                        <span
                                            class="text-[#FF6666] font-bold ml-auto"
                                            >YOU</span
                                        >
                                    {/if}
                                </div>
                            {/each}
                        </div>

                        <!-- Memo Section -->
                        <div
                            class="mt-4 pt-4 border-t border-dashed border-gray-400"
                        >
                            <label
                                for={`memo-${idx}`}
                                class="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2"
                            >
                                📝 MEMO
                            </label>
                            <textarea
                                id={`memo-${idx}`}
                                class="w-full text-sm p-3 border border-gray-300 rounded focus:border-[#FF66CC] focus:ring-1 focus:ring-[#FF66CC] outline-none min-h-[80px]"
                                placeholder="Write your analysis notes here..."
                                value={record.memos?.[idx] || ""}
                                on:input={(e) =>
                                    updateMemo(idx, e.currentTarget.value)}
                            ></textarea>
                        </div>

                        <!-- Meta Info (Taxonomy) -->
                        {#if question.subjects && question.subjects.length > 0}
                            <div
                                class="mt-2 pt-2 border-t border-dashed border-gray-300"
                            >
                                <span
                                    class="text-[10px] font-bold text-gray-500 bg-gray-200 px-1 rounded"
                                    >TAGS</span
                                >
                                <div class="flex flex-wrap gap-1 mt-1">
                                    {#each question.subjects as code}
                                        <span
                                            class="text-[10px] text-gray-600 bg-white border border-gray-300 px-1 rounded"
                                        >
                                            {subjectPaths[code] || code}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</section>
