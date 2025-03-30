import { useState, useEffect } from "react";
import "./HeroSection.css"
import HomeImg from "./homeImg";
import Navbar from "./Navbar";
import {useNavigate} from "react-router-dom";

function HeroSection() {

    const navigate = useNavigate(); 

  return (
    <div className="app">
    <Navbar/>
      <main className="hero">
        <div className="promo-badge">Revolutionizing Student Assessment with AI </div>
        <h1>AI Automated <span className="highlight">Evaluation</span></h1>
        <p className="text">
          Instant, Accurate, and Fair Evaluation of Answer Sheets Using AI-Powered Technology.<br/><br/>
          <span className="text2">Upload, Analyze, and Get Smart Grading Insights in Seconds!</span>
        </p>

        <HomeImg />
        <button className="cta" onClick={() => navigate("/forms")}>Let’s dive in!</button>
      </main>
    </div>
  );
}

export default HeroSection;
