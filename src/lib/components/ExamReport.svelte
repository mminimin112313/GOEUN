<script lang="ts">
    import { quizConfig, quizSession } from "$lib/stores";
    import { isCorrectAnswer } from "$lib/logic/quizEngine";
    import { onMount } from "svelte";
    import { getCodePath } from "$lib/db";
    import {
        ChevronRight,
        PlayCircle,
        ChevronDown,
        ChevronUp,
        Trophy,
    } from "lucide-svelte";
    import { examDataService } from "$lib/services/examService";
    import { goto } from "$app/navigation";
    import { quizHistory, questionMemos } from "$lib/stores";
    import type { QuizRecord } from "$lib/types";

    export let record: QuizRecord;

    let expandedQuestions: Set<number> = new Set();
    let subjectPaths: Record<string, string> = {};

    onMount(() => {
        loadSubjectPaths();
        // Automatically expand wrong answers
        record.questions.forEach((q, i) => {
            if (!isCorrectAnswer(q, record.answers[i])) {
                expandedQuestions.add(i);
            }
        });
        expandedQuestions = expandedQuestions;
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

    // Summary of subjects missed
    $: wrongSubjects = (() => {
        const subjectsFound = new Map<string, string>(); // code -> name
        record.questions.forEach((q, i) => {
            if (!isCorrectAnswer(q, record.answers[i])) {
                q.subjects.forEach((code) => {
                    if (subjectPaths[code]) {
                        subjectsFound.set(code, subjectPaths[code]);
                    }
                });
            }
        });
        // Sort by code for consistent taxonomy order
        return Array.from(subjectsFound.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
    })();

    async function startRecoveryQuiz(subj: { code: string; name: string }) {
        if (
            !confirm(
                `${subj.name} 파트 문제를 10문제 출제한 시험지를 준비하면서 해당 파트를 풀어보시겠습니까?`,
            )
        ) {
            return;
        }

        try {
            await examDataService.init();
            const allQuestions = examDataService.getAllQuestions();

            // Filter questions by subject code
            const relatedQuestions = allQuestions.filter((q) =>
                q.subjects.some(
                    (code) =>
                        code === subj.code || code.startsWith(subj.code + "."),
                ),
            );

            if (relatedQuestions.length === 0) {
                alert("해당 파트의 문제를 찾을 수 없습니다.");
                return;
            }

            // Shuffle and pick 10
            const shuffled = [...relatedQuestions].sort(
                () => 0.5 - Math.random(),
            );
            const selected = shuffled.slice(0, 10).map((q) => {
                const options = q.options.map((text, i) => ({
                    text,
                    originalIndex: i + 1,
                }));
                const shuffledOptions = options.sort(() => 0.5 - Math.random());
                return {
                    ...q,
                    displayOptions: shuffledOptions,
                };
            });

            // Set session
            $quizSession = {
                questions: selected,
                config: {
                    category: "RECOVERY_QUIZ",
                    round: subj.name,
                    questionCount: selected.length,
                    prioritizeUnseen: false,
                    shuffleOptions: true,
                },
                startTime: Date.now(),
            };

            goto("/quiz");
        } catch (e) {
            console.error(e);
            alert("연습 문제를 생성하는 중 오류가 발생했습니다.");
        }
    }
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

<!-- Summary Message for Wrong Parts -->
{#if wrongSubjects.length > 0}
    <div
        class="retro-window w-full bg-[#FFF0F0] mb-6 border-2 border-[#FF6666] p-4"
    >
        <div class="flex items-start gap-3">
            <div class="text-2xl">⚠️</div>
            <div class="space-y-1">
                <p class="font-pixel text-[#FF6666] text-sm">
                    ATTENTION: WEAKNESS DETECTED
                </p>
                <p
                    class="text-[10px] font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1"
                >
                    취약 파트 분석 리포트
                </p>
                <div class="space-y-2">
                    {#each wrongSubjects as subj}
                        <button
                            class="w-full flex items-center justify-between p-2 rounded bg-white hover:bg-[#FFF5F5] border border-gray-200 hover:border-[#FF6666] transition-all group text-left"
                            on:click={() => startRecoveryQuiz(subj)}
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-[8px] px-1 bg-gray-100 text-gray-500 rounded font-mono"
                                >
                                    {subj.code}
                                </span>
                                <span class="text-xs font-bold text-gray-700">
                                    {subj.name}
                                </span>
                            </div>
                            <div
                                class="flex items-center gap-1 text-[10px] font-bold text-[#FF6666] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span>연습하기</span>
                                <PlayCircle size={14} />
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

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
                        {#if sourceTitle || sourceYear || question.subject_category}
                            <div
                                class="text-[10px] font-bold text-gray-400 flex items-center gap-2"
                            >
                                <span>📌</span>
                                <span>
                                    {sourceYear || ""}
                                    {sourceTitle || "출처 불명"}
                                    {#if question.id}#{question.id}{/if}
                                </span>
                                {#if question.subject_category || question.examInfo?.category}
                                    <span
                                        class="pixel-tag bg-[#E0F7FA] text-[#006064] ml-1"
                                    >
                                        {question.subject_category ||
                                            question.examInfo?.category}
                                    </span>
                                {/if}
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
