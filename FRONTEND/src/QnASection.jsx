import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaPlus, FaTimes, FaMagic } from "react-icons/fa";
import "./QnASection.css";

const QnASection = ({ onReferenceChange }) => {
  const [questions, setQuestions] = useState([{ question: "", answer: "" }]);
  const [loadingStates, setLoadingStates] = useState({});

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

  const addQuestion = () => {
    const newQuestions = [...questions, { question: "", answer: "" }];
    setQuestions(newQuestions);
    updateReferenceAnswers(newQuestions);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    updateReferenceAnswers(updatedQuestions);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = [...questions];
    const [movedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedItem);

    setQuestions(reordered);
    updateReferenceAnswers(reordered);
  };

  const updateReferenceAnswers = (newQ) => {
    onReferenceChange(newQ.map(({ question, answer }) => ({ question, answer })));
  };

  const generateAIAnswer = async (index) => {
    const questionText = questions[index].question.trim();
    if (!questionText) return;

    setLoadingStates((prev) => ({ ...prev, [index]: true }));

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: questionText }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API Error:", errorData);
        throw new Error("Gemini API call failed");
      }

      const data = await response.json();

      const aiAnswer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "Couldn't generate an answer.";

      const newQ = [...questions];
      newQ[index].answer = aiAnswer;
      setQuestions(newQ);
      updateReferenceAnswers(newQ);
    } catch (error) {
      console.error("Error generating AI answer:", error);
      alert("Failed to generate answer. Please check your Gemini API key or try again later.");
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
                      <button
                        className="ai-btn"
                        onClick={() => generateAIAnswer(index)}
                        disabled={loadingStates[index]}
                      >
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
