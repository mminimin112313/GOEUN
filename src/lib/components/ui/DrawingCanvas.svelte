<script lang="ts">
    import { onMount } from "svelte";

    export let color = "#ef4444"; // Red-500
    export let lineWidth = 3;
    export let enabled = false;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let rect: DOMRect;

    // Tap Detection
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isDrawing = false;
    let points: { x: number; y: number }[] = [];

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
        rect = parent.getBoundingClientRect();

        // High DPI Support
        const dpr = window.devicePixelRatio || 1;

        canvas.width = parent.offsetWidth * dpr;
        canvas.height = parent.offsetHeight * dpr;

        canvas.style.width = `${parent.offsetWidth}px`;
        canvas.style.height = `${parent.offsetHeight}px`;

        if (ctx) {
            ctx.scale(dpr, dpr); // Normalize coordinate system
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
        }
        // NOTE: Resize clears the canvas. Often we might want to restore content here, but for now we assume resize effectively resets view.
    }

    // Reactive styles
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

    // Touch Handling (Scroll vs Draw)
    // --------------------------------------------------------------------------------
    // We want "2-finger scroll" even if canvas has touch-none.
    // Strategy: Track active pointers. If >= 2, disable drawing and scroll manually.
    let activePointers = new Map<number, { x: number; y: number }>();

    function handleStart(e: PointerEvent) {
        if (!enabled) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);

        // If this is the second finger (or more), cancel drawing immediately!
        if (activePointers.size >= 2) {
            isDrawing = false;
            points = [];
            return;
        }

        const { x, y } = getPos(e);
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
        isDrawing = false;

        points = [{ x, y }];
    }

    function handleMove(e: PointerEvent) {
        if (!enabled || !ctx) return;

        // Update this pointer's position
        const prev = activePointers.get(e.pointerId);
        if (prev) {
            // Scroll Logic: If >= 2 pointers, calculate delta of THIS pointer and scroll window
            if (activePointers.size >= 2) {
                const dx = e.clientX - prev.x;
                const dy = e.clientY - prev.y;
                window.scrollBy(-dx * 2.0, -dy * 2.0); // Multiplier 2.0 for 2x faster scrolling

                // Update stored pos for next frame
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                return;
            }
        }
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (e.buttons !== 1) return;

        // If we are effectively scrolling (multi-touch currently or recently), don't draw
        if (activePointers.size >= 2) return;

        const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY);

        // Increased jitter tolerance before engaging drawing mode (was 5)
        if (!isDrawing && moveDist > 10) {
            isDrawing = true;
        }

        if (isDrawing) {
            const { x, y } = getPos(e);
            points.push({ x, y });

            // Smooth Drawing (Quadratic Curve)
            if (points.length > 2) {
                const lastTwo = points.slice(-2);
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

        // If we were scrolling (had multiple pointers), just exit
        // But what if one lifted and one remains? We shouldn't suddenly start drawing a dot.
        // For simplicity: only handle tap/draw if we ended with 0 remaining pointers (or just this one)
        // AND we never had multi-touch in this session? (That requires more state).
        // Let's iterate: if we still have pointers, we are probably still multi-touching or transitioning.
        if (activePointers.size > 0) return;

        const endTime = Date.now();
        const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY);

        // Tap Detection: If movement is small (<15px), treat as tap even if isDrawing momentarily triggered
        // This fixes the "swallowed click" issue where slight pointer jitters were treated as drawings.
        if (moveDist < 15 && endTime - startTime < 500) {
            // Clear any tiny accidental strokes that might have been drawn
            if (isDrawing && points.length > 0) {
                // Unfortunately we can't easily undo the canvas stroke without a complex history,
                // but visually a 10px dot is negligible or acceptable trade-off for click reliability.
                // Ideally we could restore, but for now let's prioritize the Action.
            }
            handleSmartTap(e.clientX, e.clientY);
        } else if (isDrawing) {
            // Finish the last segment
            if (points.length > 1 && ctx) {
                const pLast = points[points.length - 1];
                const pPrev = points[points.length - 2];
                ctx.beginPath();
                ctx.moveTo(pPrev.x, pPrev.y);
                ctx.lineTo(pLast.x, pLast.y);
                ctx.stroke();
            }
        }

        isDrawing = false;
        points = [];
    }

    function handleSmartTap(x: number, y: number) {
        // 1. Temporarily disable canvas to peek below
        canvas.style.pointerEvents = "none";

        // 2. Find element at coordinates
        const el = document.elementFromPoint(x, y);

        // 3. Re-enable canvas immediately (will be effectively instant) - wait, if we are in an event handler,
        // we might want to keep it persistent for a microtask to be safe?
        // No, elementFromPoint is synchronous. We can restore immediately.
        // But for safety against "double firing" or race conditions, let's restore in next frame.
        // Actually, if we restore too fast, does manual click pass through?
        // manual .click() is synchronous and programmatic, it doesn't care about pointer-events of other layers.

        if (el) {
            // Traverse up to find a button or interactive element
            const clickable = el.closest(
                'button, a, input, label, [role="button"]',
            );

            if (clickable && clickable instanceof HTMLElement) {
                // Focus if needed
                if (["INPUT", "TEXTAREA"].includes(clickable.tagName)) {
                    clickable.focus();
                }

                // Trigger click
                clickable.click();

                // Optional: Dispatch mousedown/mouseup for frameworks that listen to those?
                // Svelte's on:click is standard optimization. .click() should be sufficient.
            } else if (el instanceof HTMLElement) {
                // Fallback: Click the exact element found (e.g. a div with onclick)
                el.click();
            }
        }

        // 4. Restore pointer events
        canvas.style.pointerEvents = "auto"; // Restore basic state
    }

    export function clear() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Note: Resets transformed pixels? No, with scale it works fine
        // Actually clearRect in transformed context clears the transformed rect.
        // But resetTransform might be safer if we want to clear everything absolute.
        // For simplicity:
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Persistence Methods
    export function save(): string {
        return canvas ? canvas.toDataURL() : "";
    }

    export function load(dataUrl: string) {
        if (!ctx || !canvas) return;
        clear();

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            // Image is in device pixels/raw size. Canvas is scaled.
            // We need to drawImage covering the 0,0,width,height space
            // But since we are scaled, we should draw at logical size?
            // Actually toDataURL capture the full resolution.
            // drawImage(img, 0, 0, width/dpr, height/dpr) if context is scaled.
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
    <!-- Dedicated Scroll Zone (Right Edge) -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="absolute right-0 top-0 bottom-0 w-12 z-30 touch-pan-y flex flex-col justify-center items-center opacity-30 hover:opacity-80 transition-opacity bg-slate-900/5 backdrop-blur-[1px] border-l border-slate-900/5 group"
    >
        <div class="space-y-1">
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
            <div class="w-1 h-8 bg-slate-400 rounded-full mx-auto"></div>
        </div>
    </div>
{/if}
