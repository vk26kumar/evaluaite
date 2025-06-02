import { useEffect, useRef, useState } from "react";
import "./Board.css";
import Navbar from "./Navbar";

const Board = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#00ffcc");
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [shape, setShape] = useState("freehand");
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = 1000;
    canvas.height = 600;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = isEraser ? "#f6f4f2" : color;
      ctxRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth, isEraser]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setStartPos({ x: offsetX, y: offsetY });

    if (shape === "freehand") {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(offsetX, offsetY);
    }

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;

    if (shape === "freehand") {
      ctxRef.current.lineTo(offsetX, offsetY);
      ctxRef.current.stroke();
    } else {
      redrawCanvas(); 
      ctxRef.current.beginPath();
      ctxRef.current.strokeStyle = isEraser ? "#f6f4f2" : color;

      if (shape === "rectangle") {
        ctxRef.current.strokeRect(
          startPos.x,
          startPos.y,
          offsetX - startPos.x,
          offsetY - startPos.y
        );
      } else if (shape === "circle") {
        const radius = Math.sqrt(
          Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2)
        );
        ctxRef.current.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctxRef.current.stroke();
      } else if (shape === "line") {
        ctxRef.current.moveTo(startPos.x, startPos.y);
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();
      }
    }
  };

  const stopDrawing = () => {
    ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    redrawCanvas();
  };

  return (
    <>
    <Navbar/>
    <div className="board">
      <div className="whiteboard-container">
        <div className="board-card">
          <canvas
            ref={canvasRef}
            className="canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
          <div className="controls">
            <label>
              Color:
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isEraser}
              />
            </label>
            <label>
              Brush Size:
              <input
                type="range"
                min="2"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(e.target.value)}
              />
            </label>
            <label>
              Shape:
              <select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option value="freehand">Freehand</option>
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="line">Line</option>
              </select>
            </label>
            <button onClick={() => setIsEraser(!isEraser)}>
              {isEraser ? "Pen Mode" : "Eraser Mode"}
            </button>
            <button onClick={clearCanvas} className="clear-btn">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Board;