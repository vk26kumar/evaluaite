import React from "react";
import "./WhyChoose.css";

const WhyChoose = () => {
  const points = [
    "Instant & Accurate AI Grading",
    "Fair & Bias-Free Evaluation",
    "Reduces Teacher Workload",
    "Detailed Performance Insights",
    "Faster Results Processing",
  ];
  

  return (
    <section className="why-choose-section">
      <h2 className="section-title">Why Choose AI <span className="highlight">Evaluation System?</span></h2>
      <div className="cards-container">
        {points.map((point, index) => (
          <div key={index} className={`card card-${index % 2 === 0 ? "left" : "right"}`}>
            <p>{point}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyChoose;
