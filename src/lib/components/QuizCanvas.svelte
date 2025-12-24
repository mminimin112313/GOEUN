<script lang="ts">
    import { onMount } from "svelte";

    export let color = "#ef4444"; // Red-500
    export let lineWidth = 3;
    export let enabled = false;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let scrollZone: HTMLDivElement;

    // Pointer State
    let activePointers = new Map<number, { x: number; y: number }>();
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isDrawing = false;
    let isInScrollZone = false;
    let points: { x: number; y: number }[] = [];

    // Constants
    const TAP_TIMEOUT = 500; // ms
    const TAP_DISTANCE = 15; // px
    const DRAW_THRESHOLD = 10; // px to engage drawing

    // Resize Observer
    let resizeObserver: ResizeObserver;

    onMount(() => {
        ctx = canvas.getContext("2d");
        if (!ctx) return;

        resize();

        resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(canvas.parentElement || document.body);

        return () => resizeObserver.disconnect();
    });

    function resize() {
        if (!canvas || !canvas.parentElement) return;
        const parent = canvas.parentElement;

        const dpr = window.devicePixelRatio || 1;

        // Use scrollHeight to cover the entire scrollable content area
        canvas.width = parent.offsetWidth * dpr;
        canvas.height = parent.scrollHeight * dpr;

        canvas.style.width = `${parent.offsetWidth}px`;
        canvas.style.height = `${parent.scrollHeight}px`;

        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
        }
    }

    $: if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
    }

    function getPos(e: PointerEvent) {
        const bbox = canvas.getBoundingClientRect();
        return {
            x: e.clientX - bbox.left,
            y: e.clientY - bbox.top,
        };
    }

    function isPointInScrollZone(clientX: number): boolean {
        if (!scrollZone) return false;
        const rect = scrollZone.getBoundingClientRect();
        return clientX >= rect.left;
    }

    function handleStart(e: PointerEvent) {
        if (!enabled) return;

        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);

        // Multi-touch scroll detection
        if (activePointers.size >= 2) {
            isDrawing = false;
            points = [];
            return;
        }

        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
        isInScrollZone = isPointInScrollZone(e.clientX);

        if (isInScrollZone) {
            canvas.releasePointerCapture(e.pointerId);
            return;
        }

        const { x, y } = getPos(e);
        points = [{ x, y }];
    }

    function handleMove(e: PointerEvent) {
        if (!enabled || !ctx || isInScrollZone) return;

        const prev = activePointers.get(e.pointerId);
        if (prev) {
            // Multi-finger scroll logic
            if (activePointers.size >= 2) {
                const dx = e.clientX - prev.x;
                const dy = e.clientY - prev.y;
                window.scrollBy(-dx * 1.5, -dy * 1.5);
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                return;
            }
        }
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (e.buttons !== 1 || activePointers.size >= 2) return;

        const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY);

        if (!isDrawing && moveDist > DRAW_THRESHOLD) {
            isDrawing = true;
        }

        if (isDrawing) {
            const { x, y } = getPos(e);
            points.push({ x, y });

            if (points.length > 2) {
                const p1 = points[points.length - 3];
                const p2 = points[points.length - 2];
                const p3 = points[points.length - 1];

                const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

                ctx.beginPath();
                ctx.moveTo(mid1.x, mid1.y);
                ctx.quadraticCurveTo(p2.x, p2.y, mid2.x, mid2.y);
                ctx.stroke();
            }
        }
    }

    function handleEnd(e: PointerEvent) {
        if (!enabled) return;

        activePointers.delete(e.pointerId);
        canvas.releasePointerCapture(e.pointerId);

        if (isInScrollZone) {
            isInScrollZone = false;
            return;
        }

        if (activePointers.size > 0) return;

        const duration = Date.now() - startTime;
        const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY);

        // SMART TAP DETECTION
        if (duration < TAP_TIMEOUT && moveDist < TAP_DISTANCE) {
            handleSmartTap(e.clientX, e.clientY);
        } else if (isDrawing && points.length > 1) {
            // Final segment
            const pLast = points[points.length - 1];
            const pPrev = points[points.length - 2];
            ctx?.beginPath();
            ctx?.moveTo(pPrev.x, pPrev.y);
            ctx?.lineTo(pLast.x, pLast.y);
            ctx?.stroke();
        }

        isDrawing = false;
        points = [];
        isInScrollZone = false;
    }

    function handleSmartTap(clientX: number, clientY: number) {
        // Toggle canvas pointer events to peek
        const originalPE = canvas.style.pointerEvents;
        canvas.style.pointerEvents = "none";

        const el = document.elementFromPoint(clientX, clientY);

        canvas.style.pointerEvents = originalPE;

        if (el) {
            const clickable = el.closest(
                'button, a, input, label, [role="button"]',
            );
            const target = (clickable || el) as HTMLElement;

            // Dispatch full mouse event sequence for maximum compatibility
            const eventInit: MouseEventInit = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
                screenX: clientX,
                screenY: clientY,
            };

            target.dispatchEvent(new MouseEvent("mousedown", eventInit));
            target.dispatchEvent(new MouseEvent("mouseup", eventInit));
            target.click();

            // Also pointer events for modern listeners
            target.dispatchEvent(
                new PointerEvent("pointerdown", { ...eventInit, pointerId: 1 }),
            );
            target.dispatchEvent(
                new PointerEvent("pointerup", { ...eventInit, pointerId: 1 }),
            );
        }
    }

    export function clear() {
        if (!ctx || !canvas) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    export function save(): string {
        return canvas ? canvas.toDataURL() : "";
    }

    export function load(dataUrl: string) {
        if (!ctx || !canvas) return;
        clear();

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            ctx!.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        };
    }
</script>

<canvas
    bind:this={canvas}
    class="absolute inset-0 z-20 touch-none"
    style:pointer-events={enabled ? "auto" : "none"}
    style:cursor={enabled ? "crosshair" : "auto"}
    on:pointerdown={handleStart}
    on:pointermove={handleMove}
    on:pointerup={handleEnd}
    on:pointercancel={handleEnd}
></canvas>

{#if enabled}
    <div
        bind:this={scrollZone}
        class="absolute right-0 top-0 bottom-0 w-12 z-30 touch-pan-y flex flex-col justify-center items-center opacity-30 hover:opacity-80 transition-opacity bg-slate-900/10 backdrop-blur-[1px] border-l border-slate-900/5"
    >
        <div class="space-y-1">
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
        </div>
    </div>
{/if}
