import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LuCamera, LuFileText, LuUpload, LuX } from "react-icons/lu";
import { prepareForUpload } from "../../lib/image";
import { formatBytes } from "../../lib/format";

export const MAX_FILES = 6;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 14 * 1024 * 1024;

const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

let nextId = 0;

function describeRejection({ file, errors }) {
  const code = errors[0]?.code;
  if (code === "file-too-large") return `“${file.name}” is over 10 MB.`;
  if (code === "file-invalid-type") return `“${file.name}” isn't a JPG, PNG, WEBP or PDF.`;
  if (code === "too-many-files") return `You can add up to ${MAX_FILES} pages.`;
  return `“${file.name}” couldn't be added.`;
}

/**
 * Pages of the answer sheet. `pages` is an array of
 * { id, file, previewUrl, originalSize }; the parent owns it.
 */
export default function SheetDropzone({ pages, onChange, error }) {
  const [processing, setProcessing] = useState(0);
  const [rejections, setRejections] = useState([]);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // Revoke preview URLs when the component unmounts.
  useEffect(() => () => pagesRef.current.forEach((page) => page.previewUrl && URL.revokeObjectURL(page.previewUrl)), []);

  const remaining = MAX_FILES - pages.length;

  const onDrop = async (accepted, rejected) => {
    const messages = rejected.map(describeRejection);
    const toAdd = accepted.slice(0, Math.max(0, remaining));
    if (accepted.length > toAdd.length) messages.push(`Only ${MAX_FILES} pages fit on one sheet; extra files were skipped.`);
    setRejections([...new Set(messages)]);
    if (toAdd.length === 0) return;

    setProcessing(toAdd.length);
    const prepared = await Promise.all(
      toAdd.map(async (original) => {
        const file = await prepareForUpload(original);
        nextId += 1;
        return {
          id: `page-${nextId}`,
          file,
          originalSize: original.size,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        };
      })
    );
    setProcessing(0);
    onChange([...pagesRef.current, ...prepared]);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_BYTES,
    maxFiles: MAX_FILES,
    multiple: true,
    noClick: true,
    disabled: remaining <= 0,
    onDrop,
  });

  const remove = (id) => {
    const page = pages.find((item) => item.id === id);
    if (page?.previewUrl) URL.revokeObjectURL(page.previewUrl);
    onChange(pages.filter((item) => item.id !== id));
  };

  const totalBytes = pages.reduce((sum, page) => sum + page.file.size, 0);
  const overLimit = totalBytes > MAX_TOTAL_BYTES;
  const usage = Math.min(100, (totalBytes / MAX_TOTAL_BYTES) * 100);

  return (
    <div className="dropzone-wrap">
      <div
        {...getRootProps({
          className: `dropzone${isDragActive ? " is-dragging" : ""}${error ? " has-error" : ""}${
            remaining <= 0 ? " is-full" : ""
          }`,
        })}
      >
        <input {...getInputProps()} aria-label="Upload answer sheet pages" />
        <div className="dropzone-icon" aria-hidden="true">
          {isDragActive ? <LuUpload /> : <LuCamera />}
        </div>
        <p className="dropzone-title">
          {remaining <= 0
            ? "That's the maximum number of pages"
            : isDragActive
              ? "Drop the pages here"
              : "Drag photos or a PDF of the answer sheet here"}
        </p>
        <p className="dropzone-hint">JPG, PNG, WEBP or PDF · up to {MAX_FILES} pages · any order</p>
        {remaining > 0 && (
          <button type="button" className="btn btn-sm" onClick={open}>
            <LuUpload aria-hidden="true" /> Choose files
          </button>
        )}
      </div>

      {processing > 0 && (
        <p className="dropzone-status" role="status">
          <span className="spinner" style={{ "--size": "14px" }} aria-hidden="true" /> Optimising{" "}
          {processing === 1 ? "photo" : `${processing} photos`} for upload…
        </p>
      )}

      {rejections.length > 0 && (
        <ul className="dropzone-rejections" role="alert">
          {rejections.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {pages.length > 0 && (
        <>
          <ul className="page-grid" aria-label="Pages added">
            {pages.map((page, index) => (
              <li key={page.id} className="page-thumb">
                <div className="page-thumb-media">
                  {page.previewUrl ? (
                    <img src={page.previewUrl} alt={`Page ${index + 1}`} />
                  ) : (
                    <div className="page-thumb-pdf">
                      <LuFileText aria-hidden="true" />
                      <span>PDF</span>
                    </div>
                  )}
                  <span className="page-thumb-number">{index + 1}</span>
                  <button
                    type="button"
                    className="page-thumb-remove"
                    onClick={() => remove(page.id)}
                    aria-label={`Remove page ${index + 1}, ${page.file.name}`}
                  >
                    <LuX aria-hidden="true" />
                  </button>
                </div>
                <p className="page-thumb-name" title={page.file.name}>
                  {page.file.name}
                </p>
                <p className="page-thumb-size">
                  {formatBytes(page.file.size)}
                  {page.originalSize > page.file.size && (
                    <span className="muted"> · was {formatBytes(page.originalSize)}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <div className="upload-meter" data-over={overLimit || undefined}>
            <div className="upload-meter-track" aria-hidden="true">
              <span style={{ width: `${usage}%` }} />
            </div>
            <p>
              {formatBytes(totalBytes)} of {formatBytes(MAX_TOTAL_BYTES)}
              {overLimit && " — remove a page or use smaller files"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
