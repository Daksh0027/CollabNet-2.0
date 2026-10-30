import { FileText, Download, File, Image as ImageIcon, X } from "lucide-react";

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function AttachmentPreview({ attachments, mine = false }) {
  if (!attachments || !attachments.length) return null;

  return (
    <div className="space-y-2 mb-2" data-testid="attachment-list">
      {attachments.map((att, idx) => {
        const isImage =
          att.type?.startsWith("image/") ||
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name || "");

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
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center justify-between text-[11px] text-white">
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

        // Document / File Card (WhatsApp style)
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors border ${
              mine
                ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                : "bg-secondary/60 border-border text-foreground"
            }`}
            data-testid={`attachment-doc-${idx}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                mine
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight">{att.name}</p>
              <p
                className={`text-[10px] mt-0.5 ${
                  mine ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {formatFileSize(att.size)}
              </p>
            </div>

            {att.data_url && (
              <a
                href={att.data_url}
                download={att.name || "document"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  mine
                    ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
                title="Download file"
                data-testid="download-attachment-button"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
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
            <span className="truncate text-[11px] font-medium">{file.name}</span>
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
