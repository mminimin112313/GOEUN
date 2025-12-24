<script lang="ts">
    import { onMount, tick } from "svelte";
    import { PenTool, Eraser, Trash2, X } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";

    export let enabled = false;
    export let strokeColor = "#FF0000"; // Red pen by default
    export let strokeWidth = 2;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let container: HTMLElement | null = null;

    // Tools
    let tool: "pen" | "eraser" = "pen";

    onMount(() => {
        // Find parent container to attach to (assuming parent has relative position)
        container = canvas.parentElement;
        if (container) {
            resizeCanvas();
            const resizeObserver = new ResizeObserver(() => resizeCanvas());
            resizeObserver.observe(container);

            return () => resizeObserver.disconnect();
        }
    });

    function resizeCanvas() {
        if (!canvas || !container) return;
        // Match the scroll dimensions of the container
        canvas.width = container.scrollWidth;
        canvas.height = container.scrollHeight;

        // Re-setup context after resize (it resets)
        if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = tool === "eraser" ? "#ffffff" : strokeColor; // Eraser acts as white out? Or composite operation?
            ctx.lineWidth = strokeWidth;
        }
    }

    function getCoords(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!enabled) return;
        e.preventDefault(); // Prevent scrolling while drawing
        isDrawing = true;

        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;

        if (!ctx) ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            if (tool === "eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = 20;
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
            }
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !enabled || !ctx) return;
        e.preventDefault();

        const { x, y } = getCoords(e);

        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        isDrawing = false;
        if (ctx) ctx.closePath();
    }

    function clearCanvas() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
</script>

<div
    class={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ${enabled ? "opacity-100" : "opacity-0"}`}
>
    <canvas
        bind:this={canvas}
        class={`w-full h-full ${enabled ? "pointer-events-auto cursor-crosshair" : ""}`}
        on:mousedown={startDrawing}
        on:mousemove={draw}
        on:mouseup={stopDrawing}
        on:mouseleave={stopDrawing}
        on:touchstart={startDrawing}
        on:touchmove={draw}
        on:touchend={stopDrawing}
    ></canvas>

    <!-- Floating Toolbar -->
    {#if enabled}
        <div
            class="absolute top-4 right-4 flex flex-col gap-2 bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 pointer-events-auto"
            transition:fly={{ x: 20, duration: 300 }}
        >
            <button
                on:click={() => (tool = "pen")}
                class={`p-2 rounded-lg transition ${tool === "pen" ? "bg-red-100 text-red-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
                <PenTool size={20} />
            </button>
            <button
                on:click={() => (tool = "eraser")}
                class={`p-2 rounded-lg transition ${tool === "eraser" ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-50"}`}
            >
                <Eraser size={20} />
            </button>
            <button
                on:click={clearCanvas}
                class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
            >
                <Trash2 size={20} />
            </button>
            <div class="w-full h-[1px] bg-slate-200 my-1"></div>
            <button
                on:click={() => (enabled = false)}
                class="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition"
            >
                <X size={20} />
            </button>
        </div>
    {/if}
</div>

<style>
    /* Ensure canvas sits correctly */
    canvas {
        touch-action: none;
    }
</style>
