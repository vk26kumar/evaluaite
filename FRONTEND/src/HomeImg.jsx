import { useState, useEffect } from "react";
import "./HomeImg.css"; 
import image1 from "./assets/hom.png"; 
import image2 from "./assets/hom1.png";


const HomeImg = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = [image1, image2];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="slider">
      {images.map((img, index) => (
        <img 
          key={index} 
          src={img} 
          alt={`slide-${index}`} 
          className={`slider-image ${index === currentImage ? "active" : ""}`} 
        />
      ))}
    </div>
  );
};

export default HomeImg;
