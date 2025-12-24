<script lang="ts">
    import { quizConfig, quizSession } from "$lib/stores";
    import { CATEGORY_MAP, getRoundName } from "$lib/config";
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
        Folder,
    } from "lucide-svelte";

    // Reactive: Category subjects
    $: categoryInfo = CATEGORY_MAP[$quizConfig.category];
    $: availableSubjects = categoryInfo?.subjects || [];

    // Taxonomy Tree State
    let taxonomyNodes: FlatTaxonomyNode[] = [];
    let loadingTaxonomy = false;
    let showAdvanced = false;

    // Question count options
    const countOptions = [10, 20, 30, 40, 50];

    onMount(() => {
        // Ensure client-side mounting is fine
        console.log("Settings Page Mounted");

        // Load Dynamic Exam Index
        fetch("/data/exam_index.json")
            .then((res) => res.json())
            .then((data) => {
                examIndex = data;
                // Default selection if empty
                if (
                    !$quizConfig.selectedRounds ||
                    $quizConfig.selectedRounds.length === 0
                ) {
                    // Auto-select latest year
                    if (examIndex.length > 0) {
                        const latestYear = Math.max(
                            ...examIndex.map((i) => parseInt(i.year)),
                        );
                        selectedYears = [latestYear];
                        updateSelectedRounds();
                    }
                } else {
                    // Parse existing selection
                    const years = new Set<number>();
                    const types = new Set<string>();

                    $quizConfig.selectedRounds.forEach((r) => {
                        // Attempt to reverse engineer year/type from round name
                        // This logic is heuristic as round names are constructed
                        const entry = examIndex.find((e) => e.round === r);
                        if (entry) {
                            years.add(parseInt(entry.year));
                            types.add(entry.type);
                        } else {
                            // Fallback for simple numeric parsing if index lookup fails
                            const match = r.match(/^(\d+)회/);
                            if (match) years.add(parseInt(match[1]) + 2011);
                        }
                    });
                    selectedYears = Array.from(years);
                    if (types.size > 0) selectedTypes = Array.from(types);
                }
            })
            .catch((err) => console.error("Failed to load exam index", err));
    });

    // Toggle subject selection
    function toggleSubject(subject: string) {
        if ($quizConfig.selectedSubjects.includes(subject)) {
            $quizConfig.selectedSubjects = $quizConfig.selectedSubjects.filter(
                (s) => s !== subject,
            );
        } else {
            $quizConfig.selectedSubjects = [
                ...$quizConfig.selectedSubjects,
                subject,
            ];
        }
        // Sub-subjects changed, reload taxonomy if advanced mode is on
        if (showAdvanced) loadTaxonomyTree();
    }

    // New Refs
    // Dynamic Data
    let examIndex: any[] = []; // Loaded from JSON
    let selectedYears: number[] = [];
    let selectedTypes: string[] = ["official"];

    // Range Selection State
    let startYear: number;
    let endYear: number;

    // Taxonomy Counts State
    let taxonomyCounts: Record<string, number> = {};

    // Compute available years and types from index
    $: availableYears = Array.from(
        new Set(examIndex.map((e) => parseInt(e.year))),
    ).sort((a, b) => b - a); // Descending

    // Initialize Range when availableYears is populated
    $: if (availableYears.length > 0 && typeof startYear === "undefined") {
        startYear = Math.min(...availableYears);
        endYear = Math.max(...availableYears);
        applyYearRange();
    }

    function applyYearRange() {
        if (typeof startYear === "undefined" || typeof endYear === "undefined")
            return;
        const min = Math.min(startYear, endYear);
        const max = Math.max(startYear, endYear);
        selectedYears = availableYears.filter((y) => y >= min && y <= max);
        updateSelectedRounds();
        updateTaxonomyCounts();
    }

    $: maxQuestions = (() => {
        let count = 0;
        // Calculate total questions available in selected scope
        if (examIndex.length > 0) {
            const relevantRounds = examIndex.filter(
                (e) =>
                    selectedYears.includes(parseInt(e.year)) &&
                    selectedTypes.includes(e.type || "official"),
            );

            relevantRounds.forEach((r) => {
                const subjectData = r.subjects.find(
                    (s: any) => s.category === $quizConfig.category,
                );
                if (subjectData) count += subjectData.questionCount;
            });
        }
        return count > 0 ? count : 50; // Fallback
    })();

    // Auto-clamp question count if max changes
    $: if ($quizConfig.questionCount > maxQuestions) {
        $quizConfig.questionCount = maxQuestions;
    }

    // Calculate Taxonomy Counts
    function updateTaxonomyCounts() {
        const counts: Record<string, number> = {};

        if (examIndex.length > 0) {
            const relevantRounds = examIndex.filter(
                (e) =>
                    selectedYears.includes(parseInt(e.year)) &&
                    selectedTypes.includes(e.type || "official"),
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

    // Get count for a node (including descendants)
    function getNodeCount(code: string): number {
        // Check exact match first
        // But better to sum up all keys that start with code
        return Object.entries(taxonomyCounts)
            .filter(([k, v]) => k === code || k.startsWith(code + "_"))
            .reduce((sum, [k, v]) => sum + v, 0);
    }

    // Update counts when category or selection changes
    $: if ($quizConfig.category || selectedYears || selectedTypes) {
        updateTaxonomyCounts();
    }

    function toggleYear(year: number) {
        if (selectedYears.includes(year)) {
            selectedYears = selectedYears.filter((y) => y !== year);
        } else {
            selectedYears = [...selectedYears, year];
        }
        updateSelectedRounds();
    }

    function toggleType(typeId: string) {
        if (selectedTypes.includes(typeId)) {
            selectedTypes = selectedTypes.filter((t) => t !== typeId);
        } else {
            selectedTypes = [...selectedTypes, typeId];
        }
        updateSelectedRounds();
    }

    function updateSelectedRounds() {
        // Generate rounds based on intersection of Year/Type and Available Index
        if (examIndex.length === 0) return;

        const rounds: string[] = [];
        examIndex.forEach((e) => {
            const y = parseInt(e.year);
            const t = e.type || "official";
            if (selectedYears.includes(y) && selectedTypes.includes(t)) {
                rounds.push(e.round);
            }
        });

        $quizConfig.selectedRounds = rounds;
    }

    function toggleShuffle() {
        $quizConfig.shuffleOptions = !$quizConfig.shuffleOptions;
    }

    // Load Taxonomy Tree
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

    // Toggle advanced mode
    function toggleAdvanced() {
        showAdvanced = !showAdvanced;
        if (showAdvanced && taxonomyNodes.length === 0) {
            loadTaxonomyTree();
        }
    }

    // Toggle taxonomy code (Recursive)
    function toggleCode(code: string) {
        // Find descendants
        const descendants = taxonomyNodes
            .filter((n) => n.code.startsWith(code + "_"))
            .map((n) => n.code);

        const targets = [code, ...descendants];
        const isSelected = $quizConfig.selectedCodes.includes(code);

        if (isSelected) {
            // Remove code and all descendants
            $quizConfig.selectedCodes = $quizConfig.selectedCodes.filter(
                (c) => !targets.includes(c),
            );
        } else {
            // Add code and all descendants
            const newCodes = new Set([
                ...$quizConfig.selectedCodes,
                ...targets,
            ]);
            $quizConfig.selectedCodes = Array.from(newCodes);
        }
    }

    // Start quiz
    async function handleStart() {
        if ($quizConfig.selectedRounds.length === 0) {
            alert("최소 1개 이상의 회차를 선택해주세요.");
            return;
        }

        try {
            const examData = await loadMultipleExams(
                $quizConfig.selectedRounds,
                $quizConfig.category,
            );

            $quizSession = {
                config: { ...$quizConfig },
                examData,
                startTime: Date.now(),
                currentIndex: 0,
                answers: {},
            };

            goto("/quiz");
        } catch (e) {
            console.error("Failed to load exam data", e);
            alert("시험 데이터를 불러오는데 실패했습니다.");
        }
    }
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Header -->
    <header class="retro-window">
        <!-- New Neo-Pixel Dark Header from app.css -->
        <div class="retro-header">
            <span>⚙️ SETTINGS.exe</span>
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

    <!-- Category (Tab Style) -->
    <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {#each Object.keys(CATEGORY_MAP) as cat}
            <button
                class="flex-1 min-w-[80px] btn-retro transition-all
                       {$quizConfig.category === cat
                    ? 'bg-[#FF66CC] text-white translate-y-1'
                    : 'bg-white text-gray-500 hover:bg-gray-50'}"
                on:click={() => {
                    $quizConfig.category = cat;
                    $quizConfig.selectedSubjects = [];
                    $quizConfig.selectedCodes = [];
                    if (showAdvanced) loadTaxonomyTree();
                }}
            >
                {cat}
            </button>
        {/each}
    </div>

    <!-- Main Settings Window -->
    <section class="retro-window">
        <!-- Header text changed to white as requested -->
        <div class="retro-header !bg-[#FFFF99] !text-black !border-b-2">
            <span class="!text-white bg-black px-2">📝 BASIC_OPTIONS.ini</span>
        </div>

        <div class="p-4 space-y-6 bg-white">
            <!-- Subjects -->
            <div class="space-y-2">
                <div class="flex items-center gap-2">
                    <Sparkles size={16} class="text-[#66CCFF]" />
                    <h2 class="font-bold text-sm">SUBJECTS</h2>
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each availableSubjects as subject}
                        <!-- ... subjects ... -->
                        <button
                            class="px-3 py-1 border-2 border-black font-bold text-xs transition-all
                                   {$quizConfig.selectedSubjects.includes(
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

            <!-- Exam Configuration (Years & Types) -->
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <Settings2 size={16} class="text-[#99FF99]" />
                    <h2 class="font-bold text-sm">EXAM SCOPE</h2>
                </div>

                <!-- 1. Mock Toggle -->
                <div
                    class="flex items-center justify-between p-3 border-2 border-black bg-gray-50"
                >
                    <span class="font-bold text-xs">INCLUDE MOCK EXAMS</span>
                    <button
                        aria-label="Toggle Mock Exams"
                        class="w-12 h-6 border-2 border-black relative transition-colors {selectedTypes.includes(
                            'mock',
                        )
                            ? 'bg-[#FF66CC]'
                            : 'bg-white'}"
                        on:click={() => toggleType("mock")}
                    >
                        <div
                            class="absolute top-0.5 bottom-0.5 w-4 bg-black transition-transform {selectedTypes.includes(
                                'mock',
                            )
                                ? 'left-[calc(100%-1.25rem)]'
                                : 'left-0.5'}"
                        ></div>
                    </button>
                </div>

                <!-- 2. Years Filter (Range Sliders & Grid) -->
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <label
                            class="text-sm font-bold flex items-center gap-2"
                        >
                            <BookOpen size={16} />
                            TARGET YEARS RANGE
                        </label>
                        <span
                            class="font-mono text-xs bg-black text-[#99FF99] px-2 py-1"
                        >
                            {startYear} ~ {endYear}
                        </span>
                    </div>

                    <!-- Range Sliders -->
                    <div class="space-y-6 px-1">
                        <!-- From Slider -->
                        <div class="relative">
                            <input
                                type="range"
                                min={Math.min(...availableYears)}
                                max={Math.max(...availableYears)}
                                step="1"
                                bind:value={startYear}
                                on:input={() => {
                                    if (startYear > endYear)
                                        endYear = startYear;
                                    applyYearRange();
                                }}
                                class="w-full absolute top-0 left-0 z-20 opacity-100"
                            />
                            <div
                                class="flex justify-between text-[10px] font-mono text-gray-400 mt-5"
                            >
                                <span>FROM: {startYear}</span>
                            </div>
                        </div>

                        <!-- To Slider -->
                        <div class="relative">
                            <input
                                type="range"
                                min={Math.min(...availableYears)}
                                max={Math.max(...availableYears)}
                                step="1"
                                bind:value={endYear}
                                on:input={() => {
                                    if (endYear < startYear)
                                        startYear = endYear;
                                    applyYearRange();
                                }}
                                class="w-full"
                            />
                            <div
                                class="flex justify-between text-[10px] font-mono text-gray-400"
                            >
                                <span>TO: {endYear}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Count -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <h2 class="font-bold text-sm">QUESTIONS</h2>
                        <span class="pixel-tag bg-[#FF66CC] text-white"
                            >{$quizConfig.questionCount}</span
                        >
                    </div>
                    <input
                        type="range"
                        min="10"
                        max={maxQuestions}
                        step="5"
                        bind:value={$quizConfig.questionCount}
                        class="w-full h-4 bg-gray-200 rounded-none appearance-none border-2 border-black cursor-pointer accent-[#FF66CC]"
                    />
                    <div
                        class="flex justify-between text-[10px] font-bold text-gray-400"
                    >
                        <span>10</span><span>{maxQuestions}</span>
                    </div>
                </div>

                <!-- Options -->
                <div
                    class="space-y-2 pt-2 border-t border-dashed border-gray-300"
                >
                    <div class="flex items-center justify-between">
                        <h2 class="font-bold text-sm">OPTIONS</h2>
                    </div>

                    <button
                        class="w-full flex items-center justify-between p-3 border-2 border-black bg-white active:translate-y-0.5 active:shadow-none transition-all
                           {$quizConfig.shuffleOptions
                            ? 'shadow-[4px_4px_0px_#FF66CC]'
                            : 'shadow-[4px_4px_0px_#ccc]'}"
                        on:click={toggleShuffle}
                    >
                        <div class="text-left">
                            <div class="font-bold text-xs">SHUFFLE OPTIONS</div>
                            <div class="text-[10px] text-gray-500">
                                Randomize 1-5 order
                            </div>
                        </div>
                        <div
                            class="w-4 h-4 border-2 border-black {$quizConfig.shuffleOptions
                                ? 'bg-[#FF66CC]'
                                : 'bg-white'}"
                        ></div>
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Advanced Filter (Taxonomy) -->
    <section class="retro-window">
        <button
            class="w-full retro-header !bg-[#333] !text-white !border-b-0 hover:bg-[#444] transition-colors"
            on:click={toggleAdvanced}
        >
            <div class="flex items-center gap-2">
                <FolderTree size={16} class="text-[#99FF99]" />
                <span class="tracking-wide">ADVANCED FILTER</span>
            </div>
            <ChevronRight
                size={16}
                class="transition-transform {showAdvanced ? 'rotate-90' : ''}"
            />
        </button>

        {#if showAdvanced}
            <div
                class="p-4 bg-white border-t-2 border-black max-h-[400px] overflow-y-auto custom-scrollbar"
            >
                {#if loadingTaxonomy}
                    <div
                        class="text-center py-8 text-xs font-bold text-gray-400 animate-pulse flex flex-col items-center gap-2"
                    >
                        <FolderTree size={24} class="opacity-50" />
                        <span>LOADING DATA_STRUCTURE...</span>
                    </div>
                {:else if taxonomyNodes.length === 0}
                    <div
                        class="text-center py-8 text-xs font-bold text-gray-400"
                    >
                        Select a category and subject above to load hierarchy.
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
                                <!-- Indentation Guide Lines -->
                                {#if node.depth > 1}
                                    <div
                                        class="absolute left-0 top-0 bottom-0 border-l border-gray-100 border-dashed"
                                        style="left: {(node.depth - 2) * 20 +
                                            10}px"
                                    ></div>
                                {/if}

                                <!-- Checkbox -->
                                <div class="relative">
                                    {#if $quizConfig.selectedCodes.includes(node.code)}
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

                                <!-- Icon based on depth/type -->
                                {#if node.depth < 3}
                                    <FolderTree
                                        size={14}
                                        class="text-[#66CCFF]"
                                    />
                                {:else}
                                    <FileText size={14} class="text-gray-400" />
                                {/if}

                                <!-- Text -->
                                <span
                                    class="text-xs font-bold truncate flex-1 {node.depth ===
                                    1
                                        ? 'text-black text-sm'
                                        : 'text-gray-600'}"
                                >
                                    {node.name}
                                    <span
                                        class="text-[10px] text-gray-400 font-mono ml-1 font-normal"
                                        >({getNodeCount(node.code)})</span
                                    >
                                </span>

                                <!-- Count Badge (Mock) -->
                                {#if node.depth === 1}
                                    <span
                                        class="text-[9px] bg-gray-100 px-1 rounded text-gray-400 font-pixel"
                                        >DIR</span
                                    >
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </section>

    <!-- Start Button -->
    <button
        class="w-full btn-retro btn-retro-pink flex items-center justify-center gap-3 py-4 text-lg mb-8"
        on:click={handleStart}
    >
        <Zap size={24} />
        <span class="tracking-widest">START!</span>
    </button>
</div>

<style>
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 20px;
        width: 10px;
        background: #ff66cc;
        border: 2px solid black;
        box-shadow: 2px 2px 0px #000;
        cursor: pointer;
        margin-top: -8px;
    }
    input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        cursor: pointer;
        background: #000;
        border-radius: 0;
        border: none;
    }
</style>
