<script lang="ts">
  import type { ComponentType } from 'svelte';
  
  export let type: 'year' | 'exam' | 'cat' | 'subject';
  export let text: string;
  export let icon: ComponentType | undefined = undefined;

  const styles = {
    year: 'bg-slate-100 text-slate-600 border border-slate-200',
    exam: 'bg-action/5 text-action border border-action/20',
    cat: 'bg-white text-slate-500 border border-slate-200',
    subject: 'bg-brand/5 text-brand border border-brand/10'
  };
</script>

<span class={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${styles[type] || 'bg-slate-50 text-slate-400'}`}>
  {#if icon}
    <svelte:component this={icon} size={9} />
  {/if}
  {text}
</span>
