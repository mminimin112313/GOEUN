<script lang="ts">
    import { onMount } from "svelte";
    import { X, HelpCircle, Keyboard, MousePointer2 } from "lucide-svelte";

    export let show = false;

    const HELP_SEEN_KEY = "byeonsi_help_seen_v1";

    onMount(() => {
        const seen = localStorage.getItem(HELP_SEEN_KEY);
        if (!seen) {
            show = true;
            localStorage.setItem(HELP_SEEN_KEY, "true");
        }
    });

    function close() {
        show = false;
    }
</script>

{#if show}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        on:click|self={close}
    >
        <div
            class="retro-window w-full max-w-md bg-white animate-bounce-pixel shadow-2xl"
        >
            <!-- Header -->
            <div class="retro-header !bg-[#66CCFF]">
                <div class="flex items-center gap-2">
                    <HelpCircle size={16} />
                    <span>README.txt</span>
                </div>
                <button
                    class="retro-btn-control hover:bg-red-500 hover:text-white"
                    on:click={close}
                >
                    X
                </button>
            </div>

            <!-- Content -->
            <div
                class="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
                <div class="text-center space-y-2">
                    <h2 class="font-pixel text-xl">WELCOME TO BYEONSI CBT</h2>
                    <p class="text-xs text-gray-500 font-mono">
                        System Version 2025.12.25
                    </p>
                </div>

                <div class="space-y-4 text-sm leading-relaxed">
                    <!-- Section 1 -->
                    <div
                        class="bg-gray-50 p-3 border-2 border-black border-dashed"
                    >
                        <div
                            class="flex items-center gap-2 font-bold mb-2 text-[#FF66CC]"
                        >
                            <MousePointer2 size={16} />
                            <span>EXAM SETUP</span>
                        </div>
                        <p class="text-xs text-gray-600">
                            Select specific <b class="text-black">Year</b> and
                            optionally include
                            <b class="text-black">Mock Exams</b> in Settings. You
                            can combine multiple years for a custom problem set.
                        </p>
                    </div>

                    <!-- Section 2 -->
                    <div
                        class="bg-gray-50 p-3 border-2 border-black border-dashed"
                    >
                        <div
                            class="flex items-center gap-2 font-bold mb-2 text-[#66CCFF]"
                        >
                            <Keyboard size={16} />
                            <span>SPRINT MODE</span>
                        </div>
                        <ul class="text-xs text-gray-600 space-y-1 font-mono">
                            <li>[1-5] Select Option</li>
                            <li>[SPC] Next Question</li>
                            <li>[ D ] Toggle Memo</li>
                        </ul>
                    </div>
                </div>

                <button
                    class="w-full btn-retro btn-retro-pink py-3"
                    on:click={close}
                >
                    I UNDERSTAND (ENTER)
                </button>
            </div>
        </div>
    </div>
{/if}
