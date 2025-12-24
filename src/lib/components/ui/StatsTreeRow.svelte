<script lang="ts">
    import { ChevronRight, ChevronDown, Target } from 'lucide-svelte';
    import type { StatNode } from '$lib/logic/stats';
    import { slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    export let node: StatNode;
    export let selectedId: string = 'all';

    const dispatch = createEventDispatcher();
    let expanded = false;

    // Auto-expand if child selected? Maybe later.
    
    function toggle() {
        if (node.children.length > 0) {
            expanded = !expanded;
        }
    }

    function select() {
        dispatch('select', node.id);
    }

    function forward(e: CustomEvent) {
        dispatch('select', e.detail);
    }
</script>

<div class="select-none">
    <!-- Row -->
    <!-- Row -->
    <button 
        class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors w-full text-left {selectedId === node.id ? 'bg-action/5 border border-action/20' : 'hover:bg-slate-50 border border-transparent'}"
        on:click|stopPropagation={select}
    >
        <!-- Expander -->
        <div on:click|stopPropagation={toggle} class="p-1 text-slate-400 hover:text-action cursor-pointer {node.children.length === 0 ? 'invisible' : ''}" role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggle()}>
            {#if expanded}
                <ChevronDown size={14} />
            {:else}
                <ChevronRight size={14} />
            {/if}
        </div>

        <!-- Content -->
        <div class="flex-1">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-bold {selectedId === node.id ? 'text-action' : 'text-slate-600'}">{node.name}</span>
                <span class="text-[10px] font-black {node.accuracy >= 80 ? 'text-success' : node.accuracy >= 50 ? 'text-warning' : 'text-slate-300'}">
                    {node.accuracy}% 
                    <span class="text-slate-300 font-normal">({node.total})</span>
                </span>
            </div>
            <!-- Mini Bar -->
            <div class="h-1 bg-slate-100 rounded-full overflow-hidden w-full">
                <div class="h-full bg-action transition-all duration-500" style={`width: ${node.accuracy}%`}></div>
            </div>
        </div>
    </button>

    <!-- Children -->
    {#if expanded && node.children.length > 0}
        <div class="pl-4 border-l border-slate-100 ml-3" transition:slide|local={{ duration: 200 }}>
            {#each node.children as child}
                <svelte:self node={child} {selectedId} on:select={forward} />
            {/each}
        </div>
    {/if}
</div>
