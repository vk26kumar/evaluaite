import React from "react";
import "./Features.css"

const Features = () => {
  const features = [
    "AI-powered marks evaluation",
    "AI answer generation",
    "Detailed analysis of students",
    "Whiteboard",
    "AI insights",
    "PPT Generator",
  ];

  return (
    <div className="features-container">
      <h2>Features Used</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-box">
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features;
