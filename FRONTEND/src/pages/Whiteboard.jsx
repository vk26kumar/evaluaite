import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCircle,
  LuDownload,
  LuEraser,
  LuHighlighter,
  LuPencil,
  LuRedo2,
  LuSlash,
  LuSquare,
  LuTrash2,
  LuUndo2,
} from "react-icons/lu";
import { useBeforeUnload, useDocumentTitle } from "../lib/hooks";
import "./whiteboard.css";

const TOOLS = [
  { id: "pen", label: "Pen", key: "p", icon: LuPencil },
  { id: "highlighter", label: "Highlighter", key: "h", icon: LuHighlighter },
  { id: "eraser", label: "Eraser", key: "e", icon: LuEraser },
  { id: "line", label: "Line", key: "l", icon: LuSlash },
  { id: "rect", label: "Rectangle", key: "r", icon: LuSquare },
  { id: "ellipse", label: "Ellipse", key: "o", icon: LuCircle },
];

const COLORS = [
  { name: "Ink", value: "#1b2130" },
  { name: "Red pen", value: "#c23a2c" },
  { name: "Blue", value: "#2f54c4" },
  { name: "Green", value: "#2b7a4b" },
  { name: "Amber", value: "#c98a12" },
];

const PAPER = "#fffdf8";
const FREEHAND = new Set(["pen", "highlighter", "eraser"]);

function drawStroke(ctx, stroke) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.globalAlpha = stroke.tool === "highlighter" ? 0.3 : 1;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.tool === "highlighter" ? stroke.size * 2.5 : stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;

  const points = stroke.points;
  const [start] = points;
  const end = points[points.length - 1];

  if (FREEHAND.has(stroke.tool)) {
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(start.x, start.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  } else if (stroke.tool === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (stroke.tool === "rect") {
    ctx.strokeRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  } else if (stroke.tool === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      Math.abs(end.x - start.x) / 2,
      Math.abs(end.y - start.y) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.restore();
}

function renderAll(canvas, strokes) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  let from = 0;
  strokes.forEach((stroke, index) => {
    if (stroke.tool === "clear") from = index + 1;
  });
  for (let i = from; i < strokes.length; i += 1) drawStroke(ctx, strokes[i]);
}

export default function Whiteboard() {
  useDocumentTitle("Whiteboard");
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const strokes = useRef([]);
  const redoStack = useRef([]);
  const current = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(4);
  const [history, setHistory] = useState({ hasContent: false, canUndo: false, canRedo: false });
  const bump = () =>
    setHistory({
      hasContent: strokes.current.some((stroke) => stroke.tool !== "clear"),
      canUndo: strokes.current.length > 0,
      canRedo: redoStack.current.length > 0,
    });
  const { hasContent, canUndo, canRedo } = history;
  useBeforeUnload(hasContent);

  useEffect(() => {
    const wrap = wrapRef.current;
    const resize = () => {
      if (!baseRef.current || !overlayRef.current) return;
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [baseRef.current, overlayRef.current]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      renderAll(baseRef.current, strokes.current);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const pointFrom = (event) => {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const clearOverlay = () => {
    const overlay = overlayRef.current;
    const ctx = overlay.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.restore();
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pressure = event.pointerType === "pen" ? 0.5 + event.pressure : 1;
    current.current = {
      tool,
      color,
      size: tool === "pen" ? size * pressure : size,
      points: [pointFrom(event)],
    };
    if (tool === "eraser") drawStroke(baseRef.current.getContext("2d"), current.current);
    else drawStroke(overlayRef.current.getContext("2d"), current.current);
  };

  const onPointerMove = (event) => {
    const stroke = current.current;
    if (!stroke) return;
    const events = event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent];

    if (FREEHAND.has(stroke.tool)) {
      for (const e of events) stroke.points.push(pointFrom(e));
    } else {
      stroke.points = [stroke.points[0], pointFrom(event)];
    }

    if (stroke.tool === "eraser") {
      drawStroke(baseRef.current.getContext("2d"), stroke);
    } else {
      clearOverlay();
      drawStroke(overlayRef.current.getContext("2d"), stroke);
    }
  };

  const onPointerUp = () => {
    const stroke = current.current;
    if (!stroke) return;
    current.current = null;
    clearOverlay();
    strokes.current.push(stroke);
    redoStack.current = [];
    if (stroke.tool !== "eraser") drawStroke(baseRef.current.getContext("2d"), stroke);
    bump();
  };

  const undo = useCallback(() => {
    const stroke = strokes.current.pop();
    if (!stroke) return;
    redoStack.current.push(stroke);
    renderAll(baseRef.current, strokes.current);
    bump();
  }, []);

  const redo = useCallback(() => {
    const stroke = redoStack.current.pop();
    if (!stroke) return;
    strokes.current.push(stroke);
    renderAll(baseRef.current, strokes.current);
    bump();
  }, []);

  const clear = useCallback(() => {
    if (!strokes.current.some((stroke) => stroke.tool !== "clear")) return;
    strokes.current.push({ tool: "clear", points: [] });
    redoStack.current = [];
    renderAll(baseRef.current, strokes.current);
    bump();
  }, []);

  const exportPng = () => {
    const base = baseRef.current;
    const out = document.createElement("canvas");
    out.width = base.width;
    out.height = base.height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(base, 0, 0);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
    const link = document.createElement("a");
    link.download = `whiteboard-${stamp}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest("input, textarea, select, [contenteditable]")) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        event.preventDefault();
        redo();
      } else if (!mod && !event.altKey) {
        const match = TOOLS.find((t) => t.key === key);
        if (match) setTool(match.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);


  return (
    <div className="board-page">
      <div className="board-toolbar" role="toolbar" aria-label="Whiteboard tools">
        <div className="tool-group" role="radiogroup" aria-label="Tool">
          {TOOLS.map(({ id, label, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tool === id}
              className="tool-button"
              onClick={() => setTool(id)}
              title={`${label} (${key.toUpperCase()})`}
              aria-label={label}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>

        <span className="tool-divider" aria-hidden="true" />

        <div className="tool-group" role="radiogroup" aria-label="Colour">
          {COLORS.map((swatch) => (
            <button
              key={swatch.value}
              type="button"
              role="radio"
              aria-checked={color === swatch.value}
              className="swatch"
              style={{ "--swatch": swatch.value }}
              onClick={() => setColor(swatch.value)}
              title={swatch.name}
              aria-label={swatch.name}
              disabled={tool === "eraser"}
            />
          ))}
          <label className="swatch swatch-custom" title="Custom colour">
            <span className="sr-only">Custom colour</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={tool === "eraser"} />
          </label>
        </div>

        <span className="tool-divider" aria-hidden="true" />

        <label className="size-control">
          <span className="sr-only">Size</span>
          <span className="size-preview" style={{ "--dot": `${Math.max(4, Math.min(size, 22))}px` }} aria-hidden="true" />
          <input
            type="range"
            min="1"
            max="24"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            aria-label="Stroke size"
          />
        </label>

        <div className="spacer" />

        <div className="tool-group">
          <button type="button" className="tool-button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <LuUndo2 aria-hidden="true" />
          </button>
          <button type="button" className="tool-button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <LuRedo2 aria-hidden="true" />
          </button>
          <button type="button" className="tool-button" onClick={clear} disabled={!hasContent} title="Clear board" aria-label="Clear board">
            <LuTrash2 aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-sm btn-ink" onClick={exportPng} disabled={!hasContent}>
            <LuDownload aria-hidden="true" /> PNG
          </button>
        </div>
      </div>

      <div className="board-surface" ref={wrapRef} data-tool={tool}>
        <canvas ref={baseRef} className="board-canvas" aria-hidden="true" />
        <canvas
          ref={overlayRef}
          className="board-canvas board-input"
          role="img"
          aria-label="Drawing area. Use the toolbar or keyboard shortcuts to change tools."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {!hasContent && (
          <p className="board-hint" aria-hidden="true">
            <span className="hand">Start sketching…</span>
            <span className="board-shortcuts">P pen · H highlighter · E eraser · L line · R rectangle · O ellipse</span>
          </p>
        )}
      </div>
    </div>
  );
}
