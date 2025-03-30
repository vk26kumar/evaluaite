import React, { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./TopicPPTGenerator.css";

const TopicPPTGenerator = () => {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topic.trim() === "") {
      alert("Please enter a topic!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PPT");
      }

      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Generated_PPT_${topic}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PPT:", error);
      alert("Failed to generate PPT. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="ppt-container">
        <h2>Generate a PowerPoint</h2>
        <p>Enter a topic, and we'll create a structured PPT for you.</p>
        <form onSubmit={handleSubmit} className="ppt-form">
          <input
            type="text"
            placeholder="Enter topic for PPT..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="ppt-input"
          />
          <button type="submit" className="ppt-button" disabled={loading}>
            {loading ? "Generating..." : "Generate PPT"}
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default TopicPPTGenerator;
