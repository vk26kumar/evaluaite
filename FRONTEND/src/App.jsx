import { useState, useEffect } from "react";
import {
  HashRouter as Router,  // ⬅️ Use HashRouter instead of BrowserRouter
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import HeroSection from "./HeroSection";
import Footer from "./Footer";
import WhyChoose from "./WhyChoose";
import Modal from "./Modal";
import Form from "./Form";
import Signup from "./Signup";
import Login from "./Login";
import Scorecard from "./Scorecard";
import DetailAnalysis from "./DetailedAnalysis";
import Board from "./Board";
import Features from "./Features";
import TopicPPTGenerator from "./TopicPPTGenerator";

function App() {
  const [modalOpen, setModalOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/signup" replace />;
  };

  return (
    <Router> 
      <div>{modalOpen && <Modal onClose={() => setModalOpen(false)} />}</div>

      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <>
              <HeroSection />
              <WhyChoose />
              <Features />
              <Footer />
            </>
          }
        />
        <Route
          path="/forms"
          element={
            <ProtectedRoute>
              <Form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scorecard/:evaluationId"
          element={
            <ProtectedRoute>
              <Scorecard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Board"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <DetailAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/TopicPPTGenerator"
          element={
            <ProtectedRoute>
              <TopicPPTGenerator />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
