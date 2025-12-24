<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth";
  import {
    Home,
    PenTool,
    BookOpen,
    History,
    HelpCircle,
    LogIn,
    LogOut,
    User as UserIcon,
    Trophy,
  } from "lucide-svelte";
  import MissionPopup from "$lib/components/MissionPopup.svelte";
  import MissionBoard from "$lib/components/MissionBoard.svelte";

  import { isMissionBoardOpen } from "$lib/stores/ui";

  // Navigation items
  const navItems = [
    { path: "/", icon: Home, label: "HOME" },
    { path: "/settings", icon: PenTool, label: "EXAM" },
    { path: "/review", icon: BookOpen, label: "MEMO" },
    { path: "/history", icon: History, label: "LOGS" },
  ];

  $: currentPath = $page.url.pathname;
  $: user = $authStore.user;

  function handleLogin() {
    authStore.login();
  }

  function handleLogout() {
    if (confirm("Log out?")) {
      authStore.logout();
    }
  }
</script>

<div class="min-h-screen relative font-sans text-[#333] flex flex-col">
  <!-- Top Bar (Login Status) -->
  {#if user}
    <div
      class="bg-black text-white px-4 py-1 text-[10px] font-bold flex justify-between items-center z-50"
    >
      <span class="truncate flex items-center gap-1">
        <div class="w-2 h-2 bg-[#99FF99] rounded-full animate-pulse"></div>
        Logged in as {user.displayName}
      </span>
      <button class="hover:text-[#FF66CC] uppercase" on:click={handleLogout}
        >Logout</button
      >
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 pb-20">
    <slot />
  </main>

  <!-- Retro Taskbar Navigation -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-[#C0C0C0] border-t-2 border-white shadow-[inset_0_1px_0_#FFF]"
  >
    <div class="border-t-2 border-[#808080] p-1 flex justify-around items-end">
      {#each navItems as item}
        <button
          class="flex flex-col items-center gap-1 px-2 py-1 min-w-[50px] active:translate-y-[1px]
                           {currentPath === item.path
            ? 'bg-[#E0E0E0] border-2 border-[#808080] border-b-white border-r-white shadow-[inset_1px_1px_0_#000]'
            : 'bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0_#000]'}"
          on:click={() => goto(item.path)}
        >
          <svelte:component
            this={item.icon}
            size={20}
            class={currentPath === item.path ? "text-[#FF66CC]" : "text-[#333]"}
          />
          <span class="text-[9px] font-bold font-pixel tracking-wide"
            >{item.label}</span
          >
        </button>
      {/each}

      <!-- Login/Profile Button (Right aligned in concept, but space distributed here) -->
      {#if !user}
        <button
          class="flex flex-col items-center gap-1 px-2 py-1 min-w-[50px] active:translate-y-[1px]
                           bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0_#000]"
          on:click={handleLogin}
        >
          <LogIn size={20} class="text-blue-600" />
          <span class="text-[9px] font-bold font-pixel tracking-wide"
            >LOGIN</span
          >
        </button>
      {/if}
    </div>
  </nav>

  <MissionPopup />
  <MissionBoard bind:show={$isMissionBoardOpen} />
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
