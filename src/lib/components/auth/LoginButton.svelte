<script lang="ts">
    import { authStore } from '$lib/stores/auth';
    import { LogIn, LogOut, User as UserIcon } from 'lucide-svelte';

    $: user = $authStore.user;
    $: loading = $authStore.loading;

    // derived helpers
    $: photoUrl = user?.photoURL;
    $: displayName = user?.displayName;
</script>

{#if loading}
    <div class="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
{:else if user}
    <div class="group relative flex items-center gap-3">
        <div class="text-right hidden sm:block">
            <div class="text-xs font-black text-slate-700">{displayName}</div>
            <div class="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Online & Synced</div>
        </div>
        <!-- Avatar -->
        {#if photoUrl}
            <img src={photoUrl} alt="User" class="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
        {:else}
            <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                <UserIcon size={16} />
            </div>
        {/if}

        <!-- Dropdown (Simple Logout on Hover/Click for now, or just a button next to it) -->
        <button 
            on:click={() => authStore.logout()} 
            class="hidden group-hover:flex absolute top-full right-0 mt-2 bg-white px-4 py-2 rounded-xl shadow-xl border border-slate-100 text-xs font-bold text-rose-500 hover:bg-rose-50 transition min-w-[120px] items-center gap-2 z-50">
            <LogOut size={14}/> Logout
        </button>
    </div>
{:else}
    <button 
        on:click={() => authStore.loginWithGoogle()} 
        class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition shadow-lg flex items-center gap-2"
    >
        <LogIn size={14} class="text-indigo-300"/> 
        <span>Sign In</span>
    </button>
{/if}
