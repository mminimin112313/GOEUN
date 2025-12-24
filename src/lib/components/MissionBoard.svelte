<script lang="ts">
    import { gamification } from "$lib/stores";
    import { X, CheckCircle, Trophy } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";

    export let show = false;

    let activeTab: "daily" | "weekly" = "daily";

    function claim(m: any, category: "daily" | "weekly" | "tutorial") {
        gamification.claimMission(m.id, category);
    }

    $: missions = $gamification.missions[activeTab] || [];
</script>

{#if show}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        transition:fade
    >
        <div
            class="retro-window w-full max-w-md bg-white flex flex-col max-h-[80vh] shadow-2xl"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <!-- Header -->
            <div
                class="retro-header-pink flex justify-between items-center p-2 border-b-2 border-black bg-[#FF66CC] text-white"
            >
                <div class="flex items-center gap-2">
                    <Trophy size={16} />
                    <span class="font-bold font-pixel text-sm"
                        >MISSION_CONTROLLER</span
                    >
                </div>
                <button
                    on:click={() => (show = false)}
                    class="hover:bg-black/20 p-1 rounded transition"
                >
                    <X size={16} />
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b-2 border-black bg-gray-100">
                <button
                    class={`flex-1 py-3 text-xs font-bold font-pixel transition-colors uppercase ${activeTab === "daily" ? "bg-white text-blue-600 border-r-2 border-black" : "text-gray-400 hover:bg-gray-200 border-r-2 border-black"}`}
                    on:click={() => (activeTab = "daily")}
                >
                    Daily Ops
                </button>
                <button
                    class={`flex-1 py-3 text-xs font-bold font-pixel transition-colors uppercase ${activeTab === "weekly" ? "bg-white text-purple-600" : "text-gray-400 hover:bg-gray-200"}`}
                    on:click={() => (activeTab = "weekly")}
                >
                    Weekly Ops
                </button>
            </div>

            <!-- Content -->
            <div
                class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#FFF0F5]"
            >
                {#if missions.length === 0}
                    <div
                        class="text-center py-10 text-gray-400 text-xs font-bold"
                    >
                        NO MISSIONS ACTIVE
                    </div>
                {/if}

                {#each missions as m (m.id)}
                    <div
                        class={`relative p-4 rounded-xl border-2 border-black shadow-sm transition-all ${m.isCompleted ? (m.claimed ? "bg-gray-100 opacity-70" : "bg-white ring-2 ring-[#FF66CC] ring-offset-2") : "bg-white"}`}
                    >
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-sm text-gray-800">
                                    {m.desc}
                                </h4>
                                <div class="flex items-center gap-1 mt-1">
                                    <span
                                        class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600"
                                        >XP +{m.rewardXp}</span
                                    >
                                    {#if m.claimed}
                                        <span
                                            class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-600 flex items-center gap-0.5"
                                        >
                                            <CheckCircle size={10} /> CLAIMED
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            {#if m.isCompleted && !m.claimed}
                                <button
                                    on:click={() => claim(m, activeTab)}
                                    class="animate-bounce-subtle bg-[#FF66CC] hover:bg-[#FF3399] text-white text-[10px] font-bold px-3 py-1.5 rounded border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                >
                                    CLAIM
                                </button>
                            {/if}
                        </div>

                        <!-- Progress Bar -->
                        <div
                            class="relative h-3 bg-gray-200 rounded-full overflow-hidden border border-black"
                        >
                            <div
                                class={`absolute top-0 left-0 h-full transition-all duration-500 ${m.isCompleted ? "bg-[#99FF99]" : "bg-[#66CCFF]"}`}
                                style={`width: ${(m.current / m.target) * 100}%`}
                            ></div>
                        </div>
                        <div class="flex justify-between mt-1">
                            <span class="text-[9px] font-bold text-gray-400"
                                >{Math.round(
                                    (m.current / m.target) * 100,
                                )}%</span
                            >
                            <span class="text-[9px] font-bold text-gray-400"
                                >{m.current}/{m.target}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}
