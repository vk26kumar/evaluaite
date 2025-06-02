import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./Scorecard.css";

const Scorecard = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!evaluationId) {
        console.error("🚨 Missing evaluation ID!");
        setError("Missing evaluation ID");
        setLoading(false);
        return;
      }

      try {
        console.log("📡 Fetching evaluation for ID:", evaluationId);
        const response = await axios.get(`${API_BASE_URL}/api/data`, {
          params: { id: evaluationId },
          headers: { "Content-Type": "application/json" },
        });

        console.log("📜 Evaluation Data:", response.data);
        setEvaluationData(response.data.evaluation);
      } catch (err) {
        console.error(
          "🚨 Error fetching evaluation:",
          err.response?.data?.message || err.message
        );
        setError("Failed to fetch evaluation");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [evaluationId]);

  if (loading)
    return <p className="loading-data">Loading evaluation data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!evaluationData) return <p>No evaluation data found.</p>;

  const questions = evaluationData.extractedAnswers || [];
  const marks = evaluationData.marks || [];
  const referenceAnswers = evaluationData.referenceAnswers || [];
  const comments = evaluationData.commentsArray || [];

  const currentQuestionText =
    questions[selectedQuestion] ?? "No student answer found";
  const currentMark = marks[selectedQuestion] ?? "No marks";
  const teacherAnswer =
    referenceAnswers[selectedQuestion]?.answer ?? "No reference answer";
  const studentAnswer = currentQuestionText ?? "No student answer";

  const totalObtainedMarks = marks.reduce((acc, mark) => acc + mark, 0);
  const totalPossibleMarks = referenceAnswers.length * 5;
  const calculatedScore = `${totalObtainedMarks} / ${totalPossibleMarks}`;
 
  const percentage = (totalObtainedMarks / totalPossibleMarks) * 100;


  let status = "";
  let stars = 0;

  if (percentage >= 80) {
    status = "Excellent";
    stars = 5;
  } else if (percentage >= 60) {
    status = "Good";
    stars = 4;
  } else if (percentage >= 40) {
    status = "Average";
    stars = 3;
  } else {
    status = "Poor";
    stars = 2;
  }

 
  const starDisplay = "⭐".repeat(stars) + "☆".repeat(5 - stars);

  return (
    <div className="scorecard-container">
      <Navbar />

      <button
        className="sidebar-toggle-btn"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
      >
        {isSidebarOpen ? "❮" : "❯"}
      </button>

      <div className="scorecard-main">
        {isSidebarOpen && (
          <Sidebar
            questions={referenceAnswers.map((item, i) => ({
              title: `Question ${i + 1}`,
            }))}
            selectedQuestion={selectedQuestion}
            setSelectedQuestion={setSelectedQuestion}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        )}

        <div
          className={`scorecard-content ${isSidebarOpen ? "" : "full-width"}`}
        >
          <div className="score-section">
            <h2 className="score-title">AI Evaluation Score</h2>
            <p className="score-value">
              {calculatedScore} <span className="score-total"></span>
            </p>
            <p className="score-status">
              {status}-{starDisplay}
            </p>

            <button
              className="score-btn"
              onClick={() =>
                navigate("/analysis", {
                  state: {
                    marks,
                    comments,
                    referenceAnswers,
                    insights: evaluationData.insights,
                  },
                })
              }
            >
              Detailed Analysis
            </button>
          </div>

          <div className="question-section">
            <p className="question-category">Question {selectedQuestion + 1}</p>
            <h3 className="question-title-score">
              {referenceAnswers[selectedQuestion]?.question ??
                "No question available"}
            </h3>
            <p className="question-score-label">Score Per Question</p>
            <p className="question-answer-score">
              {currentMark} <span className="question-score-total">/5</span>
            </p>
          </div>

          <div className="answers-grid">
            <div className="answer-box">
              <h4 className="answer-label">Teacher's Answer</h4>
              <p className="answer-text">{teacherAnswer}</p>
            </div>

            <div className="answer-box">
              <h4 className="answer-label">Student's Answer</h4>
              <p className="answer-text">{studentAnswer}</p>
            </div>
          </div>

          <div className="next-question">
            <button
              className="next-btn"
              onClick={() =>
                setSelectedQuestion(
                  (prev) => (prev + 1) % referenceAnswers.length
                )
              }
            >
              Next Question →
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Scorecard;
