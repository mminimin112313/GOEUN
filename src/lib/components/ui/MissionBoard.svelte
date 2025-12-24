<script lang="ts">
    import { gamification } from '$lib/stores/gamification';
    import { CheckCircle2, Gift, Lock, Calendar, Zap, Clock } from 'lucide-svelte';
    import { fade } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';

    let activeTab: 'daily' | 'weekly' | 'tutorial' = 'daily';
    let timeLeft = '00:00:00';
    let timerInterval: ReturnType<typeof setInterval>;
    
    // Check if tutorial is pending
    $: hasPendingTutorial = $gamification.missions?.tutorial?.some(m => !m.claimed) ?? false;
    
    // Calculate progress
    $: missions = $gamification.missions ? $gamification.missions[activeTab] || [] : [];
    $: progress = missions.length > 0 
        ? (missions.filter(m => m.isCompleted).length / missions.length) * 100 
        : 0;
    
    function updateTimer() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        timeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function claim(missionId: string) {
        gamification.claimMission(activeTab, missionId);
    }
    
    // Auto-switch to tutorial if it has items and we are on initial load
    onMount(() => {
        if (hasPendingTutorial) {
             activeTab = 'tutorial';
        }
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    });
    
    onDestroy(() => {
        if (timerInterval) clearInterval(timerInterval);
    });
</script>

<div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-full flex flex-col relative overflow-hidden">
    <!-- Header -->
    <header class="flex justify-between items-center mb-6 z-10 relative">
        <div class="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
             {#if hasPendingTutorial}
             <button 
                class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'tutorial' ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'text-brand/50 hover:text-brand bg-brand/5'}`}
                on:click={() => { activeTab = 'tutorial'; }}
             >
                왕초보 탈출
             </button>
             {/if}
             <button 
                class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'daily' ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                on:click={() => { activeTab = 'daily'; updateTimer(); }}
             >
                Daily
             </button>
             <button 
                class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'weekly' ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                on:click={() => { activeTab = 'weekly'; updateTimer(); }}
             >
                Weekly
             </button>
        </div>
        
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
            <Clock size={12}/> {timeLeft}
        </div>
    </header>

    <!-- Progress Summary -->
    <div class="mb-4">
        <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
        </div>
        <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-brand transition-all duration-500" style={`width: ${progress}%`}></div>
        </div>
    </div>
    
    <div class="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {#each missions as m (m.id)}
            <div class="flex items-center gap-4 p-3 rounded-2xl border transition-all {m.isCompleted ? (m.claimed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-indigo-50 border-indigo-100 shadow-sm') : 'bg-white border-slate-100'}"
                 transition:fade
            >
                <!-- Icon -->
                <div class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.isCompleted ? (m.claimed ? 'bg-slate-200 text-slate-400' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-200') : 'bg-slate-100 text-slate-300'}`}>
                    {#if m.claimed}
                        <CheckCircle2 size={18}/>
                    {:else if m.isCompleted}
                        <Gift size={18} class="animate-bounce"/>
                    {:else}
                         {#if activeTab === 'weekly'}
                            <Calendar size={18}/>
                         {:else}
                            <Zap size={18}/>
                         {/if}
                    {/if}
                </div>
                
                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-1 gap-2">
                        <span class="font-bold text-xs text-slate-700 leading-snug break-keep">{m.desc}</span>
                        <span class="text-[9px] font-black bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">+{m.rewardXp} XP</span>
                    </div>
                    <!-- Progress -->
                    <div class="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div class="h-full transition-all duration-500 rounded-full {m.isCompleted ? 'bg-indigo-500' : 'bg-slate-300'}" style={`width: ${(m.current/m.target)*100}%`}></div>
                    </div>
                    <div class="text-[9px] text-slate-400 font-medium mt-1 text-right">
                        {m.current} / {m.target}
                    </div>
                </div>
                
                <!-- Action -->
                {#if m.isCompleted && !m.claimed}
                    <button 
                        on:click={() => claim(m.id)}
                        class="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all animate-pulse shrink-0"
                    >
                        받기
                    </button>
                {/if}
            </div>
        {/each}
        
        {#if missions.length === 0}
            <div class="h-full flex items-center justify-center text-slate-300 font-medium text-xs border-2 border-dashed border-slate-100 rounded-2xl">
                미션 로딩 중...
            </div>
        {/if}
    </div>
</div>
