<script lang="ts">
    import { getCodePath, loadMasterCodes } from "$lib/db";
    import { onMount, createEventDispatcher } from "svelte";
    import { ChevronRight, Hash } from "lucide-svelte";

    export let codes: string[] = [];
    const dispatch = createEventDispatcher<{
        select: { name: string; code: string };
    }>();

    let paths: { path: string; code: string }[] = [];
    let loading = true;

    // Load full paths (e.g., "민법 > 민법총칙")
    $: if (codes.length > 0) loadPaths();

    async function loadPaths() {
        loading = true;
        paths = [];
        const masterCodes = await loadMasterCodes();
        for (const code of codes) {
            const path = masterCodes[code]?.path || code;
            if (path) paths.push({ path, code });
        }
        loading = false;
    }

    function handleSegmentClick(
        segment: string,
        path: string,
        fullCode: string,
    ) {
        // Try to derive the code for the segment if possible
        // For now, let's just pass the segment name as it's useful for filtering by name
        dispatch("select", { name: segment, code: fullCode });
    }
</script>

<div
    class="flex flex-wrap gap-2 items-center text-xs font-bold text-gray-500 mb-2"
>
    {#if loading}
        <span class="animate-pulse">Loading tags...</span>
    {:else}
        {#each paths as { path, code }}
            <div
                class="flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded-full shadow-sm"
            >
                <Hash size={10} class="text-[#FF66CC]" />
                {#each path.split(" > ") as segment, i}
                    {#if i > 0}
                        <ChevronRight size={10} class="text-gray-300" />
                    {/if}
                    <button
                        type="button"
                        class="hover:text-[#FF66CC] transition-colors bg-transparent border-none p-0 font-bold {i ===
                        path.split(' > ').length - 1
                            ? 'text-[#333]'
                            : 'text-gray-400'}"
                        on:click|stopPropagation={() =>
                            handleSegmentClick(segment, path, code)}
                    >
                        {segment}
                    </button>
                {/each}
            </div>
        {/each}
    {/if}
</div>
