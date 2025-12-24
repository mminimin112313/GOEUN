<script lang="ts">
  import { fade } from 'svelte/transition';

  export let data: { date: string, accuracy: number }[];
  
  const w = 800;
  const h = 200;
  const padding = 20;

  // Helpers for Bezier Curves
  function getControlPoint(current: number[], previous: number[], next: number[], reverse = false) {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    
    // Properties of the opposed-line
    const oX = n[0] - p[0];
    const oY = n[1] - p[1];
    const oLength = Math.sqrt(Math.pow(oX, 2) + Math.pow(oY, 2));
    const oAngle = Math.atan2(oY, oX);

    // Control point position relative to the current point
    const angle = oAngle + (reverse ? Math.PI : 0);
    const length = oLength * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    
    return [x, y];
  }

  function getBezierPath(points: number[][]) {
     if (points.length === 0) return "";
     if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

     let d = `M ${points[0][0]} ${points[0][1]}`;
     
     for (let i = 0; i < points.length - 1; i++) {
        const p_start = points[i];
        const p_end = points[i + 1];
        
        const cp1 = getControlPoint(p_start, points[i - 1], p_end);
        const cp2 = getControlPoint(p_end, p_start, points[i + 2], true);
        
        d += ` C ${cp1[0]} ${cp1[1]}, ${cp2[0]} ${cp2[1]}, ${p_end[0]} ${p_end[1]}`;
     }
     return d;
  }

  // Reactive Logic
  $: points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * w; // Prevent divide by zero
    const y = h - (d.accuracy / 100) * h;
    return [x, y];
  });

  $: linePath = getBezierPath(points);
  $: areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`; // Close path for fill

  let hoveredIndex: number | null = null;
</script>

{#if !data || data.length < 2}
  <div class="h-[300px] flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-50 rounded-[2rem]">
    <div class="w-12 h-12 bg-slate-50 rounded-full animate-pulse"></div>
    <span class="text-xs font-bold">데이터를 모으는 중입니다...</span>
  </div>
{:else}
  <div class="w-full h-[300px] relative group select-none">
    <svg viewBox={`0 -20 ${w} ${h + 40}`} class="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="var(--color-action)" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="var(--color-action)" stop-opacity="0"/>
            </linearGradient>
            <!-- Passing Line Pattern -->
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" stroke-width="1"/>
            </pattern>
        </defs>

        <!-- Reference Line (60%) -->
        <line x1="0" x2={w} y1={h * 0.4} y2={h * 0.4} stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4" />
        <text x={w} y={h * 0.4 - 5} text-anchor="end" font-size="10" fill="#94a3b8" font-weight="bold">GOAL 60%</text>

        <!-- Area Fill -->
        <path d={areaPath} fill="url(#chartGradient)" />

        <!-- Line Stroke -->
        <path d={linePath} fill="none" stroke="var(--color-action)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />

        <!-- Interactive Points -->
         {#each points as [x, y], i}
             <!-- Hover Target Area (Invisible) -->
             <!-- svelte-ignore a11y-no-static-element-interactions -->
             <!-- svelte-ignore a11y-mouse-events-have-key-events -->
             <rect 
                x={x - (w / data.length / 2)} 
                y="-20" 
                width={w / data.length} 
                height={h + 40} 
                fill="transparent"
                on:mouseenter={() => hoveredIndex = i}
                on:mouseleave={() => hoveredIndex = null}
             />
             
             <!-- Visible Point -->
             <circle 
                cx={x} cy={y} 
                r={hoveredIndex === i ? 6 : 4} 
                class="fill-white stroke-action transition-all duration-300"
                stroke-width={hoveredIndex === i ? 3 : 2} 
             />
         {/each}
    </svg>

    <!-- Tooltip Overlay -->
    {#if hoveredIndex !== null}
        {@const d = data[hoveredIndex]}
        {@const [px, py] = points[hoveredIndex]}
        <div 
            class="absolute bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl border border-white/10 flex flex-col items-center gap-0.5 z-20 pointer-events-none transition-all duration-100"
            style="left: {(px / w) * 100}%; top: {(py / h) * 100}%; transform: translate(-50%, -140%);"
            transition:fade={{ duration: 100 }}
        >
            <span class="text-lg font-black text-action-300 leading-none">{d.accuracy}%</span>
            <span class="text-[10px] font-bold text-slate-400">{d.date}</span>
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/10"></div>
        </div>
    {/if}
  </div>
{/if}
