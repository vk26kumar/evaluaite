import React from "react";
import { useLocation } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./DetailedAnalysis.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DetailedAnalysis = () => {
  const location = useLocation();
  const { marks, comments, referenceAnswers, insights } = location.state || {};

  if (!marks || !comments || !referenceAnswers || !insights) {
    return <p>⚠️ No data available for detailed analysis.</p>;
  }

  // Chart Data
  const data = {
    labels: referenceAnswers.map((item, index) => `Q${index + 1}`),
    datasets: [
      {
        label: "Score",
        data: marks,
        backgroundColor: "#1E88E5",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div>
      <Navbar />
      <div className="analysis-container">
        <h1 className="analysis-title">Analysis Report</h1>
        <p className="analysis-subtitle">
          Detailed breakdown of your AI evaluation
        </p>

        <div className="performance-section">
          <h2>📊 Performance by Question</h2>
          <div className="chart-container">
            <Bar data={data} options={options} />
          </div>
        </div>

        <div className="insights-section">
          <h2>🧠 AI Insights</h2>
          <p className="insight-description"></p>
          <div className="insight-categories">
            <div className="strengths">
              <h3>✔ Strengths</h3>
              <ul>
                {insights.positives.map((positive, index) => (
                  <li key={index}>{positive}</li>
                ))}
              </ul>
            </div>
            <div className="improvements">
              <h3>⚠ Weakness</h3>
              <ul>
                {insights.negatives.map((negative, index) => (
                  <li key={index}>{negative}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="questions-section-analysis">
          {referenceAnswers.map((q, index) => (
            <div key={index} className="question-card-analysis">
              <span className="question-badge-analysis">
                Question {index + 1}
              </span>
              <h3 className="question-title-analysis">{q.question}</h3>
              <p className="question-score-analysis">
                <strong>Score:</strong> {marks[index]} / 5
              </p>
              <p className="question-comment-analysis">
                <strong>Comment:</strong>{" "}
                {comments[index] || "No comment available"}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DetailedAnalysis;
