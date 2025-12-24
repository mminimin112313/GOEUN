<script lang="ts">
    import {
        quizConfig,
        quizHistory,
        wrongNotes,
        quizSession,
        questionMemos,
    } from "$lib/stores";
    import { isCorrectAnswer } from "$lib/logic/quizEngine";
    import { CATEGORY_MAP, AVAILABLE_ROUNDS } from "$lib/config";
    import { goto } from "$app/navigation";
    import LevelProgress from "$lib/components/LevelProgress.svelte";
    import {
        Sparkles,
        BookOpen,
        Trophy,
        TrendingUp,
        ChevronRight,
        Star,
        Zap,
        MousePointer2,
        HelpCircle,
    } from "lucide-svelte";
    import HelpModal from "$lib/components/HelpModal.svelte";
    import StatsDashboard from "$lib/components/StatsDashboard.svelte";

    import { examDataService } from "$lib/services/examService";

    // ... existing variable declarations ...
    let showHelp = false;
    let isLoading = false;

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
    // Derived Wrong Count from Logs (Sync with Review page logic)
    $: wrongCountFromLogs = (() => {
        const wrongIds = new Set<number>();
        $quizHistory.forEach((record) => {
            record.questions.forEach((q, idx) => {
                const userAnswer = record.answers[idx];
                if (
                    userAnswer !== undefined &&
                    !isCorrectAnswer(q, userAnswer)
                ) {
                    if (!$questionMemos[q.id]?.isGraduated) {
                        wrongIds.add(q.id);
                    }
                }
            });
        });
        return wrongIds.size;
    })();

    $: wrongCount = wrongCountFromLogs;

    async function handleQuickStart() {
        if (isLoading) return;
        isLoading = true;

        try {
            // 1. Ensure data is loaded
            await examDataService.init();

            // 2. Get all questions
            const allQuestions = examDataService.getAllQuestions();

            if (allQuestions.length === 0) {
                alert("데이터 로딩 실패. 잠시 후 다시 시도해주세요.");
                return;
            }

            // 3. Select 10 random questions
            const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 10).map((q) => {
                // Shuffle options for each question
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

            // 4. Set session
            $quizSession = {
                questions: selected,
                config: {
                    category: "QUICK_START",
                    round: "RANDOM",
                    questionCount: 10,
                    prioritizeUnseen: false,
                    shuffleOptions: true,
                },
                startTime: Date.now(),
            };

            // 5. Navigate
            goto("/quiz");
        } catch (e) {
            console.error(e);
            alert("오류가 발생했습니다.");
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Hero Header (Retro Window) -->
    <header class="retro-window">
        <div class="retro-header">
            <div class="flex items-center gap-2">
                <span>🌸 MY_LAWYER_DIARY.exe</span>
            </div>
            <div class="flex gap-1 items-center">
                <button
                    class="retro-btn-control bg-[#66CCFF] text-white"
                    on:click={() => (showHelp = true)}>?</button
                >
                <div class="retro-btn-control">_</div>
                <div class="retro-btn-control">□</div>
                <div class="retro-btn-control">X</div>
            </div>
        </div>
        <div class="p-8 text-center space-y-4 bg-[#F5F5F5] text-black">
            <div
                class="inline-flex items-center gap-2 px-3 py-1 bg-white border border-black text-xs font-bold shadow-sm"
            >
                <Sparkles size={14} class="text-[#FF66CC]" />
                <span class="font-pixel">VER.2025.12.25</span>
            </div>

            <h1
                class="text-4xl font-pixel text-[#111] animate-bounce-pixel tracking-tighter"
            >
                BYEONSI CBT
            </h1>

            <p class="text-xs font-bold text-gray-500 font-mono hidden">
                System Ready.
            </p>

            <button
                class="btn-retro btn-retro-pink flex items-center justify-center gap-2 mx-auto mt-4 text-sm"
                on:click={() => goto("/settings")}
            >
                <span>ENTER SYSTEM</span>
                <ChevronRight size={16} />
            </button>
        </div>
    </header>

    <!-- Character & Level -->
    <section class="flex flex-col items-center">
        <!-- Sprite Animation Container REMOVED -->
        <LevelProgress />
    </section>

    <!-- Quick Stats (Folder Style) -->
    <section class="grid grid-cols-2 gap-4">
        <div
            class="retro-window p-3 text-center bg-white hover:bg-gray-50 transition-colors"
        >
            <div class="text-2xl font-pixel text-[#FF66CC]">{totalQuizzes}</div>
            <div class="text-[10px] font-bold mt-1">TOTAL EXAMS</div>
        </div>
        <div
            class="retro-window p-3 text-center bg-white hover:bg-gray-50 transition-colors"
        >
            <div class="text-2xl font-pixel text-[#66CCFF]">{avgScore}%</div>
            <div class="text-[10px] font-bold mt-1">AVG SCORE</div>
        </div>
        <div
            class="retro-window p-3 text-center bg-white hover:bg-gray-50 transition-colors"
        >
            <div class="text-2xl font-pixel text-[#99FF99]">
                {totalQuestions}
            </div>
            <div class="text-[10px] font-bold mt-1">SOLVED</div>
        </div>
        <div
            class="retro-window p-3 text-center bg-white hover:bg-gray-50 transition-colors"
        >
            <div class="text-2xl font-pixel text-[#FF6666]">{wrongCount}</div>
            <div class="text-[10px] font-bold mt-1">WRONG NOTES</div>
        </div>
    </section>

    <!-- Quick Start -->
    <section class="space-y-2">
        <div class="flex items-center justify-between">
            <h2 class="font-pixel text-lg flex items-center gap-2">
                <Zap size={20} class="text-[#FF66CC]" />
                QUICK START
            </h2>
            <button
                class="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold bg-[#E0E0E0] hover:bg-white active:translate-y-[1px]"
                on:click|stopPropagation={() => (showHelp = true)}
            >
                ?
            </button>
        </div>

        <button
            class="w-full btn-retro btn-retro-pink flex items-center justify-center gap-3 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={handleQuickStart}
            disabled={isLoading}
        >
            {#if isLoading}
                <span class="animate-spin">⏳</span>
                <span class="tracking-widest">LOADING...</span>
            {:else}
                <BookOpen size={24} />
                <span class="tracking-widest">QUICK START (10 Questions)</span>
                <ChevronRight size={24} />
            {/if}
        </button>
    </section>

    <!-- Categories (Folder Links) -->
    <section class="space-y-3">
        <div class="flex items-center justify-between">
            <h2 class="font-pixel text-lg flex items-center gap-2">
                <MousePointer2 size={20} class="text-[#66CCFF]" />
                SUBJECTS
            </h2>
            <button
                class="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold bg-[#E0E0E0] hover:bg-white active:translate-y-[1px]"
                on:click|stopPropagation={() => (showHelp = true)}
            >
                ?
            </button>
        </div>

        <div class="space-y-3">
            {#each Object.entries(CATEGORY_MAP) as [cat, info]}
                <button
                    class="w-full retro-window p-0 hover:translate-x-1 transition-transform group text-left"
                    on:click={() => {
                        $quizConfig = {
                            ...$quizConfig,
                            category: cat,
                            questionCount: 20,
                            startYear: 2020,
                            endYear: 2024,
                            selectedRounds: [],
                            selectedSubjects: [],
                            selectedCodes: [],
                        };
                        goto("/settings");
                    }}
                >
                    <div class="retro-header !bg-black !text-white !border-b-2">
                        <span class="font-bold">{cat}</span>
                        <ChevronRight
                            size={16}
                            class="group-hover:text-[#FF66CC]"
                        />
                    </div>
                    <div class="p-3 bg-gray-50 text-xs text-gray-600 font-bold">
                        📁 {info.subjects.join(" • ")}
                    </div>
                </button>
            {/each}
        </div>
    </section>

    <!-- Stats Dashboard (New) -->
    <section class="space-y-2">
        <StatsDashboard />
    </section>

    <!-- Review Mode -->
    {#if wrongCount > 0}
        <section class="space-y-2">
            <h2 class="font-pixel text-lg flex items-center gap-2">
                <BookOpen size={20} class="text-[#FF6666]" />
                REVIEW
            </h2>

            <button
                class="w-full btn-retro flex items-center justify-center gap-3 bg-[#FFF0F5] text-[#FF6666]"
                on:click={() => goto("/review")}
            >
                <TrendingUp size={20} />
                REVIEW {wrongCount} MISTAKES
            </button>
        </section>
    {/if}

    <HelpModal bind:show={showHelp} />
</div>
