import { useEffect, useRef, useState } from "react";
import "./Board.css";
import Navbar from "./Navbar";

const Board = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000"); // default to black
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [shape, setShape] = useState("freehand");
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const savedImage = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    window.addEventListener("resize", () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = isEraser ? "#f6f4f2" : color;
      ctxRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth, isEraser]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches
      ? e.touches[0].clientX
      : e.nativeEvent.offsetX + rect.left;
    const clientY = e.touches
      ? e.touches[0].clientY
      : e.nativeEvent.offsetY + rect.top;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    setStartPos({ x, y });

    if (shape === "freehand") {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
    } else {
      savedImage.current = ctxRef.current.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    if (shape === "freehand") {
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    } else {
      ctxRef.current.putImageData(savedImage.current, 0, 0);
      ctxRef.current.beginPath();
      ctxRef.current.strokeStyle = isEraser ? "#f6f4f2" : color;

      if (shape === "rectangle") {
        ctxRef.current.strokeRect(
          startPos.x,
          startPos.y,
          x - startPos.x,
          y - startPos.y
        );
      } else if (shape === "circle") {
        const radius = Math.sqrt(
          Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
        );
        ctxRef.current.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctxRef.current.stroke();
      } else if (shape === "line") {
        ctxRef.current.moveTo(startPos.x, startPos.y);
        ctxRef.current.lineTo(x, y);
        ctxRef.current.stroke();
      }
    }
  };

  const stopDrawing = () => {
    ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <>
      <Navbar />
      <div className="whiteboard-container">
        <div className="board-card">
          <canvas
            ref={canvasRef}
            className="canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="controls">
            <label>
              Color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isEraser}
              />
            </label>
            <label>
              Size
              <input
                type="range"
                min="2"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(e.target.value)}
              />
            </label>
            <label>
              Mode
              <select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option value="freehand">Freehand</option>
                <option value="rectangle">Rect</option>
                <option value="circle">Circle</option>
                <option value="line">Line</option>
              </select>
            </label>
            <button onClick={() => setIsEraser(!isEraser)}>
              {isEraser ? "Pen" : "Eraser"}
            </button>
            <button onClick={clearCanvas} className="clear-btn">
              Clear
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Board;