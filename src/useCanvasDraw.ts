import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export function useCanvasDraw(canvasRef: RefObject<HTMLCanvasElement>) {
  const [imageData, setImageData] = useState<number[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const dprRef = useRef(1);

  // Ensure canvas internal pixels match CSS size * devicePixelRatio
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const rect = canvas.getBoundingClientRect();
    // Keep the visual size controlled by CSS (e.g., style width/height).
    // Match internal buffer to CSS * DPR.
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset transforms before scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr); // now 1 unit == 1 CSS px
    ctxRef.current = ctx;

    // Init styles in CSS pixel units
    ctx.lineWidth = 24;
    ctx.strokeStyle = "black";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill background (after any resize, since resize clears)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.beginPath();
  }, [canvasRef]);

  const getImageData = useCallback(
    (targetSize = 28): number[] => {
      const canvas = canvasRef.current;
      if (!canvas) return [];

      // 1) Copy current canvas pixels at native resolution
      const fullW = canvas.width;
      const fullH = canvas.height;
      if (!fullW || !fullH) return [];
      const copyCanvas = document.createElement("canvas");
      copyCanvas.width = fullW;
      copyCanvas.height = fullH;
      const copyCtx = copyCanvas.getContext("2d");
      if (!copyCtx) return [];
      copyCtx.drawImage(canvas, 0, 0);

      // 2) Find bounding box of non-white pixels
      const src = copyCtx.getImageData(0, 0, fullW, fullH);
      let minX = fullW,
        minY = fullH,
        maxX = -1,
        maxY = -1;
      const threshold = 0.1; // intensity threshold in [0,1]
      for (let y = 0; y < fullH; y++) {
        for (let x = 0; x < fullW; x++) {
          const idx = (y * fullW + x) * 4;
          const r = src.data[idx];
          const g = src.data[idx + 1];
          const b = src.data[idx + 2];
          const gray = (r + g + b) / 3;
          const intensity = 1 - gray / 255; // black stroke -> high intensity
          if (intensity > threshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If nothing drawn, return zeros
      if (maxX < minX || maxY < minY) {
        return new Array(targetSize * targetSize).fill(0);
      }

      // 3) Add a margin around the bounding box
      const bboxW = maxX - minX + 1;
      const bboxH = maxY - minY + 1;
      const margin = Math.floor(0.15 * Math.max(bboxW, bboxH)); // 15% margin
      const cropX = Math.max(0, minX - margin);
      const cropY = Math.max(0, minY - margin);
      const cropW = Math.min(fullW - cropX, bboxW + 2 * margin);
      const cropH = Math.min(fullH - cropY, bboxH + 2 * margin);

      // 4) Scale so the largest side fits into 24px (MNIST-like), keep aspect
      const fitSize = 24;
      const scale = Math.min(1, fitSize / Math.max(cropW, cropH));
      const scaledW = Math.max(1, Math.round(cropW * scale));
      const scaledH = Math.max(1, Math.round(cropH * scale));
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = scaledW;
      scaledCanvas.height = scaledH;
      const scaledCtx = scaledCanvas.getContext("2d");
      if (!scaledCtx) return [];
      scaledCtx.imageSmoothingEnabled = true;
      scaledCtx.drawImage(
        copyCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        scaledW,
        scaledH
      );

      // 5) Compute center of mass on the scaled image
      const scaledImg = scaledCtx.getImageData(0, 0, scaledW, scaledH);
      let sumI = 0;
      let sumX = 0;
      let sumY = 0;
      for (let y = 0; y < scaledH; y++) {
        for (let x = 0; x < scaledW; x++) {
          const idx = (y * scaledW + x) * 4;
          const r = scaledImg.data[idx];
          const g = scaledImg.data[idx + 1];
          const b = scaledImg.data[idx + 2];
          const gray = (r + g + b) / 3;
          const intensity = 1 - gray / 255;
          if (intensity > 0) {
            // use pixel center (x+0.5, y+0.5)
            sumI += intensity;
            sumX += (x + 0.5) * intensity;
            sumY += (y + 0.5) * intensity;
          }
        }
      }
      const cx = sumI > 0 ? sumX / sumI : scaledW / 2;
      const cy = sumI > 0 ? sumY / sumI : scaledH / 2;

      // 6) Place scaled image into 28x28 so that COM is centered at (14,14)
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetSize;
      finalCanvas.height = targetSize;
      const finalCtx = finalCanvas.getContext("2d");
      if (!finalCtx) return [];
      // white background
      finalCtx.fillStyle = "white";
      finalCtx.fillRect(0, 0, targetSize, targetSize);
      finalCtx.imageSmoothingEnabled = true;
      const targetCenter = targetSize / 2;
      let drawX = Math.round(targetCenter - cx);
      let drawY = Math.round(targetCenter - cy);
      // clamp to stay within 28x28
      drawX = Math.min(Math.max(0, drawX), targetSize - scaledW);
      drawY = Math.min(Math.max(0, drawY), targetSize - scaledH);
      finalCtx.drawImage(scaledCanvas, drawX, drawY);

      // 7) Read out normalized grayscale (invert: white->0, black->1)
      const finalImg = finalCtx.getImageData(0, 0, targetSize, targetSize);
      const result: number[] = new Array(targetSize * targetSize);
      for (let i = 0, j = 0; i < finalImg.data.length; i += 4, j++) {
        const r = finalImg.data[i];
        const g = finalImg.data[i + 1];
        const b = finalImg.data[i + 2];
        const gray = (r + g + b) / 3;
        let value = 1 - gray / 255;
        // clamp
        if (value < 0) value = 0;
        else if (value > 1) value = 1;
        result[j] = value;
      }
      return result;
    },
    [canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas();

    const ctx = ctxRef.current!;
    // Pointer coords in CSS pixels (since we scaled the context)
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        const touch = e.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      if ("touches" in e) e.preventDefault();
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return;
      if ("touches" in e) e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const endDraw = () => {
      if (!drawing.current) return;
      drawing.current = false;
      ctx.beginPath(); // reset path
      setImageData(getImageData());
    };

    // Redo setup if the canvas element resizes (e.g., responsive layout)
    const ro = new ResizeObserver(() => setupCanvas());
    ro.observe(canvas);

    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);

    // Touch events (passive:false so we can prevent scrolling)
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [canvasRef, getImageData, setupCanvas]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.beginPath();
    setImageData([]);
  };

  return { clear, getImageData, setupCanvas, imageData };
}
