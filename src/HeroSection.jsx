import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./HeroSection.css";
import HomeImg from "./HomeImg";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";

function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <Navbar />
      <main className="hero">
        <motion.div
          className="promo-badge"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        >
          ⭐ Revolutionizing Student Assessment with AI 🚀
        </motion.div>

        <motion.h1
          animate={{
            x: [-5, 5, -5], 
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity, 
            repeatType: "reverse",
          }}
        >
          AI Automated <span className="highlight">Evaluation</span>
        </motion.h1>

        <motion.p
          className="text"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        >
          Instant, Accurate, and Fair Evaluation of Answer Sheets Using AI-Powered Technology.
          <br />
          <br />
          <motion.span
            className="text2"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          >
            Upload, Analyze, and Get Smart Grading Insights in Seconds!
          </motion.span>
        </motion.p>

        <HomeImg />

        <motion.button
          className="cta"
          onClick={() => navigate("/forms")}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.8,
            type: "spring",
            stiffness: 100,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Let’s dive in!
        </motion.button>
      </main>
    </div>
  );
}

export default HeroSection;
