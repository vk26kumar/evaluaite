const path = require("path");
const PDFDocument = require("pdfkit");
const { QUESTION_TYPES } = require("../constants/questionTypes");

const FONT_DIR = path.join(__dirname, "..", "..", "assets", "fonts");
const FONTS = {
  regular: path.join(FONT_DIR, "DejaVuSans.ttf"),
  bold: path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
  italic: path.join(FONT_DIR, "DejaVuSans-Oblique.ttf"),
};

const INK = "#111111";
const MUTED = "#555555";
const RULE = "#999999";
const MARGIN = { top: 50, bottom: 64, left: 54, right: 54 };

const formatMarks = (value) => Number(value).toLocaleString("en", { maximumFractionDigits: 1 });
const plural = (count, word) => `${formatMarks(count)} ${word}${Number(count) === 1 ? "" : "s"}`;

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function renderPaperPdf(assignment, { variant = "student" } = {}) {
  const teacher = variant === "teacher";
  const doc = new PDFDocument({
    size: "A4",
    margins: MARGIN,
    bufferPages: true,
    info: {
      Title: `${assignment.title}${teacher ? " (teacher's copy)" : ""}`,
      Subject: `${assignment.subject} · ${assignment.className}`,
      Author: assignment.schoolName || "AI-EvaluAIte",
      Creator: "AI-EvaluAIte",
    },
  });
  const initOptions = doc._initOptions.bind(doc);
  doc._initOptions = (...args) => {
    const options = initOptions(...args);
    if (options.features === undefined) options.features = { liga: false, clig: false };
    return options;
  };

  doc.registerFont("regular", FONTS.regular);
  doc.registerFont("bold", FONTS.bold);
  doc.registerFont("italic", FONTS.italic);

  const left = MARGIN.left;
  const width = doc.page.width - MARGIN.left - MARGIN.right;
  const bottomLimit = () => doc.page.height - MARGIN.bottom;

  const ensureSpace = (height) => {
    if (doc.y + height > bottomLimit()) doc.addPage();
  };

  const rule = (color = RULE, weight = 0.75) => {
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(color).lineWidth(weight).stroke();
  };

  const centered = (text, font, size, color = INK, gap = 2) => {
    doc.font(font).fontSize(size).fillColor(color).text(text, left, doc.y, { width, align: "center" });
    doc.moveDown(gap / 10);
  };

  if (assignment.schoolName) centered(assignment.schoolName, "bold", 15);
  centered(assignment.title, "bold", 12);
  centered(`Subject: ${assignment.subject}     Class: ${assignment.className}`, "regular", 10, MUTED, 6);
  doc.moveDown(0.3);
  rule(INK, 1);
  doc.moveDown(0.5);

  const metaY = doc.y;
  doc.font("bold").fontSize(10).fillColor(INK);
  doc.text(`Time allowed: ${assignment.timeAllowed}`, left, metaY, { width: width / 2 });
  doc.text(`Maximum marks: ${formatMarks(assignment.totalMarks)}`, left + width / 2, metaY, { width: width / 2, align: "right" });
  if (assignment.dueDate) {
    doc.font("regular").fillColor(MUTED).text(`Due: ${formatDate(assignment.dueDate)}`, left, metaY, { width, align: "center" });
  }
  doc.y = metaY + 16;
  rule();
  doc.moveDown(0.8);

  if (teacher) {
    const bannerY = doc.y;
    doc.rect(left, bannerY, width, 20).fill("#EDEDED");
    doc.font("bold").fontSize(9).fillColor(INK).text("TEACHER'S COPY  ·  ANSWER KEY AT THE END", left, bannerY + 5, {
      width,
      align: "center",
      characterSpacing: 0.6,
    });
    doc.y = bannerY + 30;
  } else {
    const field = (label, x, y, fieldWidth) => {
      doc.font("regular").fontSize(10).fillColor(INK).text(label, x, y, { lineBreak: false });
      const start = x + doc.widthOfString(label) + 6;
      doc.moveTo(start, y + 11).lineTo(x + fieldWidth, y + 11).strokeColor(INK).lineWidth(0.6).stroke();
    };
    const y1 = doc.y;
    field("Name:", left, y1, width * 0.64);
    field("Roll no.:", left + width * 0.68, y1, width * 0.32);
    const y2 = y1 + 24;
    field("Class & section:", left, y2, width * 0.64);
    field("Date:", left + width * 0.68, y2, width * 0.32);
    doc.y = y2 + 30;
  }

  const instructions = assignment.paper.generalInstructions || [];
  if (instructions.length) {
    doc.font("bold").fontSize(10.5).fillColor(INK).text("General instructions", left, doc.y);
    doc.moveDown(0.25);
    instructions.forEach((line, index) => {
      const y = doc.y;
      doc.font("regular").fontSize(9.5).fillColor(INK).text(`${index + 1}.`, left, y, { width: 16 });
      doc.text(line, left + 16, y, { width: width - 16, lineGap: 1.5 });
      doc.moveDown(0.15);
    });
    doc.moveDown(0.6);
  }

  const numberWidth = 28;
  const marksWidth = 36;
  const textX = left + numberWidth;
  const textWidth = width - numberWidth - marksWidth;

  for (const section of assignment.paper.sections) {
    const count = section.questions.length;
    const each = section.questions[0]?.marks ?? 0;
    const sectionMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);

    ensureSpace(80);
    doc.moveDown(0.4);
    centered(`SECTION ${section.label}`, "bold", 11.5);
    centered(section.title, "bold", 10);
    centered(
      `${section.instruction}  (${count} × ${formatMarks(each)} = ${plural(sectionMarks, "mark")})`,
      "italic",
      9,
      MUTED,
      6
    );
    doc.moveDown(0.4);

    for (const q of section.questions) {
      doc.font("regular").fontSize(10.5);
      const textHeight = doc.heightOfString(q.text, { width: textWidth, lineGap: 2 });

      const labels = ["A", "B", "C", "D"];
      const twoColumns = q.options.length > 0 && q.options.every((option) => option.length <= 42);
      const optionWidth = twoColumns ? textWidth / 2 - 6 : textWidth;
      doc.fontSize(10);
      const optionHeights = q.options.map((option, i) =>
        doc.heightOfString(`${labels[i]})  ${option}`, { width: optionWidth - 4, lineGap: 1 })
      );
      const optionsHeight = q.options.length
        ? twoColumns
          ? Math.max(optionHeights[0] || 0, optionHeights[1] || 0) + Math.max(optionHeights[2] || 0, optionHeights[3] || 0) + 10
          : optionHeights.reduce((sum, h) => sum + h + 3, 0) + 4
        : 0;

      ensureSpace(Math.min(textHeight + optionsHeight + 12, bottomLimit() - MARGIN.top));
      const y = doc.y;

      doc.font("bold").fontSize(10.5).fillColor(INK).text(`${q.number}.`, left, y, { width: numberWidth });
      doc.font("regular").fontSize(9.5).fillColor(MUTED).text(`[${formatMarks(q.marks)}]`, left + width - marksWidth, y + 1, {
        width: marksWidth,
        align: "right",
      });
      doc.font("regular").fontSize(10.5).fillColor(INK).text(q.text, textX, y, { width: textWidth, lineGap: 2 });

      if (q.options.length) {
        doc.moveDown(0.25);
        doc.fontSize(10).fillColor(INK);
        if (twoColumns) {
          for (let row = 0; row < 2; row += 1) {
            const rowY = doc.y;
            let rowHeight = 0;
            for (let col = 0; col < 2; col += 1) {
              const i = row * 2 + col;
              if (!q.options[i]) continue;
              doc.text(`${labels[i]})  ${q.options[i]}`, textX + col * (optionWidth + 12), rowY, {
                width: optionWidth - 4,
                lineGap: 1,
              });
              rowHeight = Math.max(rowHeight, optionHeights[i]);
            }
            doc.y = rowY + rowHeight + 3;
          }
        } else {
          q.options.forEach((option, i) => {
            doc.text(`${labels[i]})  ${option}`, textX, doc.y, { width: optionWidth - 4, lineGap: 1 });
            doc.moveDown(0.15);
          });
        }
      }
      doc.moveDown(0.7);
    }
  }

  ensureSpace(40);
  doc.moveDown(0.6);
  centered("— End of question paper —", "italic", 9, MUTED);

  if (teacher) {
    doc.addPage();
    doc.font("bold").fontSize(14).fillColor(INK).text("Answer key and marking scheme", left, doc.y);
    doc.font("regular").fontSize(9.5).fillColor(MUTED).text(
      `${assignment.title} · ${assignment.subject} · ${assignment.className}. Use this as the marking scheme; it is also the model answer used for AI grading.`,
      left,
      doc.y + 4,
      { width }
    );
    doc.moveDown(0.8);
    rule();
    doc.moveDown(0.8);

    for (const section of assignment.paper.sections) {
      ensureSpace(50);
      doc.font("bold").fontSize(10.5).fillColor(INK).text(`Section ${section.label} · ${QUESTION_TYPES[section.type].label}`, left, doc.y);
      doc.moveDown(0.4);

      for (const q of section.questions) {
        doc.font("regular").fontSize(10);
        const answer = q.answer || "(No answer provided.)";
        const height = doc.heightOfString(answer, { width: textWidth + marksWidth, lineGap: 1.5 }) + 18;
        ensureSpace(Math.min(height, bottomLimit() - MARGIN.top));

        const y = doc.y;
        doc.font("bold").fontSize(10).fillColor(INK).text(`${q.number}.`, left, y, { width: numberWidth });
        doc.font("regular").fontSize(8.5).fillColor(MUTED).text(`${plural(q.marks, "mark")} · ${q.difficulty}`, textX, y + 1, {
          width: textWidth,
        });
        doc.font("regular").fontSize(10).fillColor(INK).text(answer, textX, doc.y + 2, { width: textWidth + marksWidth, lineGap: 1.5 });
        doc.moveDown(0.7);
      }
      doc.moveDown(0.4);
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const footerY = doc.page.height - MARGIN.bottom + 24;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("regular").fontSize(8).fillColor(MUTED);
    doc.text(`${assignment.subject} · ${assignment.className}${teacher ? " · Teacher's copy" : ""}`, left, footerY, {
      width: width / 2,
      lineBreak: false,
    });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, left + width / 2, footerY, {
      width: width / 2,
      align: "right",
      lineBreak: false,
    });
    doc.page.margins.bottom = bottom;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

module.exports = { renderPaperPdf };
