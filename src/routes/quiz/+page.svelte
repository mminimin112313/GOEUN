<script lang="ts">
    import { quizSession, seenIds, quizHistory, wrongNotes } from "$lib/stores";
    import {
        filterQuestions,
        createSessionQuestions,
        isCorrectAnswer,
        calculateScore,
    } from "$lib/logic/quizEngine";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import {
        ChevronLeft,
        ChevronRight,
        Clock,
        Flag,
        BookOpen,
    } from "lucide-svelte";
    import type { Question, QuizRecord } from "$lib/types";
    import TaxonomyBreadcrumb from "$lib/components/TaxonomyBreadcrumb.svelte";
    import QuizCanvas from "$lib/components/QuizCanvas.svelte";
    import { PenTool } from "lucide-svelte";

    // Session state
    let questions: Question[] = [];
    let currentIndex = 0;
    let answers: Record<number, number> = {};
    let startTime = Date.now();
    let questionTimes: number[] = [];
    let lastQuestionTime = Date.now();

    // Drawing Mode
    let drawMode = false;

    // Timer
    let elapsed = 0;
    let timerInterval: ReturnType<typeof setInterval>;

    import { examDataService } from "$lib/services/examService";

    onMount(async () => {
        if (!$quizSession) {
            goto("/");
            return;
        }

        // Quick Start provided questions directly
        if ($quizSession.questions && $quizSession.questions.length > 0) {
            questions = $quizSession.questions;
        } else {
            // Normal Start - Generate from Config
            await examDataService.init();
            const examData = examDataService.getAllQuestions(); // Use service to get pool

            // Filter based on config
            // Note: filterQuestions in quizEngine expects ExamData matching simpler structure,
            // but here we have global pool. We might need to adapt filter logic or use service's filter.
            // Let's use service's filter if possible or manual filter.

            // Re-implementing filter logic for global pool here as quizEngine's filter might be scoped to single exam.
            // Actually examDataService.filterQuestions is robust.

            const config = $quizSession.config;
            let pool = examDataService.filterQuestions({
                categories: config.category ? [config.category] : undefined,
                subjects:
                    config.selectedSubjects.length > 0
                        ? config.selectedSubjects
                        : undefined,
                // Round filtering is complex across multiple files, let's assume 'selectedRounds' handled elsewhere or ignore for now if single round.
            });

            // If round specific
            if (config.round && config.round !== "RANDOM") {
                pool = pool.filter((q) => q.exam_round === config.round);
            }

            // Create Session
            questions = createSessionQuestions(pool, new Set($seenIds), config);
        }

        if (questions.length === 0) {
            alert("문제를 찾을 수 없습니다.");
            goto("/");
            return;
        }

        // Initialize Timer
        timerInterval = setInterval(() => {
            elapsed++;
        }, 1000);
    });

    // Cleanup
    onDestroy(() => {
        if (timerInterval) clearInterval(timerInterval);
    });

    $: currentQuestion = questions[currentIndex];
    $: selectedAnswer = answers[currentIndex];
    $: progress =
        questions.length > 0
            ? ((currentIndex + 1) / questions.length) * 100
            : 0;

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function selectAnswer(optionIndex: number) {
        if (drawMode) return; // Prevent answering while drawing? Or allow both? detailed req said "toggle". Usually better to separate.
        // User didn't specify, but preventing accidental clicks is good.
        // Actually, QuizCanvas has pointer-events-auto when enabled, so it blocks clicks anyway.

        const originalIndex =
            currentQuestion.displayOptions?.[optionIndex]?.originalIndex ||
            optionIndex + 1;
        answers[currentIndex] = originalIndex;
        answers = answers;
    }

    function goNext() {
        questionTimes[currentIndex] = Math.floor(
            (Date.now() - lastQuestionTime) / 1000,
        );
        lastQuestionTime = Date.now();
        if (currentIndex < questions.length - 1) currentIndex++;
    }

    function goPrev() {
        if (currentIndex > 0) currentIndex--;
    }

    function handleSubmit() {
        clearInterval(timerInterval);
        questionTimes[currentIndex] = Math.floor(
            (Date.now() - lastQuestionTime) / 1000,
        );

        // Detailed Logging per User Request
        console.group("📝 EXAM SESSION LOG");
        console.log(`🕒 Total Time: ${formatTime(elapsed)} (${elapsed}s)`);
        console.log(`📅 Date: ${new Date().toLocaleString()}`);

        questions.forEach((q, idx) => {
            const time = questionTimes[idx] || 0;
            const selected = answers[idx];
            const isCorrect = isCorrectAnswer(q, selected);
            const status = isCorrect ? "✅ CORRECT" : "❌ WRONG";
            const source = `${q.examInfo?.round || "Unknown"} ${q.id}문`;

            console.log(
                `Q${idx + 1} [${source}] : ${time}s | ${status} | Subject: ${q.subjects.join(", ")}`,
            );
        });
        console.groupEnd();

        const stats = calculateScore(questions, answers);

        const record: QuizRecord = {
            id: Date.now(),
            date: new Date().toLocaleDateString("ko-KR"),
            timestamp: Date.now(),
            category: $quizSession.config.category,
            round: $quizSession.config.round,
            score: stats.correct,
            total: questions.length,
            timeTaken: elapsed,
            questions,
            answers,
            questionTimes,
        };

        $quizHistory = [...$quizHistory, record];
        const newSeenIds = questions.map((q) => String(q.id));
        $seenIds = [...new Set([...$seenIds, ...newSeenIds])];

        // Wrong Note Logic
        questions.forEach((q, idx) => {
            const selected = answers[idx];
            if (selected === undefined || !isCorrectAnswer(q, selected)) {
                // ... (existing logic omitted for brevity, logicEngine handles this anyway? No, locally here)
                const existing = $wrongNotes.find((w) => w.id === q.id);
                if (existing) {
                    existing.wrongCount++;
                    existing.consecutiveCorrect = 0;
                    existing.lastWrongDate = Date.now();
                } else {
                    $wrongNotes = [
                        ...$wrongNotes,
                        {
                            ...q,
                            timestamp: Date.now(),
                            wrongCount: 1,
                            consecutiveCorrect: 0,
                            lastWrongDate: Date.now(),
                            examInfo: {
                                category: $quizSession.config.category,
                                round: $quizSession.config.round,
                            },
                        },
                    ];
                }
            }
        });

        goto("/result");
    }
    // Keyboard Shortcuts (Doc #8)
    function handleKeydown(event: KeyboardEvent) {
        if (!currentQuestion) return;

        const key = event.key;

        // Options 1-5
        if (["1", "2", "3", "4", "5"].includes(key)) {
            const index = parseInt(key) - 1;
            // Map visual index to actual option index
            // Ideally we need to find which option has visual index
            // But current logic maps directly if we assume displayOptions is ordered
            selectAnswer(index);
            // Add visual feedback class logic if needed later (Doc #12)
        }

        // Space/Enter for Next
        if ((key === " " || key === "Enter") && selectedAnswer !== null) {
            event.preventDefault(); // Prevent scrolling
            if (currentIndex === questions.length - 1) {
                handleSubmit();
            } else {
                goNext();
            }
        }

        // 'D' or 'M' for Draw Mode
        if (key.toLowerCase() === "d" || key.toLowerCase() === "m") {
            drawMode = !drawMode;
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen p-4 pb-24 flex flex-col items-center justify-center">
    {#if !currentQuestion}
        <div class="retro-window p-8 text-center bg-white">
            <div class="text-4xl animate-spin">⏳</div>
            <p class="font-bold font-pixel mt-4 tracking-widest">
                LOADING SYSTEM...
            </p>
        </div>
    {:else}
        <!-- Quiz Window: Neo-Retro -->
        <div
            class="retro-window w-full max-w-2xl bg-white flex flex-col h-[80vh] border-black"
        >
            <!-- Header: Dark Professional -->
            <div class="retro-header !py-3">
                <div class="flex items-center gap-2">
                    <span
                        class="truncate font-mono text-xs tracking-wider opacity-80"
                    >
                        {#if currentQuestion.examInfo}
                            {currentQuestion.examInfo.round}
                            {currentQuestion.id}문
                        {:else}
                            SESSION_ID: {Date.now().toString().slice(-6)}
                        {/if}
                    </span>
                </div>
                <div class="flex items-center gap-4">
                    <button
                        class={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold transition-all border border-black ${drawMode ? "!bg-[#FF66CC] !text-black shadow-inner" : "bg-white hover:bg-gray-100"}`}
                        on:click={() => (drawMode = !drawMode)}
                    >
                        <PenTool size={12} /> MEMO_MODE
                    </button>
                    <div
                        class="flex items-center gap-2 font-mono text-sm bg-black text-[#99FF99] px-2 py-0.5"
                    >
                        <Clock size={14} />
                        <span>{formatTime(elapsed)}</span>
                    </div>
                </div>
            </div>

            <!-- Progress: Hardpoint Style -->
            <div class="h-1 bg-black w-full relative">
                <div
                    class="h-full bg-[#FF66CC] transition-all duration-300"
                    style="width: {progress}%"
                ></div>
            </div>

            <!-- Content Area (Scrollable) -->
            <div
                class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative"
            >
                <QuizCanvas enabled={drawMode} />

                <!-- Taxonomy Breadcrumb (New Feature) -->
                <TaxonomyBreadcrumb codes={currentQuestion.subjects} />

                <!-- Main Text -->
                <div class="space-y-4">
                    {#if currentQuestion.passage}
                        <div
                            class="p-4 bg-white border-2 border-black border-dashed font-serif text-sm leading-relaxed text-[#333]"
                        >
                            <div
                                class="flex items-center gap-2 mb-2 font-bold text-gray-400 text-xs uppercase"
                            >
                                <BookOpen size={12} /> Passage
                            </div>
                            <p class="whitespace-pre-wrap">
                                {currentQuestion.passage}
                            </p>
                        </div>
                    {/if}

                    <p class="font-bold text-lg leading-relaxed text-[#1a1a1a]">
                        {currentQuestion.question}
                    </p>
                </div>

                <!-- Options: Grid Layout -->
                <div class="space-y-3">
                    {#each currentQuestion.displayOptions || currentQuestion.options.map( (t, i) => ({ text: t, originalIndex: i + 1 }), ) as option, idx}
                        <button
                            class="w-full text-left p-0 btn-retro transition-all group flex items-stretch
                                   {selectedAnswer === option.originalIndex
                                ? '!bg-[#E6F7FF] !border-black !translate-x-[2px] !translate-y-[2px] !shadow-none'
                                : 'hover:!bg-gray-50'}"
                            on:click={() => selectAnswer(idx)}
                        >
                            <!-- Number Box -->
                            <div
                                class="w-12 flex items-center justify-center border-r-2 border-black font-bold font-mono text-lg shrink-0
                                        {selectedAnswer === option.originalIndex
                                    ? 'bg-[#66CCFF] text-white'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-white'}"
                            >
                                {idx + 1}
                            </div>
                            <!-- Text -->
                            <div
                                class="flex-1 p-4 text-base leading-relaxed flex items-center font-sans break-keep text-gray-800 tracking-tight"
                            >
                                {option.text}
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Footer Controls -->
            <div
                class="p-4 bg-gray-100 border-t-2 border-black flex justify-between gap-4"
            >
                <button
                    class="btn-retro px-6 text-sm flex items-center gap-2 disabled:opacity-50"
                    on:click={goPrev}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft size={16} /> PREV
                </button>

                {#if currentIndex === questions.length - 1}
                    <button
                        class="btn-retro btn-retro-pink px-8 text-sm flex items-center gap-2"
                        on:click={handleSubmit}
                    >
                        Success <Flag size={16} />
                    </button>
                {:else}
                    <button
                        class="btn-retro btn-retro-blue px-6 text-sm flex items-center gap-2"
                        on:click={goNext}
                    >
                        NEXT <ChevronRight size={16} />
                    </button>
                {/if}
            </div>
        </div>
    {/if}
</div>
