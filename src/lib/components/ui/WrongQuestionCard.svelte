<script lang="ts">
  import {
    Zap,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ArrowRight,
  } from "lucide-svelte";
  import type { WrongNote } from "$lib/types";
  import { slide } from "svelte/transition";
  import InfoBadge from "./InfoBadge.svelte";
  import { getCategoryName } from "$lib/db/taxonomy";

  export let note: WrongNote;
  export let onReview: (note: WrongNote) => void;
  export let onGraduate: (note: WrongNote) => void;

  let showDetail = false;

  // Helper to get formatted Question/Exam Source
  $: sourceText = `${note.year} ${note.exam_name} ${note.question_number ? "No." + note.question_number : ""}`;
  // Safety check for tag_ids
  $: categoryName =
    note.tag_ids && note.tag_ids[0] ? getCategoryName(note.tag_ids[0]) : "";
</script>

<div
  class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
>
  <!-- Header / Summary line -->
  <div class="flex justify-between items-start gap-4">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2">
        <span
          class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
        >
          {note.subject || "과목"}
        </span>
        <span class="text-xs text-slate-400 font-medium truncate">
          {sourceText}
        </span>
      </div>

      <!-- Click title to toggle detail -->
      <button
        on:click={() => (showDetail = !showDetail)}
        class="text-left w-full group-hover:text-brand transition-colors"
      >
        <h4 class="font-bold text-slate-800 text-lg line-clamp-1 mb-1">
          {note.question_text || "문제 내용 없음"}
        </h4>
      </button>

      <div class="flex items-center gap-2 mt-2">
        {#if categoryName}
          <InfoBadge type="cat" text={categoryName} />
        {/if}
        <div
          class="text-xs font-medium {note.consecutiveCorrect > 0
            ? 'text-green-500'
            : 'text-rose-500'} flex items-center gap-1"
        >
          {#if note.consecutiveCorrect > 0}
            <CheckCircle2 size={12} /> {note.consecutiveCorrect}회 연속 정답
          {:else}
            <Zap size={12} /> 복습 필요
          {/if}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-2 shrink-0">
      <button
        on:click={() => onReview(note)}
        class="p-2.5 bg-brand/5 text-brand rounded-xl hover:bg-brand hover:text-white transition-all shadow-sm"
        title="복습하기"
      >
        <Zap size={18} />
      </button>
    </div>
  </div>

  <!-- Expanded Details -->
  {#if showDetail}
    <div transition:slide class="mt-6 pt-6 border-t border-slate-50">
      <div
        class="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-slate-700 leading-relaxed font-medium text-sm whitespace-pre-wrap"
      >
        {note.question_text}
      </div>

      {#if note.choices}
        <div class="space-y-2 mb-6">
          {#each note.choices as choice, i}
            <div
              class="text-sm p-3 rounded-lg border {i + 1 === note.answer
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-white border-transparent text-slate-500'}"
            >
              <span class="font-bold mr-2">{i + 1}.</span>
              {choice}
            </div>
          {/each}
        </div>
      {/if}

      <div class="flex justify-end gap-3">
        <button
          on:click={() => onGraduate(note)}
          class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 px-3 py-2"
        >
          <GraduationCap size={14} /> 마스터함 (삭제)
        </button>
      </div>
    </div>
  {/if}

  <div class="mt-2 flex justify-center">
    <button
      on:click={() => (showDetail = !showDetail)}
      class="text-slate-300 hover:text-slate-500 transition-colors"
    >
      {#if showDetail}
        <ChevronUp size={20} />
      {:else}
        <ChevronDown size={20} />
      {/if}
    </button>
  </div>
</div>
