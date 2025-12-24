<script lang="ts">
    import {
        wrongNotes,
        quizSession,
        quizHistory,
        questionMemos,
    } from "$lib/stores";
    import { isCorrectAnswer } from "$lib/logic/quizEngine";
    import { getCodePath, loadMasterCodes } from "$lib/db";
    import { getFlatTaxonomyForCategory } from "$lib/db/taxonomy";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import {
        Trash2,
        CheckCircle2,
        ChevronDown,
        ChevronUp,
        BookOpen,
        Sparkles,
        Award,
        Zap,
        Filter,
        X,
        Sliders,
        CheckSquare,
        Square,
        Search,
    } from "lucide-svelte";
    import type { WrongNote } from "$lib/types";
    import { getQuickReviewQuestions } from "$lib/logic/quickReview";
    import TaxonomyBreadcrumb from "$lib/components/TaxonomyBreadcrumb.svelte";
    import type { FlatTaxonomyNode } from "$lib/db/taxonomy";

    let subjectPaths: Record<string, string> = {};
    let expandedQuestions: Set<number> = new Set();
    let filter: "active" | "graduated" = "active";

    // New filters
    let subjectFilter: string = "all"; // 'all' | '공법' | '민사법' | '형사법'
    let sourceFilter: string = "all"; // 'all' | specific exam name
    let codeFilter: string = "all"; // 'all' | taxonomy code
    let codeName: string = ""; // Display name for the code filter
    const subjects = ["공법", "민사법", "형사법"];

    // Taxonomy Tree State
    let taxonomyNodes: FlatTaxonomyNode[] = [];
    let loadingTaxonomy = false;
    let showAdvanced = false;
    let taxonomyCounts: Record<string, number> = {};

    onMount(async () => {
        migrateExistingNotes();
        loadSubjectPaths();
        loadTaxonomyTree();
    });

    async function loadTaxonomyTree() {
        loadingTaxonomy = true;
        try {
            // Load for all subjects in the category
            // Our app has MIXED or specific subjects. Let's just load everything for now
            // or based on current wrong notes' subjects.
            const uniqueSubjects = [
                ...new Set(
                    allWrongNotesFromLogs.map((n) => n.subject).filter(Boolean),
                ),
            ];
            let allNodes: FlatTaxonomyNode[] = [];
            for (const subj of uniqueSubjects) {
                const nodes = await getFlatTaxonomyForCategory(subj);
                allNodes = [...allNodes, ...nodes];
            }
            // Remove duplicates if any
            const seenCodes = new Set();
            taxonomyNodes = allNodes.filter((n) => {
                if (seenCodes.has(n.code)) return false;
                seenCodes.add(n.code);
                return true;
            });
        } catch (e) {
            console.error("Failed to load taxonomy", e);
        } finally {
            loadingTaxonomy = false;
        }
    }

    /**
     * One-time migration: Move standalone wrongNotes data to centralization
     */
    function migrateExistingNotes() {
        if ($wrongNotes.length > 0) {
            console.log(
                "Migrating existing wrong notes to centralized memos...",
            );
            const memos = { ...$questionMemos };
            let updated = false;

            $wrongNotes.forEach((note) => {
                if (!memos[note.id]) {
                    memos[note.id] = {
                        memo: note.memo || "",
                        wrongCount: note.wrongCount || 1,
                        lastWrongDate: note.lastWrongDate || Date.now(),
                        consecutiveCorrect: note.consecutiveCorrect || 0,
                        isGraduated: note.isGraduated || false,
                    };
                    updated = true;
                }
            });

            if (updated) {
                $questionMemos = memos;
            }
            // We keep $wrongNotes for now but logically we will favor logs.
            // In a future update, we could empty $wrongNotes.
        }
    }

    async function loadSubjectPaths() {
        // Use all unique questions from history/memos to load paths
        const allRelevantQuestions = allWrongNotesFromLogs;
        for (const q of allRelevantQuestions) {
            for (const code of q.subjects) {
                if (!subjectPaths[code]) {
                    subjectPaths[code] = await getCodePath(code);
                }
            }
        }
        subjectPaths = subjectPaths;
    }

    function toggleQuestion(id: number) {
        expandedQuestions.has(id)
            ? expandedQuestions.delete(id)
            : expandedQuestions.add(id);
        expandedQuestions = expandedQuestions;
    }

    function markAsGraduated(note: WrongNote) {
        if ($questionMemos[note.id]) {
            $questionMemos[note.id].isGraduated = true;
            $questionMemos[note.id].consecutiveCorrect = 3;
            $questionMemos = $questionMemos;
        }
    }

    function restoreNote(note: WrongNote) {
        if ($questionMemos[note.id]) {
            $questionMemos[note.id].isGraduated = false;
            $questionMemos[note.id].consecutiveCorrect = 0;
            $questionMemos = $questionMemos;
        }
    }

    function removeNote(note: WrongNote) {
        if (
            confirm(
                "정말 이 오답 기록을 삭제하시겠습니까?\n(해당 시험 로그가 삭제되면 자동으로 사라집니다)",
            )
        ) {
            // Log-based recommendation usually means deleting the log,
            // but we can "hide" it by marking as graduated or removing from memos if desired.
            // For now, let's allow removing from memos which effectively resets stats.
            if ($questionMemos[note.id]) {
                delete $questionMemos[note.id];
                $questionMemos = $questionMemos;
            }
        }
    }

    let sortMode: "recent_added" | "oldest_review" = "oldest_review";

    /**
     * Derive wrong notes from quizHistory
     */
    $: allWrongNotesFromLogs = (() => {
        const notesMap = new Map<number, WrongNote>();

        // 1. Process logs in chronological order (older first, so newer overwrites)
        [...$quizHistory]
            .sort((a, b) => a.timestamp - b.timestamp)
            .forEach((record) => {
                record.questions.forEach((q, idx) => {
                    const userAnswer = record.answers[idx];
                    if (
                        userAnswer !== undefined &&
                        !isCorrectAnswer(q, userAnswer)
                    ) {
                        const memoInfo = $questionMemos[q.id];
                        const note: WrongNote = {
                            ...q,
                            timestamp: record.timestamp,
                            wrongCount: memoInfo?.wrongCount || 1,
                            consecutiveCorrect:
                                memoInfo?.consecutiveCorrect || 0,
                            lastWrongDate:
                                memoInfo?.lastWrongDate || record.timestamp,
                            isGraduated: memoInfo?.isGraduated || false,
                            memo: memoInfo?.memo || "",
                            // Use latest available info
                            exam_name:
                                q.examInfo?.examName ||
                                q.exam_title ||
                                record.round,
                            year: q.examInfo?.examYear || q.exam_year || "",
                            subject:
                                q.examInfo?.category ||
                                q.subject_category ||
                                record.category,
                        };
                        notesMap.set(q.id, note);
                    }
                });
            });

        return Array.from(notesMap.values());
    })();

    /**
     * Update taxonomy counts based on the current pool of wrong notes (ignoring code filter)
     */
    $: {
        const counts: Record<string, number> = {};
        allWrongNotesFromLogs
            .filter((n) =>
                filter === "active" ? !n.isGraduated : n.isGraduated,
            )
            .filter((n) => {
                const matchSubject =
                    subjectFilter === "all" ||
                    n.examInfo?.category === subjectFilter ||
                    n.subject === subjectFilter;

                const examName =
                    n.examInfo?.examName || n.exam_name || n.examInfo?.round;
                const matchSource =
                    sourceFilter === "all" || examName === sourceFilter;

                return matchSubject && matchSource;
            })
            .forEach((n) => {
                n.subjects.forEach((code) => {
                    // Count for this code and all its parents
                    const parts = code.split("_");
                    for (let i = 1; i <= parts.length; i++) {
                        const ancestor = parts.slice(0, i).join("_");
                        counts[ancestor] = (counts[ancestor] || 0) + 1;
                    }
                });
            });
        taxonomyCounts = counts;
    }

    // Enhanced filtering with subject, source, and code filter
    $: filteredNotes = allWrongNotesFromLogs
        .filter((n) => (filter === "active" ? !n.isGraduated : n.isGraduated))
        .filter((n) => {
            const matchSubject =
                subjectFilter === "all" ||
                n.examInfo?.category === subjectFilter ||
                n.subject === subjectFilter;

            const examName =
                n.examInfo?.examName || n.exam_name || n.examInfo?.round;
            const matchSource =
                sourceFilter === "all" || examName === sourceFilter;

            const matchCode =
                codeFilter === "all" ||
                n.subjects.some(
                    (c) => c === codeFilter || c.startsWith(codeFilter + "_"),
                );

            return matchSubject && matchSource && matchCode;
        })
        .sort((a, b) => {
            if (sortMode === "oldest_review") {
                const dateA = a.lastReviewDate || 0;
                const dateB = b.lastReviewDate || 0;
                return dateA - dateB;
            } else {
                return b.timestamp - a.timestamp;
            }
        });

    $: activeCount = allWrongNotesFromLogs.filter((n) => !n.isGraduated).length;
    $: graduatedCount = allWrongNotesFromLogs.filter(
        (n) => n.isGraduated,
    ).length;

    // Dynamic header based on filter
    $: headerTitle = (() => {
        let title = "오답노트";
        if (codeFilter !== "all") {
            title = codeName || "분류 필터";
        } else if (subjectFilter !== "all" && sourceFilter !== "all") {
            title = `${subjectFilter} - ${sourceFilter}`;
        } else if (subjectFilter !== "all") {
            title = `오답노트 - ${subjectFilter}`;
        } else if (sourceFilter !== "all") {
            title = `오답노트 - ${sourceFilter}`;
        }
        return title;
    })();

    function toggleSubject(subj: string) {
        if (subjectFilter === subj) {
            subjectFilter = "all";
        } else {
            subjectFilter = subj;
        }
    }

    function toggleSource(src: string) {
        if (sourceFilter === src) {
            sourceFilter = "all";
        } else {
            sourceFilter = src;
        }
    }

    function toggleCode(code: string, name: string) {
        if (codeFilter === code) {
            codeFilter = "all";
            codeName = "";
        } else {
            codeFilter = code;
            codeName = name;
        }
    }

    function handleBreadcrumbSelect(
        event: CustomEvent<{ name: string; code: string }>,
    ) {
        const { name, code } = event.detail;
        // Search for the specific segment's code if possible, but for now let's use the full code or name
        // Ideally we want to find the code that corresponds to the segment name.
        // Let's look through taxonomyNodes to find a match for name within the path of 'code'
        const targetNode = taxonomyNodes.find(
            (n) => n.name === name && code.startsWith(n.code),
        );
        if (targetNode) {
            toggleCode(targetNode.code, targetNode.name);
        } else {
            // Fallback: toggle the whole code if segment not uniquely found
            toggleCode(code, name);
        }
    }

    // Get unique exam names for display
    $: examNames = [
        ...new Set(
            filteredNotes
                .map(
                    (n) =>
                        n.examInfo?.examName ||
                        n.exam_name ||
                        n.examInfo?.round,
                )
                .filter(Boolean),
        ),
    ];

    // Quick Review function
    function startQuickReview() {
        const reviewQuestions = getQuickReviewQuestions(allWrongNotesFromLogs, {
            subjectFilter: subjectFilter,
            count: 5,
        });

        if (reviewQuestions.length === 0) {
            alert("복습할 문제가 없습니다.");
            return;
        }

        // Set quiz session with review questions
        $quizSession = {
            config: {
                category: subjectFilter === "all" ? "MIXED" : subjectFilter,
                round: "REVIEW",
            },
            questions: reviewQuestions,
            isReview: true, // Flag for review mode
        };

        goto("/quiz");
    }
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Header -->
    <header class="retro-window">
        <div class="retro-header !bg-[#FF6666]">
            <span>📚 {headerTitle}</span>
        </div>
        <div class="p-4 text-center bg-[#FFF0F0]">
            <h1 class="text-2xl font-pixel text-[#FF6666] animate-pulse">
                {headerTitle}
            </h1>
            {#if examNames.length > 0}
                <p class="text-xs font-bold text-gray-500 mt-1">
                    {examNames.slice(0, 3).join(", ")}{examNames.length > 3
                        ? ` 외 ${examNames.length - 3}개`
                        : ""}
                </p>
            {:else}
                <p class="text-xs font-bold text-gray-500 mt-1">
                    Turn your weakness into strength
                </p>
            {/if}
        </div>
    </header>

    <!-- Quick Review Button -->
    <button
        class="w-full btn-retro btn-retro-pink py-4 text-lg font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] transition-transform"
        on:click={startQuickReview}
        disabled={activeCount === 0}
    >
        <Zap size={24} />
        빠른 복습 (5문제)
    </button>

    <!-- Subject Filter -->
    <div class="flex gap-2 overflow-x-auto pb-2">
        <button
            class="shrink-0 btn-retro text-xs px-4 py-2 flex items-center gap-1
                   {subjectFilter === 'all' &&
            sourceFilter === 'all' &&
            codeFilter === 'all'
                ? 'bg-[#333] text-white'
                : 'bg-white text-gray-600'}"
            on:click={() => {
                subjectFilter = "all";
                sourceFilter = "all";
                codeFilter = "all";
                codeName = "";
            }}
        >
            <Filter size={12} /> 전체 초기화
        </button>
        {#each subjects as subj}
            <button
                class="shrink-0 btn-retro text-xs px-4 py-2
                       {subjectFilter === subj
                    ? 'bg-[#FF6666] text-white'
                    : 'bg-white text-gray-600'}"
                on:click={() => toggleSubject(subj)}
            >
                {subj}
            </button>
        {/each}
    </div>

    <!-- Active Filter Chips -->
    {#if subjectFilter !== "all" || sourceFilter !== "all" || codeFilter !== "all"}
        <div class="flex flex-wrap gap-2 px-1">
            {#if subjectFilter !== "all"}
                <div
                    class="flex items-center gap-1 bg-[#FF6666] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm"
                >
                    {subjectFilter}
                    <button
                        on:click={() => (subjectFilter = "all")}
                        class="hover:text-black"
                    >
                        <X size={10} />
                    </button>
                </div>
            {/if}
            {#if sourceFilter !== "all"}
                <div
                    class="flex items-center gap-1 bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm"
                >
                    {sourceFilter}
                    <button
                        on:click={() => (sourceFilter = "all")}
                        class="hover:text-black"
                    >
                        <X size={10} />
                    </button>
                </div>
            {/if}
            {#if codeFilter !== "all"}
                <div
                    class="flex items-center gap-1 bg-[#FF66CC] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm"
                >
                    {codeName}
                    <button
                        on:click={() => {
                            codeFilter = "all";
                            codeName = "";
                        }}
                        class="hover:text-black"
                    >
                        <X size={10} />
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Advanced Filter (Accordion) -->
    <section class="retro-window">
        <button
            class="w-full retro-header !bg-[#333] !text-white !border-b-0 hover:bg-[#444] transition-colors flex justify-between items-center px-4 py-2"
            on:click={() => {
                showAdvanced = !showAdvanced;
            }}
        >
            <div class="flex items-center gap-2">
                <Sliders size={14} class="text-[#99FF99]" />
                <span class="tracking-wide text-[10px]"
                    >상세 분류 필터 (Taxonomy)</span
                >
            </div>
            <ChevronDown
                size={14}
                class="transition-transform {showAdvanced ? 'rotate-180' : ''}"
            />
        </button>

        {#if showAdvanced}
            <div
                transition:slide
                class="p-3 bg-white border-t-2 border-black max-h-[300px] overflow-y-auto custom-scrollbar"
            >
                {#if loadingTaxonomy}
                    <div
                        class="text-center py-4 text-[10px] font-bold text-gray-400 animate-pulse"
                    >
                        LOADING STRUCTURE...
                    </div>
                {:else if taxonomyNodes.length === 0}
                    <div
                        class="text-center py-4 text-[10px] font-bold text-gray-400"
                    >
                        데이터가 없습니다.
                    </div>
                {:else}
                    <div class="space-y-px">
                        {#each taxonomyNodes as node}
                            {@const count = taxonomyCounts[node.code] || 0}
                            {#if count > 0}
                                <button
                                    class="w-full text-left flex items-center gap-2 pr-2 py-1 hover:bg-[#FFF0F5] transition-colors group relative border-l-2 border-transparent hover:border-[#FF66CC]
                                           {codeFilter === node.code
                                        ? 'bg-[#FFF0F5] border-l-[#FF66CC]'
                                        : ''}"
                                    style="padding-left: {(node.depth - 1) *
                                        15 +
                                        8}px"
                                    on:click={() =>
                                        toggleCode(node.code, node.name)}
                                >
                                    <div class="relative">
                                        {#if codeFilter === node.code}
                                            <div
                                                class="bg-[#FF66CC] text-white p-0.5 border border-black"
                                            >
                                                <CheckSquare size={10} />
                                            </div>
                                        {:else}
                                            <div
                                                class="bg-white text-gray-300 p-0.5 border border-gray-300 group-hover:border-[#FF66CC]"
                                            >
                                                <Square size={10} />
                                            </div>
                                        {/if}
                                    </div>

                                    <span
                                        class="text-[11px] font-bold truncate flex-1 {node.depth ===
                                        1
                                            ? 'text-black'
                                            : 'text-gray-600'}"
                                    >
                                        {node.name}
                                        <span
                                            class="text-[9px] text-gray-400 font-mono ml-1 font-normal"
                                            >({count})</span
                                        >
                                    </span>
                                </button>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </section>

    <!-- Toolbar: Sort & Filter -->
    <div class="flex flex-col gap-2">
        <div class="flex gap-2">
            <button
                class="flex-1 btn-retro text-sm flex items-center justify-center gap-2
                       {filter === 'active'
                    ? 'bg-[#FF6666] text-white'
                    : 'bg-white text-gray-500'}"
                on:click={() => (filter = "active")}
            >
                Active ({activeCount})
            </button>
            <button
                class="flex-1 btn-retro text-sm flex items-center justify-center gap-2
                       {filter === 'graduated'
                    ? 'bg-[#99FF99] text-black'
                    : 'bg-white text-gray-500'}"
                on:click={() => (filter = "graduated")}
            >
                Mastered ({graduatedCount})
            </button>
        </div>

        <div class="flex justify-end">
            <select
                class="btn-retro text-xs py-1 px-2 bg-white"
                bind:value={sortMode}
            >
                <option value="oldest_review">Oldest Reviewed First</option>
                <option value="recent_added">Recently Added First</option>
            </select>
        </div>
    </div>

    <!-- List -->
    {#if filteredNotes.length === 0}
        <div class="retro-window p-8 text-center bg-white dashed-grid">
            <div class="text-4xl mb-4 opacity-50">✨</div>
            <p class="font-bold text-gray-400 text-xs">
                {filter === "active"
                    ? "NO WRONG NOTES!"
                    : "NO MASTERED ITEMS YET"}
            </p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each filteredNotes as note}
                {@const isExpanded = expandedQuestions.has(note.id)}

                <div class="retro-window p-0 hover:shadow-lg transition-shadow">
                    <!-- Header -->
                    <div
                        class="p-3 bg-white border-b-2 border-black flex items-start gap-3 cursor-pointer"
                        on:click={() => toggleQuestion(note.id)}
                    >
                        <div
                            class="w-8 h-8 flex-shrink-0 border-2 border-black flex items-center justify-center font-bold bg-[#FFD700]"
                        >
                            {!note.isGraduated ? "!" : "✓"}
                        </div>
                        <div class="flex-1 min-w-0 pt-1">
                            <p class="font-bold text-xs truncate leading-tight">
                                {note.question}
                            </p>
                            <div class="flex flex-wrap gap-2 mt-1">
                                <button
                                    class="pixel-tag bg-[#E0F7FA] text-[#006064] text-[9px] font-bold border-none hover:brightness-95 cursor-pointer text-left"
                                    on:click|stopPropagation={() =>
                                        toggleSubject(
                                            note.examInfo?.category ||
                                                note.subject_category ||
                                                note.subject ||
                                                "미분류",
                                        )}
                                >
                                    {note.examInfo?.category ||
                                        note.subject_category ||
                                        note.subject ||
                                        "미분류"}
                                </button>
                                <button
                                    class="pixel-tag bg-gray-100 text-[9px] border-none hover:brightness-95 cursor-pointer text-left {sourceFilter !==
                                    'all'
                                        ? 'ring-1 ring-black shadow-inner'
                                        : ''}"
                                    on:click|stopPropagation={() =>
                                        toggleSource(
                                            note.examInfo?.examName ||
                                                note.exam_name ||
                                                note.examInfo?.round ||
                                                "Unknown",
                                        )}
                                >
                                    {#if note.examInfo?.examName}
                                        {note.examInfo.examName}
                                        {note.examInfo.examYear
                                            ? `(${note.examInfo.examYear})`
                                            : ""}
                                    {:else if note.exam_name}
                                        {note.exam_name}
                                        {note.year ? `(${note.year})` : ""}
                                    {:else}
                                        {note.examInfo?.round || "Unknown"}
                                    {/if}
                                </button>
                                <span
                                    class="pixel-tag bg-blue-50 text-blue-600 text-[9px]"
                                >
                                    📌 {note.id}번
                                </span>
                                {#if !note.isGraduated}
                                    <span
                                        class="pixel-tag !bg-[#FF6666] !text-white text-[9px]"
                                    >
                                        Wrong x{note.wrongCount}
                                    </span>
                                {/if}
                            </div>

                            <!-- breadcrumb moved here -->
                            <div class="mt-2" on:click|stopPropagation>
                                <TaxonomyBreadcrumb
                                    codes={note.subjects}
                                    on:select={handleBreadcrumbSelect}
                                />
                            </div>
                        </div>
                    </div>

                    {#if isExpanded}
                        <div
                            class="p-4 bg-[#FAFAFA] text-xs space-y-3"
                            transition:slide
                        >
                            <div
                                class="font-medium text-gray-800 leading-relaxed whitespace-pre-wrap"
                            >
                                {note.question}
                            </div>

                            {#if note.passage}
                                <div
                                    class="p-2 border border-black border-dashed bg-white text-gray-600"
                                >
                                    {note.passage}
                                </div>
                            {/if}

                            <div class="space-y-1">
                                {#each note.options as opt, i}
                                    {@const isAns = i + 1 === note.answer}
                                    <div
                                        class="p-2 flex gap-2 {isAns
                                            ? 'bg-[#99FF99]/30 font-bold border border-[#99FF99]'
                                            : 'text-gray-500'}"
                                    >
                                        <span>{i + 1}.</span>
                                        <span>{opt}</span>
                                    </div>
                                {/each}
                            </div>

                            <div class="pt-2 border-t border-gray-200">
                                <label
                                    class="text-[10px] font-bold text-gray-500 mb-1 block"
                                    >MEMO</label
                                >
                                <textarea
                                    class="w-full text-xs p-2 border border-gray-300 rounded focus:border-[#FF6666] focus:outline-none resize-y"
                                    rows="3"
                                    placeholder="Write your notes here..."
                                    bind:value={note.memo}
                                ></textarea>
                            </div>

                            <div
                                class="flex gap-2 pt-2 border-t border-gray-200"
                            >
                                {#if !note.isGraduated}
                                    <button
                                        class="flex-1 btn-retro bg-[#99FF99] text-[10px] py-1 h-8"
                                        on:click={() => markAsGraduated(note)}
                                    >
                                        MARK AS MASTERED
                                    </button>
                                {:else}
                                    <button
                                        class="flex-1 btn-retro bg-white text-[10px] py-1 h-8"
                                        on:click={() => restoreNote(note)}
                                    >
                                        RESTORE
                                    </button>
                                {/if}
                                <button
                                    class="w-8 h-8 btn-retro !bg-[#FF6666] !text-white flex items-center justify-center p-0"
                                    on:click={() => removeNote(note)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>
