<script lang="ts">
    import {
        wrongNotes,
        quizSession,
        quizHistory,
        questionMemos,
    } from "$lib/stores";
    import { isCorrectAnswer } from "$lib/logic/quizEngine";
    import { getCodePath } from "$lib/db";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
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
    } from "lucide-svelte";
    import type { WrongNote } from "$lib/types";
    import { getQuickReviewQuestions } from "$lib/logic/quickReview";

    let subjectPaths: Record<string, string> = {};
    let expandedQuestions: Set<number> = new Set();
    let filter: "active" | "graduated" = "active";

    // New filters
    let subjectFilter: string = "all"; // 'all' | '공법' | '민사법' | '형사법'
    const subjects = ["공법", "민사법", "형사법"];

    onMount(() => {
        migrateExistingNotes();
        loadSubjectPaths();
    });

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

    // Enhanced filtering with subject filter
    $: filteredNotes = allWrongNotesFromLogs
        .filter((n) => (filter === "active" ? !n.isGraduated : n.isGraduated))
        .filter((n) => {
            if (subjectFilter === "all") return true;
            return (
                n.examInfo?.category === subjectFilter ||
                n.subject === subjectFilter
            );
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
    $: headerTitle =
        subjectFilter === "all" ? "오답노트" : `오답노트 - ${subjectFilter}`;

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
                   {subjectFilter === 'all'
                ? 'bg-[#333] text-white'
                : 'bg-white text-gray-600'}"
            on:click={() => (subjectFilter = "all")}
        >
            <Filter size={12} /> 전체
        </button>
        {#each subjects as subj}
            <button
                class="shrink-0 btn-retro text-xs px-4 py-2
                       {subjectFilter === subj
                    ? 'bg-[#FF6666] text-white'
                    : 'bg-white text-gray-600'}"
                on:click={() => (subjectFilter = subj)}
            >
                {subj}
            </button>
        {/each}
    </div>

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
                                <span class="pixel-tag bg-gray-100 text-[9px]">
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
                                </span>
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
                        </div>
                    </div>

                    {#if isExpanded}
                        <div class="p-4 bg-[#FAFAFA] text-xs space-y-3">
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
