import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Modal.css";

const Modal = ({ onClose }) => {
    const [showModal, setShowModal] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === "/") {
            setShowModal(true);
        }
    }, []);

    if (!showModal) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <span className="close-btn" onClick={() => {
                    setShowModal(false);
                    onClose();
                }}>&times;</span>
                <h2>Welcome to <span className="highlight">EvaluAIte</span></h2>
                <p>Vishal Kumar - CSE</p>
                <button className="cta" onClick={() => {
                    setShowModal(false);
                    onClose();
                }}>OK</button>
            </div>
        </div>
    );
};

export default Modal;
