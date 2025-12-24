<script lang="ts">
    import { wrongNotes } from "$lib/stores";
    import { getCodePath } from "$lib/db";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import {
        Heart,
        Trash2,
        CheckCircle2,
        ChevronDown,
        ChevronUp,
        BookOpen,
        Sparkles,
        Award,
    } from "lucide-svelte";
    import type { WrongNote } from "$lib/types";

    let subjectPaths: Record<string, string> = {};
    let expandedQuestions: Set<number> = new Set();
    let filter: "active" | "graduated" = "active";

    onMount(() => {
        loadSubjectPaths();
    });

    async function loadSubjectPaths() {
        for (const q of $wrongNotes) {
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
        const idx = $wrongNotes.findIndex((n) => n.id === note.id);
        if (idx !== -1) {
            $wrongNotes[idx].isGraduated = true;
            $wrongNotes[idx].consecutiveCorrect = 3;
            $wrongNotes = $wrongNotes;
        }
    }

    function restoreNote(note: WrongNote) {
        const idx = $wrongNotes.findIndex((n) => n.id === note.id);
        if (idx !== -1) {
            $wrongNotes[idx].isGraduated = false;
            $wrongNotes[idx].consecutiveCorrect = 0;
            $wrongNotes = $wrongNotes;
        }
    }

    function removeNote(note: WrongNote) {
        if (confirm("Delete this note?")) {
            $wrongNotes = $wrongNotes.filter((n) => n.id !== note.id);
        }
    }

    let sortMode: "recent_added" | "oldest_review" = "oldest_review";

    $: filteredNotes = $wrongNotes
        .filter((n) => (filter === "active" ? !n.isGraduated : n.isGraduated))
        .sort((a, b) => {
            if (sortMode === "oldest_review") {
                // Treat undefined lastReviewDate as 0 (very old)
                const dateA = a.lastReviewDate || 0;
                const dateB = b.lastReviewDate || 0;
                return dateA - dateB;
            } else {
                // recent_added: Newest ID (timestamp) first
                return b.id - a.id;
            }
        });

    $: activeCount = $wrongNotes.filter((n) => !n.isGraduated).length;
    $: graduatedCount = $wrongNotes.filter((n) => n.isGraduated).length;
</script>

<div class="min-h-screen p-6 pb-32 space-y-6">
    <!-- Header -->
    <header class="retro-window">
        <div class="retro-header !bg-[#FF6666]">
            <span>💔 WRONG_NOTES.db</span>
        </div>
        <div class="p-4 text-center bg-[#FFF0F0]">
            <h1 class="text-2xl font-pixel text-[#FF6666] animate-pulse">
                REVIEW MISTAKES
            </h1>
            <p class="text-xs font-bold text-gray-500 mt-1">
                Turn your weakness into strength
            </p>
        </div>
    </header>

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
                            <div class="flex gap-2 mt-1">
                                <span class="pixel-tag bg-gray-100 text-[9px]"
                                    >{note.examInfo?.category || "N/A"}</span
                                >
                                {#if !note.isGraduated}
                                    <span
                                        class="pixel-tag bg-[#FF6666] text-white text-[9px]"
                                        >Wrong x{note.wrongCount}</span
                                    >
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
                                    class="w-8 h-8 btn-retro bg-[#FF6666] text-white flex items-center justify-center p-0"
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
