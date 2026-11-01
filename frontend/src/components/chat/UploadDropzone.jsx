import { useState } from "react";
import { Upload, X } from "lucide-react";

export function UploadDropzone({ onFiles, onBrowse, onClose }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files || []));
  };

  return (
    <section
      className="chat-upload-dropzone"
      data-dragging={dragging || undefined}
      data-testid="chat-upload-dropzone"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <button
        type="button"
        className="chat-upload-close"
        onClick={onClose}
        aria-label="Close file dropzone"
        data-testid="close-upload-dropzone"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="chat-upload-icon" aria-hidden="true">
        <Upload className="h-5 w-5" />
      </span>
      <div className="chat-upload-copy">
        <p>{dragging ? "Drop files to attach" : "Drag files here"}</p>
        <span>Up to 10 MB per file</span>
      </div>
      <button
        type="button"
        className="chat-upload-browse"
        onClick={onBrowse}
        data-testid="browse-chat-files-button"
      >
        Browse files
      </button>
    </section>
  );
}
