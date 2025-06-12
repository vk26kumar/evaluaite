import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Navbar.css";
import Board from "./Board";
import logo from "./assets/image.png"; 


function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate(); 

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    if (tokenFromUrl) {
      localStorage.setItem("token", tokenFromUrl);
      window.history.replaceState(null, "", window.location.pathname); 
      setIsLoggedIn(true);
    } else {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    }
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <div className="app">
      <nav className={`navbar content ${isScrolled ? "scrolled" : ""}`}>
        <div className="logo">
          <img
            src={logo}
            alt="Evaluate Logo"
            className="logo-animate"
            style={{ height: "60px", verticalAlign: "start" }}
          />
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          &#9776;
        </button>

        <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
          <li><a href="/">Dashboard</a></li>
          <li><Link to="/forms">Forms</Link></li>
          <li><Link to="/Board">White Board</Link></li>
          <li><Link to="/TopicPPTGenerator">Generate PPT<span className="new-badge">New</span></Link></li>
        </ul>
        
        {isLoggedIn ? (
          <button className="sign-up" onClick={handleLogout}>Logout</button>
        ) : (
          <button className="sign-up" onClick={() => navigate("/signup")}>Sign Up</button>
        )}

        {menuOpen && (
          <div className="mobile-menu">
            <ul>
              <li><a href="/">Dashboard</a></li>
              <li><Link to="/forms">Forms</Link></li>
              <li><Link to="/Board">White Board</Link></li>
              <li><Link to="/TopicPPTGenerator">Generate PPT<span className="new-badge">New</span></Link></li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}

export default Navbar;
