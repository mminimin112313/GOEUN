<script lang="ts">
    import { quizConfig, quizSession, seenIds } from "$lib/stores";
    import { CATEGORY_MAP } from "$lib/config";
    import { loadMultipleExams } from "$lib/db";
    import {
        getFlatTaxonomyForCategory,
        type FlatTaxonomyNode,
    } from "$lib/db/taxonomy";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import {
        Zap,
        BookOpen,
        ChevronRight,
        Settings2,
        FolderTree,
        CheckSquare,
        Square,
        Sparkles,
        FileText,
        Play,
        Sliders,
        RotateCcw,
    } from "lucide-svelte";
    import { slide } from "svelte/transition";

    // Reactive: Category subjects
    $: categoryInfo = CATEGORY_MAP[$quizConfig.category];
    $: availableSubjects = categoryInfo?.subjects || [];

    // Taxonomy Tree State
    let taxonomyNodes: FlatTaxonomyNode[] = [];
    let loadingTaxonomy = false;
    let showAdvanced = false;

    // Dynamic Data
    let examIndex: any[] = []; // Loaded from JSON
    let availableYears: number[] = [];

    // Local State for Range (synced with store on change)
    let localStartYear = $quizConfig.startYear;
    let localEndYear = $quizConfig.endYear;

    // Taxonomy Counts State
    let taxonomyCounts: Record<string, number> = {};

    onMount(async () => {
        try {
            const res = await fetch("/data/exam_index.json");
            examIndex = await res.json();

            availableYears = Array.from(
                new Set(examIndex.map((e) => parseInt(e.year))),
            ).sort((a, b) => a - b); // Ascending for slider min/max

            // Initial Sync if store is empty or invalid
            if (availableYears.length > 0) {
                if (!localStartYear) localStartYear = availableYears[0];
                if (!localEndYear)
                    localEndYear = availableYears[availableYears.length - 1];
            } else {
                // Fallback if data not loaded
                if (!localStartYear) localStartYear = 2012;
                if (!localEndYear) localEndYear = 2024;
            }

            // Migration/Safety: Ensure new config fields exist if missing from old LocalStorage
            if (!$quizConfig.examTypes) {
                console.warn("Migrating config: missing examTypes");
                $quizConfig.examTypes = ["official"];
            }
            if (!$quizConfig.selectedRounds) $quizConfig.selectedRounds = [];

            updateSelectedRounds();
            updateTaxonomyCounts();
        } catch (err) {
            console.error("Failed to load exam index", err);
        }
    });

    // Reactivity
    $: if ($quizConfig.category) {
        // Reset sub-selections when category changes
        // But we want to keep years
        updateTaxonomyCounts();
        if (showAdvanced) loadTaxonomyTree();
    }

    // Update Store when Local State changes
    $: {
        if (localStartYear !== undefined)
            $quizConfig.startYear = localStartYear;
        if (localEndYear !== undefined) $quizConfig.endYear = localEndYear;
        updateSelectedRounds();
        updateTaxonomyCounts();
    }

    function updateSelectedRounds() {
        if (!examIndex.length) return;

        const rounds: string[] = [];
        examIndex.forEach((e) => {
            const y = parseInt(e.year);
            // Check Year Range
            if (y >= localStartYear && y <= localEndYear) {
                // Check Exam Type
                const type = e.type || "official";
                // Safety check for examTypes
                const validTypes = $quizConfig.examTypes || ["official"];
                if (validTypes.includes(type)) {
                    rounds.push(e.round);
                }
            }
        });
        $quizConfig.selectedRounds = rounds;
    }

    function updateTaxonomyCounts() {
        const counts: Record<string, number> = {};
        if (examIndex.length > 0) {
            const relevantRounds = examIndex.filter((e) =>
                ($quizConfig.selectedRounds || []).includes(e.round),
            );

            relevantRounds.forEach((r) => {
                const subjectData = r.subjects.find(
                    (s: any) => s.category === $quizConfig.category,
                );
                if (subjectData && subjectData.taxonomy_stats) {
                    Object.entries(subjectData.taxonomy_stats).forEach(
                        ([code, count]) => {
                            // @ts-ignore
                            counts[code] =
                                (counts[code] || 0) + (count as number);
                        },
                    );
                }
            });
        }
        taxonomyCounts = counts;
    }

    function getNodeCount(code: string): number {
        return Object.entries(taxonomyCounts)
            .filter(([k, v]) => k === code || k.startsWith(code + "_"))
            .reduce((sum, [k, v]) => sum + v, 0);
    }

    // Toggle logic
    function toggleSubject(subject: string) {
        const currentSubjects = $quizConfig.selectedSubjects || [];
        if (currentSubjects.includes(subject)) {
            $quizConfig.selectedSubjects = currentSubjects.filter(
                (s) => s !== subject,
            );
        } else {
            $quizConfig.selectedSubjects = [...currentSubjects, subject];
        }
        if (showAdvanced) loadTaxonomyTree();
    }

    function toggleExamType(typeId: string) {
        const currentTypes = $quizConfig.examTypes || [];
        if (currentTypes.includes(typeId)) {
            $quizConfig.examTypes = currentTypes.filter((t) => t !== typeId);
        } else {
            $quizConfig.examTypes = [...currentTypes, typeId];
        }
        updateSelectedRounds();
    }

    // Taxonomy Tree
    async function loadTaxonomyTree() {
        loadingTaxonomy = true;
        try {
            taxonomyNodes = await getFlatTaxonomyForCategory(
                $quizConfig.category,
            );
            // Filter by selected subjects if any
            if ($quizConfig.selectedSubjects.length > 0) {
                taxonomyNodes = taxonomyNodes.filter((n) =>
                    $quizConfig.selectedSubjects.includes(n.subject),
                );
            }
        } catch (e) {
            console.error("Failed to load taxonomy", e);
        } finally {
            loadingTaxonomy = false;
        }
    }

    function toggleCode(code: string) {
        const descendants = taxonomyNodes
            .filter((n) => n.code.startsWith(code + "_"))
            .map((n) => n.code);
        const targets = [code, ...descendants];
        const currentSelected = $quizConfig.selectedCodes || [];
        const isSelected = currentSelected.includes(code);

        if (isSelected) {
            $quizConfig.selectedCodes = currentSelected.filter(
                (c) => !targets.includes(c),
            );
        } else {
            const newCodes = new Set([...currentSelected, ...targets]);
            $quizConfig.selectedCodes = Array.from(newCodes);
        }
    }

    // Start Actions
    async function handleStart() {
        if ($quizConfig.selectedRounds.length === 0) {
            alert("선택된 기간에 해당하는 시험이 없습니다.");
            return;
        }

        try {
            const examData = await loadMultipleExams(
                $quizConfig.selectedRounds,
                $quizConfig.category,
            );

            // Create Session
            $quizSession = {
                config: { ...$quizConfig },
                examData, // Note: This contains merged Pool
                startTime: Date.now(),
                currentIndex: 0,
                questions: [], // Will be filtered/hydrated in quiz page or here?
                // Actually, let's let quiz page handle filtering or do it here?
                // The existing logic in quiz/+page.svelte does filtering.
                // But passing full examData is fine.
            };

            goto("/quiz");
        } catch (e) {
            console.error("Failed to load exam data", e);
            alert("시험 데이터를 불러오는데 실패했습니다.");
        }
    }

    async function handleQuickStart() {
        // Preset: Latest 5 years, Official only, 20 questions
        if (availableYears.length > 0) {
            localEndYear = availableYears[availableYears.length - 1]; // Max
            localStartYear = Math.max(availableYears[0], localEndYear - 5);
        }
        $quizConfig.examTypes = ["official"];
        $quizConfig.selectedSubjects = [];
        $quizConfig.selectedCodes = [];
        $quizConfig.questionCount = 20;
        $quizConfig.shuffleOptions = true;
        $quizConfig.prioritizeUnseen = true;

        await handleStart();
    }

    $: totalQuestionsInScope = Object.values(taxonomyCounts).reduce(
        (a, b) => a + b,
        0,
    ); // Rough estimate, actually counts are per code.
    // Better total count: sum of root nodes
    $: validTotalCount = (() => {
        if (!taxonomyNodes.length && !showAdvanced) return 0; // If nodes not loaded, we can't acceptably sum.
        // Fallback: sum of category counts in examIndex
        // Reuse logic from previous implementation if robust
        // Or just use 'maxQuestions' logic
        let count = 0;
        if (examIndex.length > 0) {
            const relevantRounds = examIndex.filter((e) =>
                $quizConfig.selectedRounds.includes(e.round),
            );
            relevantRounds.forEach((r) => {
                const subjectData = r.subjects.find(
                    (s: any) => s.category === $quizConfig.category,
                );
                if (subjectData) count += subjectData.questionCount;
            });
        }
        return count;
    })();
</script>

<div class="min-h-screen p-6 pb-32 space-y-8">
    <!-- Header -->
    <header class="retro-window">
        <div class="retro-header">
            <span>📝 EXAM_SETUP.exe</span>
            <div class="flex gap-1">
                <div class="retro-btn-control">_</div>
                <div class="retro-btn-control">X</div>
            </div>
        </div>
        <div
            class="p-6 text-center bg-gray-50 bg-[linear-gradient(45deg,#00000005_1px,transparent_1px)] bg-[length:10px_10px]"
        >
            <h1 class="text-2xl font-pixel text-black tracking-widest">
                EXAM SETUP
            </h1>
            <p
                class="text-xs text-gray-400 font-mono mt-2 uppercase tracking-wide"
            >
                Configure your training vector
            </p>
        </div>
    </header>

    <!-- 2. Quick Start Card -->
    <div class="retro-window bg-[#E0F7FA] border-2 border-black">
        <div class="p-6 flex items-center justify-between">
            <div>
                <h2
                    class="font-bold text-lg text-black mb-1 flex items-center gap-2"
                >
                    <Zap size={20} class="text-[#fca311]" /> QUICK START
                </h2>
                <p class="text-xs text-slate-600 font-medium">
                    최근 5개년 • 20문제 • 랜덤 출제
                </p>
            </div>
            <button
                on:click={handleQuickStart}
                class="btn-retro bg-[#00BCD4] text-white px-6 py-3 font-bold text-sm flex items-center gap-2 shadow-[4px_4px_0px_#00838F]"
            >
                <Play size={16} fill="currentColor" /> RUN
            </button>
        </div>
    </div>

    <!-- 3. Detailed Settings -->
    <section class="retro-window bg-white">
        <div
            class="retro-header !bg-[#FFFF99] !text-black border-b-2 border-black"
        >
            <span class="font-bold text-xs px-2 bg-black text-white"
                >CUSTOM_CONFIG.ini</span
            >
        </div>

        <div class="p-6 space-y-8">
            <!-- 1. Category Tabs (Relocated) -->
            <div class="space-y-2">
                <h2 class="font-bold text-sm flex items-center gap-2">
                    <FolderTree size={16} /> CATEGORY
                </h2>
                <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {#each Object.keys(CATEGORY_MAP) as cat}
                        <button
                            class="flex-1 min-w-[80px] btn-retro transition-all
                                {$quizConfig.category === cat
                                ? 'bg-[#FF66CC] text-white translate-y-1'
                                : 'bg-white text-gray-500 hover:bg-gray-50'}"
                            on:click={() => {
                                $quizConfig.category = cat;
                                $quizConfig.selectedSubjects = []; // Reset sub-filters
                                $quizConfig.selectedCodes = [];
                            }}
                        >
                            {cat}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Year Range Slider -->
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <label class="text-sm font-bold flex items-center gap-2">
                        <BookOpen size={16} /> TARGET YEARS
                    </label>
                    <span
                        class="font-mono text-xs bg-black text-[#99FF99] px-2 py-1"
                    >
                        {localStartYear} ~ {localEndYear}
                    </span>
                </div>

                <div class="px-2 pt-4 pb-2 relative h-8">
                    {#if availableYears.length > 0}
                        <!-- Dual Thumb Slider Simulation -->
                        <input
                            type="range"
                            min={availableYears[0]}
                            max={availableYears[availableYears.length - 1]}
                            bind:value={localStartYear}
                            on:input={() => {
                                if (localStartYear > localEndYear)
                                    localStartYear = localEndYear;
                            }}
                            class="absolute w-full z-20 opacity-0 cursor-pointer pointer-events-none"
                        />
                        <input
                            type="range"
                            min={availableYears[0]}
                            max={availableYears[availableYears.length - 1]}
                            bind:value={localEndYear}
                            on:input={() => {
                                if (localEndYear < localStartYear)
                                    localEndYear = localStartYear;
                            }}
                            class="absolute w-full z-20 opacity-0 cursor-pointer pointer-events-none"
                        />

                        <!-- Visual Track -->
                        <div
                            class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-gray-200 rounded-full border border-black"
                        ></div>
                        <!-- Active Range -->
                        <div
                            class="absolute top-1/2 -translate-y-1/2 h-2 bg-[#FF66CC] border-y border-black"
                            style="left: {((localStartYear -
                                availableYears[0]) /
                                (availableYears[availableYears.length - 1] -
                                    availableYears[0])) *
                                100}%; right: {100 -
                                ((localEndYear - availableYears[0]) /
                                    (availableYears[availableYears.length - 1] -
                                        availableYears[0])) *
                                    100}%"
                        ></div>

                        <!-- Thumbs -->
                        <div
                            class="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.5)] pointer-events-none transform -translate-x-1/2 flex items-center justify-center"
                            style="left: {((localStartYear -
                                availableYears[0]) /
                                (availableYears[availableYears.length - 1] -
                                    availableYears[0])) *
                                100}%"
                        >
                            <div class="w-0.5 h-3 bg-gray-300"></div>
                        </div>
                        <div
                            class="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.5)] pointer-events-none transform -translate-x-1/2 flex items-center justify-center"
                            style="left: {((localEndYear - availableYears[0]) /
                                (availableYears[availableYears.length - 1] -
                                    availableYears[0])) *
                                100}%"
                        >
                            <div class="w-0.5 h-3 bg-gray-300"></div>
                        </div>
                    {/if}
                </div>

                <!-- Exam Types -->
                <div class="flex gap-2 justify-end">
                    <button
                        on:click={() => toggleExamType("official")}
                        class="px-2 py-1 text-[10px] border border-black transition-all {$quizConfig.examTypes?.includes(
                            'official',
                        )
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-500'}">변호사시험</button
                    >
                    <button
                        on:click={() => toggleExamType("mock")}
                        class="px-2 py-1 text-[10px] border border-black transition-all {$quizConfig.examTypes?.includes(
                            'mock',
                        )
                            ? 'bg-black text-white'
                            : 'bg-white text-gray-500'}">모의고사</button
                    >
                </div>
            </div>

            <!-- Subjects Grid -->
            <div class="space-y-2">
                <h2 class="font-bold text-sm flex items-center gap-2">
                    <Sparkles size={16} /> SUBJECTS
                </h2>
                <div class="flex flex-wrap gap-2">
                    {#each availableSubjects as subject}
                        <button
                            class="px-3 py-2 border-2 border-black font-bold text-xs transition-all
                                   {$quizConfig.selectedSubjects?.includes(
                                subject,
                            )
                                ? 'bg-[#66CCFF] text-white shadow-[2px_2px_0px_#000]'
                                : 'bg-white text-gray-500 hover:bg-gray-50 shadow-[2px_2px_0px_#ccc]'}"
                            on:click={() => toggleSubject(subject)}
                        >
                            {subject}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Question Count -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <h2 class="font-bold text-sm text-black">QUESTIONS</h2>
                    <span class="pixel-tag bg-[#FF66CC] text-white"
                        >{$quizConfig.questionCount}</span
                    >
                </div>
                <input
                    type="range"
                    min="5"
                    max={validTotalCount > 0 ? validTotalCount : 50}
                    step="5"
                    bind:value={$quizConfig.questionCount}
                    class="w-full h-4 bg-gray-200 rounded-none appearance-none border-2 border-black cursor-pointer accent-[#FF66CC] relative z-10"
                />
                <div class="text-right text-[10px] text-gray-400 font-mono">
                    Pool Size: {validTotalCount} Q
                </div>
            </div>

            <!-- Start Button (Custom) -->
            <button
                class="w-full btn-retro btn-retro-pink flex items-center justify-center gap-3 py-4 text-lg"
                on:click={handleStart}
            >
                <Zap size={24} />
                <span class="tracking-widest">START CUSTOM QUIZ</span>
            </button>
        </div>
    </section>

    <!-- 4. Advanced Filter (Accordion) -->
    <section class="retro-window">
        <button
            class="w-full retro-header !bg-[#333] !text-white !border-b-0 hover:bg-[#444] transition-colors flex justify-between items-center px-4"
            on:click={() => {
                showAdvanced = !showAdvanced;
                if (showAdvanced && !taxonomyNodes.length) loadTaxonomyTree();
            }}
        >
            <div class="flex items-center gap-2">
                <Sliders size={16} class="text-[#99FF99]" />
                <span class="tracking-wide text-xs"
                    >ADVANCED FILTERS (TAXONOMY)</span
                >
            </div>
            <ChevronRight
                size={16}
                class="transition-transform {showAdvanced ? 'rotate-90' : ''}"
            />
        </button>

        {#if showAdvanced}
            <div
                transition:slide
                class="p-4 bg-white border-t-2 border-black max-h-[400px] overflow-y-auto custom-scrollbar"
            >
                {#if loadingTaxonomy}
                    <div
                        class="text-center py-8 text-xs font-bold text-gray-400 animate-pulse"
                    >
                        LOADING DATA STRUCTURE...
                    </div>
                {:else if taxonomyNodes.length === 0}
                    <div
                        class="text-center py-8 text-xs font-bold text-gray-400"
                    >
                        No sub-categories available for current selection.
                    </div>
                {:else}
                    <div class="space-y-px">
                        {#each taxonomyNodes as node}
                            <button
                                class="w-full text-left flex items-center gap-2 pr-2 py-1.5 hover:bg-[#FFF0F5] transition-colors group relative border-l-2 border-transparent hover:border-[#FF66CC]"
                                style="padding-left: {(node.depth - 1) * 20 +
                                    8}px"
                                on:click={() => toggleCode(node.code)}
                            >
                                {#if node.depth > 1}
                                    <div
                                        class="absolute left-0 top-0 bottom-0 border-l border-gray-100 border-dashed"
                                        style="left: {(node.depth - 2) * 20 +
                                            10}px"
                                    ></div>
                                {/if}

                                <div class="relative">
                                    {#if $quizConfig.selectedCodes?.includes(node.code)}
                                        <div
                                            class="bg-[#FF66CC] text-white p-0.5 border border-black shadow-[1px_1px_0_#000]"
                                        >
                                            <CheckSquare size={12} />
                                        </div>
                                    {:else}
                                        <div
                                            class="bg-white text-gray-300 p-0.5 border border-gray-300 group-hover:border-[#FF66CC] transition-colors"
                                        >
                                            <Square size={12} />
                                        </div>
                                    {/if}
                                </div>

                                <span
                                    class="text-xs font-bold truncate flex-1 {node.depth ===
                                    1
                                        ? 'text-black'
                                        : 'text-gray-600'}"
                                >
                                    {node.name}
                                    <span
                                        class="text-[10px] text-gray-400 font-mono ml-1 font-normal"
                                        >({getNodeCount(node.code)})</span
                                    >
                                </span>
                            </button>
                        {/each}
                        <div class="pt-4 text-center">
                            <button
                                class="text-[10px] underline text-gray-400 hover:text-red-500"
                                on:click={() =>
                                    ($quizConfig.selectedCodes = [])}
                            >
                                CLEAR ALL FILTERS
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </section>
</div>

<style>
    /* Slider Customization */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        pointer-events: auto; /* Allow dragging */
        width: 20px;
        height: 20px;
        background: transparent;
        cursor: pointer;
        border-radius: 50%; /* Improve touch targeting */
    }

    input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        width: 20px;
        height: 20px;
        background: transparent;
        cursor: pointer;
        border: none;
    }
</style>
