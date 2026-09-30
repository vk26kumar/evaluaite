import { useEffect, useRef, useState } from "react";
import {
  LuBookOpen,
  LuBriefcase,
  LuDownload,
  LuGlobe,
  LuGraduationCap,
  LuPresentation,
  LuWandSparkles,
} from "react-icons/lu";
import { request } from "../lib/api";
import { useToast } from "../context/contexts";
import { useDocumentTitle } from "../lib/hooks";
import Field from "../components/Field";
import "./slides.css";

const AUDIENCES = [
  { value: "school", label: "School", icon: LuBookOpen, hint: "Plain language, everyday examples" },
  { value: "university", label: "University", icon: LuGraduationCap, hint: "Technical terms, a worked example" },
  { value: "professional", label: "Professional", icon: LuBriefcase, hint: "Practical use and trade-offs" },
  { value: "general", label: "General", icon: LuGlobe, hint: "No background assumed" },
];

const STAGES = ["Outlining the lecture…", "Writing the slides…", "Adding speaker notes…", "Laying out the deck…"];

const SUGGESTIONS = ["Photosynthesis", "Database normalisation", "Newton's laws of motion", "The French Revolution"];

function fileNameFrom(response, fallback) {
  const header = response.headers.get("Content-Disposition") || "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1]);
  const plain = header.match(/filename="([^"]+)"/i);
  return plain ? plain[1] : fallback;
}

export default function Slides() {
  useDocumentTitle("Slides");
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("general");
  const [slideCount, setSlideCount] = useState(6);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => () => resultRef.current && URL.revokeObjectURL(resultRef.current.url), []);

  useEffect(() => {
    if (!generating) return undefined;
    const timer = setInterval(() => setStage((value) => Math.min(value + 1, STAGES.length - 1)), 4500);
    return () => clearInterval(timer);
  }, [generating]);

  const download = (file) => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (topic.trim().length < 3) {
      setError("Describe the topic in a few words.");
      return;
    }
    setError("");
    setStage(0);
    setGenerating(true);
    try {
      const response = await request("/api/slides", {
        method: "POST",
        body: { topic: topic.trim(), audience, slideCount },
        raw: true,
        timeout: 150_000,
      });
      const blob = await response.blob();
      if (result) URL.revokeObjectURL(result.url);
      const file = {
        url: URL.createObjectURL(blob),
        name: fileNameFrom(response, "lecture.pptx"),
        topic: topic.trim(),
        slides: slideCount + 2,
        size: blob.size,
      };
      setResult(file);
      download(file);
      toast.success("Your deck is ready.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container container-narrow page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Slides</p>
          <h1>Lecture slides from a topic</h1>
          <p>Get a PowerPoint deck with a title slide, content slides, speaker notes and key takeaways.</p>
        </div>
      </header>

      <form className="slides-form card card-pad" onSubmit={onSubmit} noValidate>
        <Field label="Topic" error={error} hint="Be specific: “Causes of World War I” beats “History”.">
          {(props) => (
            <input
              {...props}
              className="input input-lg"
              placeholder="e.g. Database normalisation and the three anomalies"
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setError("");
              }}
              maxLength={200}
              autoFocus
            />
          )}
        </Field>

        {!topic && (
          <div className="suggestions" aria-label="Example topics">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" className="suggestion" onClick={() => setTopic(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <fieldset className="audience">
          <legend className="field-label">Audience</legend>
          <div className="audience-grid">
            {AUDIENCES.map(({ value, label, icon: Icon, hint }) => (
              <label key={value} className="audience-option" data-selected={audience === value || undefined}>
                <input
                  type="radio"
                  name="audience"
                  value={value}
                  checked={audience === value}
                  onChange={() => setAudience(value)}
                  className="sr-only"
                />
                <Icon aria-hidden="true" />
                <span className="audience-label">{label}</span>
                <span className="audience-hint">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field-label" htmlFor="slide-count">
            <span>Content slides</span>
            <span className="slide-count mono">{slideCount}</span>
          </label>
          <input
            id="slide-count"
            className="range"
            type="range"
            min="3"
            max="12"
            value={slideCount}
            onChange={(event) => setSlideCount(Number(event.target.value))}
            style={{ "--fill": `${((slideCount - 3) / 9) * 100}%` }}
          />
          <p className="field-hint">Plus a title slide and a closing slide.</p>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={generating}>
          {generating ? (
            <>
              <span className="spinner" style={{ "--size": "16px" }} aria-hidden="true" /> {STAGES[stage]}
            </>
          ) : (
            <>
              <LuWandSparkles aria-hidden="true" /> Generate deck
            </>
          )}
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {generating ? STAGES[stage] : ""}
        </p>
      </form>

      {result && (
        <div className="slides-result card card-pad">
          <div className="slides-result-icon" aria-hidden="true">
            <LuPresentation />
          </div>
          <div className="slides-result-body">
            <p className="slides-result-title">{result.name}</p>
            <p className="muted">
              {result.slides} slides on “{result.topic}”. Review the facts before presenting.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => download(result)}>
            <LuDownload aria-hidden="true" /> Download again
          </button>
        </div>
      )}
    </div>
  );
}
