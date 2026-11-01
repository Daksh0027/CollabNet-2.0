import { FileText, Download, File, Image as ImageIcon, X } from "lucide-react";
import { DoubleCheck } from "@/components/chat/ReadReceipt";

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function isImageAttachment(att) {
  return (
    att.type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name || "")
  );
}

export function hasOnlyDocumentAttachments(attachments) {
  return Boolean(
    attachments?.length && attachments.every((att) => !isImageAttachment(att)),
  );
}

function getFileTypeLabel(att) {
  const extension = att.name?.split(".").pop();
  return extension && extension !== att.name ? extension.toUpperCase() : "FILE";
}

export function AttachmentPreview({
  attachments,
  mine = false,
  messageTime,
  read = false,
  showMessageMeta = false,
}) {
  if (!attachments || !attachments.length) return null;
  const lastDocumentIndex = attachments.reduce(
    (lastIndex, att, index) => (isImageAttachment(att) ? lastIndex : index),
    -1,
  );

  return (
    <div className="space-y-2 mb-2" data-testid="attachment-list">
      {attachments.map((att, idx) => {
        const isImage = isImageAttachment(att);

        if (isImage && att.data_url) {
          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl border border-border/60 max-w-sm group"
              data-testid={`attachment-image-${idx}`}
            >
              <img
                src={att.data_url}
                alt={att.name || "Attached image"}
                className="max-h-72 w-full object-cover rounded-xl transition-transform group-hover:scale-[1.01]"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/65 p-2 flex items-center justify-between text-[11px] text-white">
                <span className="truncate max-w-[200px]">{att.name}</span>
                <a
                  href={att.data_url}
                  download={att.name || "download"}
                  className="rounded-full bg-black/40 hover:bg-black/70 p-1 text-white transition-colors ml-2"
                  title="Download image"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        }

        const renderMessageMeta = showMessageMeta && idx === lastDocumentIndex;

        return (
          <div
            key={idx}
            className={`attachment-document-card${mine ? " is-mine" : " is-other"}`}
            data-testid={`attachment-doc-${idx}`}
          >
            <div className="attachment-document-details">
              <div className="attachment-file-type" aria-hidden="true">
                <FileText className="h-5 w-5" />
                <span>{getFileTypeLabel(att)}</span>
              </div>
              <div className="attachment-document-info">
                <p className="attachment-document-name">
                  {att.name || "Document"}
                </p>
                <p className="attachment-document-size">
                  {getFileTypeLabel(att)} · {formatFileSize(att.size)}
                </p>
              </div>
              {renderMessageMeta ? (
                <div
                  className="attachment-message-meta"
                  data-testid="attachment-message-meta"
                >
                  <span>{messageTime}</span>
                  {mine && (
                    <DoubleCheck
                      status={read ? "read" : "delivered"}
                      className={read ? "text-primary" : ""}
                    />
                  )}
                </div>
              ) : null}
            </div>
            {att.data_url ? (
              <div className="attachment-document-actions">
                <a
                  href={att.data_url}
                  download={att.name || "document"}
                  className="attachment-document-action"
                  title="Download document"
                  aria-label={`Download ${att.name || "document"}`}
                  data-testid="download-attachment-button"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StagedAttachmentsBar({ files, onRemove }) {
  if (!files || !files.length) return null;

  return (
    <div
      className="flex flex-wrap gap-2 p-2 mb-2 rounded-xl border border-border/80 bg-background/90"
      data-testid="staged-attachments-bar"
    >
      {files.map((file, idx) => {
        const isImage = file.type?.startsWith("image/");
        return (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg bg-secondary/80 px-2.5 py-1.5 text-xs border border-border/60 max-w-[200px]"
          >
            {isImage ? (
              <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <File className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className="truncate text-[11px] font-medium">
              {file.name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-muted-foreground hover:text-foreground ml-1 p-0.5 rounded-full hover:bg-background shrink-0"
              title="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
