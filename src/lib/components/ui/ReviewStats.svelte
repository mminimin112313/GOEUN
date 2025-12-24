<script lang="ts">
  import { SUBJECT_MAP } from '$lib/config';
  import type { WrongNote } from '$lib/types';

  export let wrongNotes: WrongNote[];

  // Derived: Count per Subject
  $: stats = Object.keys(SUBJECT_MAP).map(subName => {
      const subId = SUBJECT_MAP[subName];
      const count = wrongNotes.filter(n => n.subject === subName).length;
      return { name: subName, id: subId, count };
  }).sort((a, b) => b.count - a.count);

  $: total = wrongNotes.length;
</script>

<div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
    <div class="flex justify-between items-end">
         <h3 class="text-sm font-black text-slate-700">과목별 오답 분포</h3>
         <span class="text-[10px] font-bold text-slate-400">Total {total}</span>
    </div>
    
    <div class="space-y-3">
        {#each stats as s}
            {#if s.count > 0}
                <div class="space-y-1">
                    <div class="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>{s.name}</span>
                        <span>{s.count}</span>
                    </div>
                    <div class="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 rounded-full" style={`width: ${(s.count / total) * 100}%`}></div>
                    </div>
                </div>
            {/if}
        {/each}
        {#if total === 0}
            <div class="text-center text-[10px] text-slate-300 py-4">오답 데이터가 없습니다.</div>
        {/if}
    </div>
</div>
