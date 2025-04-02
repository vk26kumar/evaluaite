import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import { FaGoogle } from "react-icons/fa";

import Navbar from "./Navbar";
import Footer from "./Footer";
import "./Signup.css";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://ai-evaluaite.onrender.com";

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      setError("All fields are required");
      return;
    }
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/"); 
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      setError("Something went wrong");
    }
  };

  const handleGoogleLogin = () => {
    window.open(`${API_BASE_URL}/api/auth/google`, "_self");
  };

  return (
    <div className="signup-container">
      <Navbar />
      <div className="signup-wrapper">
        <div className="signup-box">
          <div className="signup-left">
            HELLO <br /> WELCOME!
          </div>

          <div className="signup-right">
            <h2>Sign Up</h2>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="input-group-signup">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group-signup">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group-signup">
                <FaLock className="input-icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="signup-button">
                Sign Up
              </button>
            </form>

            <p className="or-continue-with">or continue with</p>
            <div className="google-login-container">
              <button onClick={handleGoogleLogin} className="google-button">
                <FaGoogle className="google-icon" />
              </button>
            </div>

            <p className="login-link">
              Already have an account?{" "}
              <a className="highlight-login" href="/login">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Signup;
