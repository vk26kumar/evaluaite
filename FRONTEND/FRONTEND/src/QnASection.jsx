import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaPlus, FaTimes, FaMagic } from "react-icons/fa";
import "./QnASection.css";

const QnASection = ({ onReferenceChange }) => {
  const [questions, setQuestions] = useState([{ question: "", answer: "" }]);
  const [loadingStates, setLoadingStates] = useState({});

  
  const addQuestion = () => {
    setQuestions([...questions, { question: "", answer: "" }]);
    updateReferenceAnswers([...questions, { question: "", answer: "" }]);
  };

 
  const removeQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    updateReferenceAnswers(updatedQuestions);
  };

 
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(questions);
    const [movedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedItem);

    setQuestions(reordered);
    updateReferenceAnswers(reordered);
  };

  
  const updateReferenceAnswers = (newQ) => {
    onReferenceChange(newQ.map(({ question, answer }) => ({ question, answer })));
  };

  
  const API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;

  const generateAIAnswer = async (index) => {
    const questionText = questions[index].question;
    if (!questionText.trim()) return;

    setLoadingStates((prev) => ({ ...prev, [index]: true }));

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ inputs: `Answer this question: ${questionText}` }),
      });

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        let aiAnswer = data[0]?.generated_text || "Couldn't generate an answer.";

        aiAnswer = aiAnswer.replace(questionText, "").trim();
        aiAnswer = aiAnswer.replace(/Answer this question:\s*/i, "").trim();
        aiAnswer = aiAnswer.replace(/Answer:\s*/i, "").trim();

        const newQ = [...questions];
        newQ[index].answer = aiAnswer;
        setQuestions(newQ);
        updateReferenceAnswers(newQ);
      } else {
        console.error("Unexpected API response format:", data);
      }
    } catch (error) {
      console.error("Error generating AI answer:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="qna-container">
      <h2>Q&A Panel</h2>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="qnaList">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((q, index) => (
                <Draggable key={index} draggableId={index.toString()} index={index}>
                  {(provided) => (
                    <div
                      className="qna-box"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="qna-header">
                        <h3>Question {index + 1}</h3>
                        <button onClick={() => removeQuestion(index)}>
                          <FaTimes />
                        </button>
                      </div>
                      <textarea
                        placeholder="Enter your question here..."
                        value={q.question}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[index].question = e.target.value;
                          setQuestions(newQ);
                          updateReferenceAnswers(newQ);
                        }}
                      />
                      <h3>Answer {index + 1}</h3>
                      <textarea
                        className="answer-input"
                        placeholder="Enter the answer here..."
                        value={loadingStates[index] ? "Generating answer..." : q.answer}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[index].answer = e.target.value;
                          setQuestions(newQ);
                          updateReferenceAnswers(newQ);
                        }}
                      />
                      <button className="ai-btn" onClick={() => generateAIAnswer(index)}>
                        <FaMagic /> Generate Answer with AI
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button className="add-btn" onClick={addQuestion}>
        <FaPlus /> Add More
      </button>
    </div>
  );
};

export default QnASection;
