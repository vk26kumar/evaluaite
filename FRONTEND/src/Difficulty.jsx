import React, { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Difficulty.css";

const Difficulty = ({ onDifficultyChange }) => {
  const [difficulty, setDifficulty] = useState("Medium");

  return (
    <div className="difficulty-container">
      <label className="difficulty-label">Set Difficulty Level</label>
      <select
        className="difficulty-select"
        value={difficulty}
        onChange={(e) => {
          setDifficulty(e.target.value);
          onDifficultyChange(e.target.value);
        }}
      >
        <option value="Easy">Easy - Basic check</option>
        <option value="Medium">Medium - Thorough analysis</option>
        <option value="Tough">Tough - Detailed evaluation</option>
      </select>
    </div>
  );
};

export default Difficulty;
