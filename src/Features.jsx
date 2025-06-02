import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import "./Features.css";

const Features = () => {
  const features = [
    "AI-powered Marks Evaluation",
    "AI Answer Generation",
    "Detailed Student Analysis",
    "Interactive Whiteboard",
    "AI-driven Insights",
    "PPT Auto-Generator",
  ];

  const { ref, inView } = useInView({
    triggerOnce: false, 
    threshold: 0.2, 
  });

  return (
    <div ref={ref} className="features-container">
      <motion.h2
        initial={{ opacity: 0, y: -30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Features Used
      </motion.h2>
      
      <div className="features-grid">
        {features.map((feature, index) => (
          <motion.div
          key={index}
          className="feature-box"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          whileInView={{
            y: [0, -5, 5, 0], // Floating motion
          }}
          transition={{
            duration: 2, // Smooth floating animation
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
            delay: index * 0.1, 
          }}
        >
          {feature}
        </motion.div>
        
        ))}
      </div>
    </div>
  );
};

export default Features;
