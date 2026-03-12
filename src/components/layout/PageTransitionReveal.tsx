import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type Pattern = {
  cols: number;
  rows: number;
  jitter: Float32Array;
};

const CELL_SIZE = 18;
const DURATION_MS = 760;
const READY_QUIET_MS = 120;
const READY_TIMEOUT_MS = 3000;
const LIGHT_COLOR = "#F5F5F5";
const DARK_COLOR = "#171717";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function getRevealColor() {
  return document.documentElement.classList.contains("dark") ? DARK_COLOR : LIGHT_COLOR;
}

function buildPattern(cols: number, rows: number): Pattern {
  const jitter = new Float32Array(cols * rows);
  for (let i = 0; i < jitter.length; i += 1) {
    jitter[i] = Math.random();
  }
  return { cols, rows, jitter };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PageTransitionReveal() {
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const waitCleanupRef = useRef<null | (() => void)>(null);
  const activeRef = useRef(false);
  const firstRenderRef = useRef(true);
  const cycleRef = useRef(0);
  const patternRef = useRef<Pattern | null>(null);
  const startRef = useRef(0);
  const revealColorRef = useRef("");

  const getCanvasFrame = (container: HTMLElement) => {
    const marker = container.querySelector(
      '[data-transition-boundary="content-start"]',
    ) as HTMLElement | null;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (!marker) {
      return { top: 0, width: containerWidth, height: containerHeight };
    }

    const containerRect = container.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const top = clamp(markerRect.top - containerRect.top, 0, containerHeight);
    const height = Math.max(1, containerHeight - top);

    return { top, width: containerWidth, height };
  };

  const cancelWait = () => {
    waitCleanupRef.current?.();
    waitCleanupRef.current = null;
  };

  const hideCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.opacity = "0";
    canvas.style.visibility = "hidden";
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement as HTMLElement | null;
    if (!container) return;

    const frame = getCanvasFrame(container);
    const cssWidth = frame.width;
    const cssHeight = frame.height;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const width = Math.max(1, Math.floor(cssWidth * dpr));
    const height = Math.max(1, Math.floor(cssHeight * dpr));

    canvas.style.top = `${frame.top}px`;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const cols = Math.ceil(cssWidth / CELL_SIZE);
      const rows = Math.ceil(cssHeight / CELL_SIZE);
      patternRef.current = buildPattern(cols, rows);
    }
  };

  // Used only for the initial cover before waiting (not inside RAF loop).
  const paintCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = revealColorRef.current;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawReveal = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Single ctx acquisition per frame
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pattern = patternRef.current;
    if (!pattern) return;

    const { cols, rows, jitter } = pattern;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    // Cover pass — inlined, uses cached color, single ctx
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = revealColorRef.current;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reveal pass
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const idx = y * cols + x;
        const base = y / Math.max(1, rows - 1);
        const noise = ((jitter[idx] ?? 0) - 0.5) * 0.22;
        const threshold = clamp(0.04 + base * 0.9 + noise, 0, 1);
        if (progress < threshold) continue;

        ctx.fillRect(
          Math.floor(x * cellW),
          Math.floor(y * cellH),
          Math.ceil(cellW),
          Math.ceil(cellH),
        );
      }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const clearAnimation = () => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
  };

  const stop = () => {
    cycleRef.current += 1;
    clearAnimation();
    cancelWait();
    hideCanvas();
  };

  const waitForRouteReady = (cycle: number) =>
    new Promise<void>((resolve) => {
      const canvas = canvasRef.current;
      const container = canvas?.parentElement as HTMLElement | null;
      if (!canvas || !container) {
        resolve();
        return;
      }

      let quietTimer = 0;
      let hardTimer = 0;

      const cleanup = () => {
        observer.disconnect();
        clearTimeout(quietTimer);
        clearTimeout(hardTimer);
        if (waitCleanupRef.current === cleanup) waitCleanupRef.current = null;
      };

      const finish = () => { cleanup(); resolve(); };

      const scheduleQuiet = () => {
        clearTimeout(quietTimer);
        quietTimer = window.setTimeout(finish, READY_QUIET_MS);
      };

      const check = () => {
        if (cycle !== cycleRef.current) { cleanup(); return; }
        const hasBlockingLoader =
          container.querySelector('[data-route-loading="true"]') !== null;
        if (hasBlockingLoader) {
          clearTimeout(quietTimer); // hold — content still loading
        } else {
          scheduleQuiet();           // debounce: finish after quiet period
        }
      };

      const observer = new MutationObserver(check);
      observer.observe(container, { childList: true, subtree: true });
      waitCleanupRef.current = cleanup;
      hardTimer = window.setTimeout(finish, READY_TIMEOUT_MS);
      check(); // handle already-ready state immediately
    });

  const startReveal = (cycle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    clearAnimation();
    activeRef.current = true;
    startRef.current = performance.now();
    canvas.style.visibility = "visible";
    canvas.style.opacity = "1";

    const tick = (now: number) => {
      if (!activeRef.current || cycle !== cycleRef.current) return;
      const elapsed = now - startRef.current;
      const t = clamp(elapsed / DURATION_MS, 0, 1);
      drawReveal(easeOutCubic(t));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      hideCanvas();
      activeRef.current = false;
    };

    drawReveal(0);
    rafRef.current = requestAnimationFrame(tick);
  };

  const runTransition = async () => {
    if (prefersReducedMotion()) {
      stop();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const cycle = cycleRef.current + 1;
    cycleRef.current = cycle;
    clearAnimation();
    cancelWait();

    // Reset scroll before painting cover so the jump is hidden under it from frame 0
    canvas.parentElement?.scrollTo({ top: 0, behavior: "instant" });

    resizeCanvas();

    // Cache color once — can't change mid-transition
    revealColorRef.current = getRevealColor();

    canvas.style.visibility = "visible";
    canvas.style.opacity = "1";
    paintCover();

    await waitForRouteReady(cycle);
    if (cycle !== cycleRef.current) return;
    startReveal(cycle);
  };

  useEffect(() => {
    const onResize = () => {
      resizeCanvas();
      const canvas = canvasRef.current;
      if (!canvas || canvas.style.visibility !== "visible") return;

      if (activeRef.current) {
        const elapsed = performance.now() - startRef.current;
        const progress = clamp(elapsed / DURATION_MS, 0, 1);
        drawReveal(easeOutCubic(progress));
        return;
      }

      paintCover();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    void runTransition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 z-[15] opacity-0 [visibility:hidden]"
    />
  );
}
