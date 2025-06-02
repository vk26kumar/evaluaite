import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Upload from "./Upload";
import QnASection from "./QnASection";
import Difficulty from "./Difficulty";
import Footer from "./Footer";
import { FaCheckCircle } from "react-icons/fa";
import axios from "axios";
import "./Form.css";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Form() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [referenceAnswers, setReferenceAnswers] = useState([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = (file) => setUploadedFile(file);

  const handleReferenceAnswers = (qna) => {
    const formattedQnA = qna.map(({ question, answer }) => ({ question, answer }));
    setReferenceAnswers(formattedQnA);
  };

  const handleDifficultyChange = (level) => setDifficulty(level);

  const handleSubmit = async () => {
    if (!uploadedFile || referenceAnswers.length === 0) {
      alert("Please upload a file and add at least one question.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("referenceAnswers", JSON.stringify(referenceAnswers));
      formData.append("difficulty", difficulty);

      const response = await axios.post(`${API_BASE_URL}/api/evaluations`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ API Response:", response.data);

      const evaluationId = response.data?.id || response.data?._id; 
      if (!evaluationId) {
        throw new Error("Missing evaluation ID in response");
      }

      setSuccess(true);
      navigate(`/scorecard/${evaluationId}`);
    } catch (error) {
      console.error("🚨 Error Uploading Evaluation:", error.response?.data || error.message);
      alert(`Error submitting evaluation: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="form-hero">
        <h1 className="form-title">
          AI Automated <span className="highlight">Evaluation</span>
        </h1>
        <p className="form-text">
          Upload your document, add questions and answers, <br />
          and let our AI evaluate your responses with precision.
        </p>

        <div className="upload-promo-badge">Document Upload</div>
        <Upload onFileUpload={handleFileUpload} />
      </main>

      <QnASection onReferenceChange={handleReferenceAnswers} />
      <Difficulty onDifficultyChange={handleDifficultyChange} />

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Submit for Evaluation"}
      </button>
      <Footer />
    </>
  );
}
