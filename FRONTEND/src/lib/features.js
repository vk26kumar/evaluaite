import { LuFileText, LuHistory, LuPenLine, LuPresentation, LuSquarePen, LuUserRound } from "react-icons/lu";

export const FEATURES = [
  {
    to: "/evaluate",
    label: "Grade",
    icon: LuSquarePen,
    title: "Grade answer sheets",
    blurb: "Upload a handwritten sheet and your answer key. Get marks and feedback for every point.",
  },
  {
    to: "/assignments",
    label: "Assignments",
    icon: LuFileText,
    title: "Create question papers",
    blurb: "Generate a full paper with sections, marks and an answer key, then download it as a PDF.",
  },
  {
    to: "/evaluations",
    label: "History",
    icon: LuHistory,
    title: "Graded sheets",
    blurb: "Every sheet you've graded, with scores, feedback and your changes.",
  },
  {
    to: "/slides",
    label: "Slides",
    icon: LuPresentation,
    title: "Lecture slides",
    blurb: "Type a topic and download a PowerPoint deck with speaker notes.",
  },
  {
    to: "/whiteboard",
    label: "Whiteboard",
    icon: LuPenLine,
    title: "Classroom whiteboard",
    blurb: "Sketch and annotate, then save a PNG.",
  },
];

const EXTRA_DESTINATIONS = [{ to: "/profile", label: "your profile", icon: LuUserRound }];

export function destinationLabel(path = "") {
  const match = [...FEATURES, ...EXTRA_DESTINATIONS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((feature) => path === feature.to || path.startsWith(`${feature.to}/`));
  return match?.label || null;
}
