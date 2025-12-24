<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { AlertTriangle, X, Trash2 } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    export let show = false;
    const dispatch = createEventDispatcher();

    let userInput = "";
    const CONFIRM_TEXT = "리셋을 원합니다";
    $: isConfirmed = userInput === CONFIRM_TEXT;

    function handleClose() {
        userInput = "";
        dispatch("close");
    }

    function handleReset() {
        if (isConfirmed) {
            dispatch("reset");
            handleClose();
        }
    }
</script>

{#if show}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        on:click|self={handleClose}
        transition:fade={{ duration: 200 }}
    >
        <!-- Modal Window -->
        <div
            class="retro-window w-full max-w-sm bg-white overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,0.3)]"
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div
                class="retro-header !bg-red-600 !text-white flex justify-between items-center px-4"
            >
                <div class="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span class="font-bold text-xs uppercase tracking-tighter"
                        >System Alert: Data Wipe</span
                    >
                </div>
                <button on:click={handleClose} class="hover:bg-white/20 p-1">
                    <X size={16} />
                </button>
            </div>

            <div class="p-6 space-y-6">
                <div class="space-y-2">
                    <h3
                        class="text-lg font-black text-red-600 flex items-center gap-2"
                    >
                        계정 초기화
                    </h3>
                    <p class="text-sm text-gray-600 leading-relaxed">
                        모든 학습 데이터(문제 기록, 오답 노트, 메모, 레벨 및
                        XP)가 영구적으로 삭제됩니다. 이 작업은 <strong
                            >복구할 수 없습니다.</strong
                        >
                    </p>
                </div>

                <div class="bg-red-50 border-2 border-red-200 p-4 space-y-3">
                    <p
                        class="text-[11px] text-red-800 font-bold uppercase text-center"
                    >
                        진행하시려면 아래 문구를 입력하세요:
                    </p>
                    <div
                        class="text-center font-mono font-bold text-red-600 bg-white py-2 border border-red-200 select-none"
                    >
                        "{CONFIRM_TEXT}"
                    </div>
                    <input
                        type="text"
                        bind:value={userInput}
                        placeholder="여기에 문구를 입력하세요"
                        class="w-full px-3 py-2 border-2 border-black font-pixel text-sm focus:outline-none focus:ring-0 placeholder:text-gray-300"
                    />
                </div>

                <div class="flex gap-4 pt-2">
                    <button
                        type="button"
                        on:click={handleClose}
                        class="flex-1 btn-retro bg-gray-100 text-gray-600 py-3 font-bold hover:bg-gray-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        on:click|stopPropagation={handleReset}
                        disabled={!isConfirmed}
                        class="flex-[1.5] btn-retro {isConfirmed
                            ? 'bg-red-600 text-white shadow-[4px_4px_0px_#7f1d1d] active:shadow-none active:translate-y-1'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'} py-3 font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Trash2 size={16} />
                        리셋 시작
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .font-pixel {
        font-family: "Courier New", Courier, monospace;
    }
</style>
