<script lang="ts">
   import { gamification } from '$lib/stores/gamification';
   import { base } from '$app/paths';
   import { Trophy, Star } from 'lucide-svelte';
   
   $: profile = $gamification.profile;
   $: xpPercent = (profile.xp / profile.maxXp) * 100;
   
   // Rank Image Path
   $: avatarSrc = `${base}/assets/avatars/rank_${profile.rankId}.png`;
</script>

<div class="relative w-full bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 text-slate-800 shadow-xl overflow-hidden group hover:border-brand/20 transition-all">
    <!-- Background Deco -->
    <div class="absolute top-0 right-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
    
    <div class="relative z-10 flex items-center gap-6">
        <!-- Avatar -->
        <div class="relative">
            <div class="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center border-4 border-slate-50 shadow-inner overflow-hidden relative z-10">
                 <!-- Multiply blend mode helps white bg blend if not perfect, but normal is fine for pure white -->
                 <img src={avatarSrc} alt="Rank Avatar" class="w-full h-full object-cover transform scale-110 mt-3 hover:scale-125 transition-transform duration-500 origin-bottom"/>
            </div>
            <div class="absolute -bottom-2 -right-2 bg-brand text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black border-4 border-white shadow-lg z-20">
                {profile.level}
            </div>
        </div>
        
        <!-- Info -->
        <div class="flex-1 space-y-2">
            <div>
               <h4 class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Trophy size={14} class="text-yellow-500"/> Current Rank
               </h4>
               <h2 class="text-2xl md:text-3xl font-black tracking-tight text-slate-800">{profile.rankTitle}</h2>
            </div>
            
            <!-- XP Bar -->
            <div class="space-y-1">
                <div class="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>XP {profile.xp}</span>
                    <span>{profile.maxXp} NEXT</span>
                </div>
                <div class="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div class="h-full bg-gradient-to-r from-brand to-indigo-400 transition-all duration-700 ease-out rounded-full shadow-sm" style={`width: ${xpPercent}%`}></div>
                </div>
            </div>
        </div>
    </div>
</div>
