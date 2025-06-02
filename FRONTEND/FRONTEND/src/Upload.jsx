import { useDropzone } from "react-dropzone";
import { useState } from "react";
import "./Upload.css";

function Upload({ onFileUpload }) { 
  const [files, setFiles] = useState([]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 
      "application/pdf": [".pdf"], 
      "image/jpeg": [".jpg", ".jpeg"], 
      "image/png": [".png"] 
    },
    maxSize: 20 * 1024 * 1024,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      onFileUpload(acceptedFiles[0]); 
    }
  });

  return (
    <div className="upload-container">
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <div className="upload-box">
          <span className="upload-icon">📤</span>
          <p>Drag & drop or click to upload</p>
          <small>Supported formats: .pdf, .jpg, .jpeg, .png (Max 20MB)</small>
        </div>
      </div>

      {files.length > 0 && <ul className="file-list">{files.map((file) => <li key={file.name}>{file.name}</li>)}</ul>}
    </div>
  );
}


export default Upload;
