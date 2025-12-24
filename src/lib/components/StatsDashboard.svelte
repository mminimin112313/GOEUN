<script lang="ts">
    import { quizHistory } from "$lib/stores";
    import { BarChart3, Target, TrendingUp } from "lucide-svelte";
    import { CATEGORY_MAP, SUBJECT_CODE_MAP } from "$lib/config";
    import { isCorrectAnswer } from "$lib/logic/quizEngine";

    let selectedCategory = "ALL"; // Default: ALL

    // Helper: Determine category of a question
    function getQuestionCategory(q: any): string | null {
        // 1. If explicit category is in examInfo (reliable for standard exams)
        if (q.examInfo?.category && CATEGORY_MAP[q.examInfo.category]) {
            return q.examInfo.category;
        }
        // 2. Derive from subject codes (e.g. CON -> 公法)
        if (q.subjects && q.subjects.length > 0) {
            for (const code of q.subjects) {
                // Find which category this code belongs to
                // Code structure: CON_01...
                // SUBJECT_CODE_MAP maps '헌법' -> 'CON', we need reverse or just check prefixes
                // Actually easier: iterate CATEGORY_MAP
                for (const [catName, catInfo] of Object.entries(CATEGORY_MAP)) {
                    // Check if any subject in this category matches code prefix
                    // This is hard because SUBJECT_CODE_MAP is Korean Key -> Code Value
                    // Let's hardcode prefix check for robustness or use map
                }
            }
            // For now, let's assume we can rely on examInfo if normalized.
            // If Quick Start questions don't have examInfo.category set correctly, we might need to rely on subject strings.
            // Quick start questions HAVE 'subjects' array of codes.
            // Let's use a simpler approach: calculate stats by iterating all questions and checking if they belong to 'selectedCategory'.
        }
        return null;
    }

    // New Reactive Stats (Granular)
    $: stats = $quizHistory.reduce(
        (acc, session) => {
            // For list view: filter sessions by category (keep separate)
            const isSessionMatch =
                selectedCategory === "ALL" || selectedCategory === "QUICK_START"
                    ? true
                    : session.category === selectedCategory;

            // For metrics (Accuracy/Solved): Aggregated by QUESTION
            session.questions.forEach((q, idx) => {
                // Determine Question Category
                let qCategory = session.category; // Default to session category

                // If Quick Start, try to determine real category from question
                if (
                    session.category === "QUICK_START" ||
                    session.category === "RANDOM"
                ) {
                    // Try to map from subject code
                    if (q.subjects && q.subjects.length > 0) {
                        const code = q.subjects[0]; // e.g., "CON_..."
                        if (code.startsWith("CON") || code.startsWith("ADM"))
                            qCategory = "공법";
                        else if (
                            code.startsWith("CIV") ||
                            code.startsWith("CPL") ||
                            code.startsWith("COM")
                        )
                            qCategory = "민사법";
                        else if (
                            code.startsWith("CRI") ||
                            code.startsWith("CRL")
                        )
                            qCategory = "형사법";
                    }
                }

                // Count if matches selected category
                if (
                    selectedCategory === "ALL" ||
                    qCategory === selectedCategory
                ) {
                    acc.total++;
                    const isCorrect = isCorrectAnswer(q, session.answers[idx]);
                    if (isCorrect) acc.correct++;
                }
            });
            return acc;
        },
        { total: 0, correct: 0 },
    );

    $: totalSolved = stats.total;
    $: avgScore =
        totalSolved > 0 ? Math.round((stats.correct / totalSolved) * 100) : 0;
    $: totalExams = $quizHistory.length; // Just total sessions count for now, or filtered?
    // User wants "Public Law" stats -> Accuracy/Solved should be Public Law only.
    // "Sessions" count -> Should be Public Law sessions only. Quick Start sessions are 'Mixed', so maybe don't count towards "Public Law Sessions" count to avoid confusion? Or count if >50%?
    // Let's keep "Sessions" count as "Exams taken in this category context". Mixed/QuickStart don't show up in "Public Law" session count, but their questions DO contribute to Accuracy/Solved.
    $: filteredSessions = $quizHistory.filter(
        (h) => selectedCategory === "ALL" || h.category === selectedCategory,
    );

    // Recent 10 Sessions for Chart (Session based)
    $: recentSessions = filteredSessions
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-10); // Last 10

    // Helper to get bar height (max 100%)
    const getHeight = (score: number, total: number) =>
        Math.min(100, Math.round((score / total) * 100));
</script>

<div class="retro-window w-full bg-white">
    <!-- Header -->
    <div class="retro-header !bg-[#000] !text-[#00FF00]">
        <div class="flex items-center gap-2">
            <BarChart3 size={16} />
            <span>BATTLE_STATS_MONITOR.exe</span>
        </div>
        <div class="flex gap-1">
            <div class="retro-btn-control">_</div>
            <div class="retro-btn-control">X</div>
        </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b-2 border-black bg-gray-100">
        <button
            class="flex-1 py-2 text-xs font-bold transition-colors border-r-2 border-black last:border-r-0
                   {selectedCategory === 'ALL'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:bg-gray-200'}"
            on:click={() => (selectedCategory = "ALL")}
        >
            ALL
        </button>
        {#each Object.keys(CATEGORY_MAP) as cat}
            <button
                class="flex-1 py-2 text-xs font-bold transition-colors border-r-2 border-black last:border-r-0
                       {selectedCategory === cat
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:bg-gray-200'}"
                on:click={() => (selectedCategory = cat)}
            >
                {cat}
            </button>
        {/each}
        <button
            class="flex-1 py-2 text-xs font-bold transition-colors border-r-2 border-black last:border-r-0
                   {selectedCategory === 'QUICK_START'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:bg-gray-200'}"
            on:click={() => (selectedCategory = "QUICK_START")}
        >
            QUICK
        </button>
    </div>

    <div class="p-4 space-y-4">
        <!-- Key Metrics -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    ACCURACY
                </div>
                <div class="text-xl font-pixel text-[#FF66CC]">{avgScore}%</div>
            </div>
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    SOLVED
                </div>
                <div class="text-xl font-pixel text-[#66CCFF]">
                    {totalSolved}
                </div>
            </div>
            <div class="bg-gray-50 border border-black p-2 text-center">
                <div class="text-[10px] text-gray-500 font-bold mb-1">
                    SESSIONS
                </div>
                <div class="text-xl font-pixel text-[#99FF99]">
                    {filteredSessions.length}
                </div>
            </div>
        </div>

        <!-- Pixel Chart -->
        <div
            class="relative h-32 border-2 border-black border-dashed bg-[#111] p-2 flex items-end gap-1 overflow-hidden"
        >
            <!-- Grid Lines -->
            <div
                class="absolute inset-0 pointer-events-none"
                style="background-image: linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px); background-size: 10px 10px; opacity: 0.5;"
            ></div>

            {#if recentSessions.length === 0}
                <div
                    class="absolute inset-0 flex items-center justify-center text-[#00FF00] font-mono text-xs animate-pulse"
                >
                    NO_DATA_DETECTED...
                </div>
            {:else}
                {#each recentSessions as session}
                    <div
                        class="flex-1 flex flex-col justify-end h-full group relative"
                    >
                        <!-- Tooltip -->
                        <div
                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white border border-black p-1 text-[10px] font-bold whitespace-nowrap z-10 w-max shadow-sm"
                        >
                            {((session.score / session.total) * 100).toFixed(
                                0,
                            )}% ({new Date(
                                session.timestamp,
                            ).toLocaleDateString()})
                        </div>

                        <!-- Bar -->
                        <div
                            class="w-full bg-[#00FF00] hover:bg-[#CCFF00] transition-all relative border-t-2 border-white"
                            style="height: {getHeight(
                                session.score,
                                session.total,
                            )}%"
                        >
                            <!-- Scanline effect on hover -->
                            <div
                                class="absolute inset-0 bg-black/10 group-hover:hidden"
                            ></div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="text-[9px] font-mono text-gray-400 text-right">
            * Displaying last {recentSessions.length} training sessions
        </div>
    </div>

    <!-- Recent Logs List -->
    <div class="border-t-2 border-dashed border-black bg-white p-4">
        <h3 class="font-pixel text-xs mb-3 flex items-center gap-2">
            <Target size={14} /> RECENT LOGS
        </h3>
        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {#each recentSessions.reverse() as session}
                <a
                    href={`/result?id=${session.id}`}
                    class="block border border-gray-200 p-2 hover:bg-gray-50 hover:border-black transition-all flex items-center gap-3 text-xs"
                >
                    <div
                        class="w-8 h-8 flex items-center justify-center font-bold font-pixel border border-black
                                {session.score / session.total >= 0.6
                            ? 'bg-[#99FF99] text-black'
                            : 'bg-[#FF6666] text-white'}"
                    >
                        {Math.round((session.score / session.total) * 100)}%
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-gray-800">
                            {session.round}
                            {session.category}
                        </div>
                        <div class="text-[10px] text-gray-400 font-mono">
                            {new Date(session.timestamp).toLocaleString()} | {session
                                .questions.length} Questions
                        </div>
                    </div>
                    <div class="text-gray-400">
                        <TrendingUp size={14} />
                    </div>
                </a>
            {/each}
        </div>
    </div>
</div>
