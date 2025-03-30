import { FiX } from "react-icons/fi";
import "./Sidebar.css";

const Sidebar = ({ questions, selectedQuestion, setSelectedQuestion, isSidebarOpen, toggleSidebar, totalScore, maxScore }) => {
  return (
    <div className={`sidebar ${isSidebarOpen ? "show" : ""}`}>
      <button className="close-btn" onClick={toggleSidebar}>
      <FiX className="close-icon" />
      </button>

      <h2 className="sidebar-title">Questions</h2>
      <ul className="question-list">
        {questions.map((q, index) => (
          <li
            key={index}
            onClick={() => setSelectedQuestion(index)}
            className={`question-item ${selectedQuestion === index ? "active" : ""}`}
          >
            {q.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
