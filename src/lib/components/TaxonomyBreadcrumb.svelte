<script lang="ts">
    import { getCodePath } from "$lib/db";
    import { onMount } from "svelte";
    import { ChevronRight, Hash } from "lucide-svelte";

    export let codes: string[] = [];

    let paths: string[] = [];
    let loading = true;

    // Load full paths (e.g., "민법 > 민법총칙")
    $: if (codes.length > 0) loadPaths();

    async function loadPaths() {
        loading = true;
        paths = [];
        for (const code of codes) {
            const path = await getCodePath(code);
            if (path) paths.push(path);
        }
        loading = false;
    }
</script>

<div
    class="flex flex-wrap gap-2 items-center text-xs font-bold text-gray-500 mb-2"
>
    {#if loading}
        <span class="animate-pulse">Loading tags...</span>
    {:else}
        {#each paths as path}
            <div
                class="flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded-full shadow-sm"
            >
                <Hash size={10} class="text-[#FF66CC]" />
                {#each path.split(" > ") as segment, i}
                    {#if i > 0}
                        <ChevronRight size={10} class="text-gray-300" />
                    {/if}
                    <span
                        class={i === path.split(" > ").length - 1
                            ? "text-[#333]"
                            : "text-gray-400"}
                    >
                        {segment}
                    </span>
                {/each}
            </div>
        {/each}
    {/if}
</div>
