import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
  Loader2,
  MessagesSquare,
  Send,
  Sparkles,
  Search,
  ArrowLeft,
  X,
  UserCheck,
  Star,
  Paperclip,
  Smile,
  Mic,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import api, { timeAgo, fmtNum } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserAvatar, EmptyState, VerifiedBadge } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DoubleCheck, isTimestampRead } from "@/components/chat/ReadReceipt";
import { VoiceNotePlayer } from "@/components/chat/VoiceNotePlayer";
import { AttachmentPreview, StagedAttachmentsBar } from "@/components/chat/AttachmentPreview";
import { highlightText, formatDuration } from "@/lib/chatMedia";

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const tid = params.get("thread") || "";
  const qc = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  // In-chat message search
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Emoji Picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Attachments
  const [stagedFiles, setStagedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Voice note recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioStreamRef = useRef(null);

  const messagesEndRef = useRef(null);

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => (await api.get("/threads")).data,
    refetchInterval: 20000,
  });

  const { data: detail } = useQuery({
    queryKey: ["thread", tid],
    queryFn: async () => (await api.get(`/threads/${tid}`)).data,
    enabled: !!tid,
  });

  const otherUserId = detail?.other?.user_id;
  const { data: fullOther } = useQuery({
    queryKey: ["user-profile", otherUserId],
    queryFn: async () => (await api.get(`/users/${otherUserId}`)).data,
    enabled: !!otherUserId,
  });

  const activeOther = fullOther || detail?.other;

  const { data: aiStatus } = useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => (await api.get("/ai/status")).data,
  });

  useEffect(() => {
    if (tid) {
      setMobileThreadOpen(true);
      setShowChatSearch(false);
      setChatSearchQuery("");
      setShowEmojiPicker(false);
      setStagedFiles([]);
    }
  }, [tid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  useEffect(() => {
    if (detail?.thread?.thread_id) {
      qc.invalidateQueries({ queryKey: ["threads"] });
    }
  }, [detail?.thread?.thread_id, qc]);

  // Click outside to close emoji picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest('[data-testid="emoji-picker-button"]')
      ) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // File attachments handler
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setStagedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            data_url: reader.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Voice note recording handlers
  const startRecording = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            sendVoiceMessage(reader.result, recordingSeconds);
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access was denied or not available.");
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const stopAndSendRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendVoiceMessage = async (audioDataUrl, duration) => {
    if (!audioDataUrl || !tid) return;
    try {
      await api.post(`/threads/${tid}`, {
        text: "",
        audio_url: audioDataUrl,
        audio_duration: duration || 1,
      });
      qc.invalidateQueries({ queryKey: ["thread", tid] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (e) {
      toast.error("Failed to send voice note");
    } finally {
      setRecordingSeconds(0);
    }
  };

  const send = async () => {
    if ((!text.trim() && !stagedFiles.length) || !tid) return;
    const msgText = text.trim();
    const filesToSend = [...stagedFiles];
    setText("");
    setStagedFiles([]);
    setShowEmojiPicker(false);

    try {
      await api.post(`/threads/${tid}`, {
        text: msgText,
        attachments: filesToSend.length ? filesToSend : undefined,
      });
      qc.invalidateQueries({ queryKey: ["thread", tid] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (e) {
      setText(msgText);
      setStagedFiles(filesToSend);
      toast.error("Message failed to send");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // In-chat search indexing
  const matchedMessageIds = useMemo(() => {
    if (!chatSearchQuery.trim() || !detail?.messages) return [];
    const q = chatSearchQuery.toLowerCase();
    return detail.messages
      .filter((m) => {
        const hasText = m.text?.toLowerCase().includes(q);
        const hasAttachment = m.attachments?.some((a) => a.name?.toLowerCase().includes(q));
        return hasText || hasAttachment;
      })
      .map((m) => m.msg_id);
  }, [detail?.messages, chatSearchQuery]);

  const activeMatchId = matchedMessageIds[activeMatchIndex] || null;

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [chatSearchQuery]);

  useEffect(() => {
    if (activeMatchId) {
      const el = document.getElementById(`msg-${activeMatchId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeMatchId]);

  const goToPrevMatch = () => {
    if (!matchedMessageIds.length) return;
    setActiveMatchIndex((prev) =>
      prev <= 0 ? matchedMessageIds.length - 1 : prev - 1
    );
  };

  const goToNextMatch = () => {
    if (!matchedMessageIds.length) return;
    setActiveMatchIndex((prev) =>
      prev >= matchedMessageIds.length - 1 ? 0 : prev + 1
    );
  };

  const summarize = async () => {
    setSumBusy(true);
    try {
      const { data } = await api.post("/ai/summarize", { thread_id: tid });
      setSummary(data.summary);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI request failed");
    } finally {
      setSumBusy(false);
    }
  };

  const aiOff = !aiStatus?.configured;

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.other?.display_name?.toLowerCase().includes(q) ||
        t.last_message?.toLowerCase().includes(q) ||
        t.other?.role?.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-background"
      data-testid="messages-page"
    >
      {/* 1. Left Sidebar: Conversations list */}
      <div
        className={`flex w-full flex-col border-r border-border bg-card/40 backdrop-blur-sm sm:w-80 md:w-84 lg:w-88 shrink-0 transition-all ${
          mobileThreadOpen ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Search Header without conversations box */}
        <div className="flex h-16 shrink-0 items-center border-b border-border/80 px-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="h-9 pl-9 text-xs bg-background/60 rounded-xl border-border/80 focus-visible:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Thread List */}
        <div
          className="flex-1 overflow-y-auto p-2 space-y-1"
          data-testid="thread-list"
        >
          {!filteredThreads?.length ? (
            <div className="p-4">
              <EmptyState
                icon={MessagesSquare}
                title={searchQuery ? "No matching chats" : "No conversations"}
                body={
                  searchQuery
                    ? "Try searching for another name or keyword."
                    : "Connect with someone in Explore, then chat here."
                }
                testId="threads-empty"
              />
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = t.thread_id === tid;
              const hasUnread = (t.unread || 0) > 0;
              const isMineLast = t.last_sender_id === user?.user_id;
              const otherReadAt = t.reads?.[t.other?.user_id] || "";
              const isReadByOther = isMineLast && isTimestampRead(otherReadAt, t.last_at);

              return (
                <button
                  key={t.thread_id}
                  onClick={() => {
                    setParams({ thread: t.thread_id });
                    setSummary(null);
                    setMobileThreadOpen(true);
                    qc.invalidateQueries({ queryKey: ["threads"] });
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-150 border-l-2 ${
                    isActive
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/25 shadow-xs border-l-primary"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground border-l-transparent"
                  }`}
                  data-testid={`thread-item-${t.other?.user_id}`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar user={t.other} className="h-11 w-11 ring-1 ring-border" />
                    {t.other?.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white ring-2 ring-card">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`truncate text-xs ${
                          hasUnread
                            ? "font-bold text-foreground"
                            : isActive
                            ? "font-semibold text-foreground"
                            : "font-semibold text-foreground/90"
                        }`}
                      >
                        {t.other?.display_name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.last_at && (
                          <span
                            className={`font-num text-[10px] ${
                              hasUnread ? "font-bold text-primary" : "text-muted-foreground/70"
                            }`}
                          >
                            {timeAgo(t.last_at)}
                          </span>
                        )}
                        {hasUnread && (
                          <span
                            className="font-num flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-xs shrink-0"
                            data-testid="thread-unread-badge"
                          >
                            {t.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground/80 capitalize mt-0.5">
                      {t.other?.role === "company"
                        ? t.other?.company?.industry || "Company"
                        : t.other?.creator?.niche || "Creator"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isMineLast && (
                        <DoubleCheck
                          status={isReadByOther ? "read" : "delivered"}
                          className={isReadByOther ? "text-sky-400" : "text-muted-foreground/60"}
                        />
                      )}
                      <p
                        className={`truncate text-xs flex-1 ${
                          hasUnread
                            ? "text-foreground font-semibold"
                            : isActive
                            ? "text-foreground/85 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t.last_message || "New conversation"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Panel: Active Chat Thread */}
      <div
        className={`flex min-w-0 flex-1 flex-col h-full bg-background/50 ${
          !mobileThreadOpen ? "hidden sm:flex" : "flex"
        }`}
        data-testid="thread-panel"
      >
        {!tid || !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground mb-4">
              <MessagesSquare className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-foreground">Select a conversation</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Choose a conversation from the left to start collaborating.
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header: clickable profile to open details panel */}
            <div className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-4 sm:px-6 bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden -ml-1 h-8 w-8 rounded-lg"
                  onClick={() => setMobileThreadOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setShowProfile((p) => !p)}
                  className="flex items-center gap-3 min-w-0 text-left rounded-xl p-1 -m-1 hover:bg-secondary/60 transition-colors group cursor-pointer"
                  title="Click to view profile details"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      user={activeOther}
                      className="h-9 w-9 ring-1 ring-border group-hover:ring-primary/50 transition-all"
                    />
                    {activeOther?.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white ring-2 ring-card">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {activeOther?.display_name}
                      </p>
                      {activeOther?.verified && (
                        <VerifiedBadge show={true} />
                      )}
                    </div>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {activeOther?.role === "company"
                        ? activeOther?.company?.industry || "Company"
                        : activeOther?.creator?.niche || "Creator"}
                      {" · "}
                      <span className="font-num text-[11px]">
                        {detail.messages?.length || 0} messages
                      </span>
                    </p>
                  </div>
                </button>
              </div>

              {/* Header Right Actions: Search in conversation & Profile toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-xl transition-colors ${
                    showChatSearch
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                  onClick={() => {
                    setShowChatSearch((s) => !s);
                    if (showChatSearch) setChatSearchQuery("");
                  }}
                  title="Search in conversation"
                  data-testid="toggle-chat-search-button"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* In-Chat Message Search Bar (WhatsApp style) */}
            {showChatSearch && (
              <div
                className="z-10 flex items-center gap-2 border-b border-border/80 bg-card/95 px-4 py-2 backdrop-blur-md animate-in slide-in-from-top-2 duration-150"
                data-testid="chat-search-bar"
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                <Input
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search in this chat…"
                  className="h-8 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0 px-1"
                  autoFocus
                  data-testid="chat-search-input"
                />
                {chatSearchQuery && (
                  <span className="font-num text-[11px] text-muted-foreground shrink-0 px-1">
                    {matchedMessageIds.length}{" "}
                    {matchedMessageIds.length === 1 ? "match" : "matches"}
                  </span>
                )}
                {chatSearchQuery && matchedMessageIds.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={goToPrevMatch}
                      title="Previous match"
                      data-testid="chat-search-prev"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={goToNextMatch}
                      title="Next match"
                      data-testid="chat-search-next"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => {
                    setShowChatSearch(false);
                    setChatSearchQuery("");
                  }}
                  title="Close search"
                  data-testid="close-chat-search-button"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Messages Feed */}
            <div
              className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-6"
              data-testid="message-list"
            >
              {detail.messages.map((m, idx) => {
                const mine = m.sender_id === user?.user_id;
                const otherReadAt = detail?.thread?.reads?.[detail?.other?.user_id] || "";
                const isRead = otherReadAt && m.created_at && isTimestampRead(otherReadAt, m.created_at);
                const isMatch = matchedMessageIds.includes(m.msg_id);
                const isActiveMatch = activeMatchId === m.msg_id;

                return (
                  <div
                    key={m.msg_id || idx}
                    id={`msg-${m.msg_id}`}
                    className={`flex items-end gap-2 transition-all ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                    data-testid={`message-${m.msg_id}`}
                  >
                    {!mine && (
                      <button
                        type="button"
                        onClick={() => setShowProfile(true)}
                        className="cursor-pointer"
                        title="View profile"
                      >
                        <UserAvatar
                          user={activeOther}
                          className="h-6 w-6 ring-1 ring-border mb-1 hidden sm:block hover:ring-primary/60 transition-all"
                        />
                      </button>
                    )}
                    <div
                      className={`group relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-xs transition-all ${
                        isActiveMatch
                          ? "ring-2 ring-amber-400 shadow-md"
                          : isMatch
                          ? "ring-1 ring-amber-400/50"
                          : ""
                      } ${
                        mine
                          ? "rounded-br-xs bg-primary text-primary-foreground"
                          : "rounded-bl-xs bg-card border border-border/70 text-foreground"
                      }`}
                    >
                      {/* Attachments rendering */}
                      {m.attachments && m.attachments.length > 0 && (
                        <AttachmentPreview attachments={m.attachments} mine={mine} />
                      )}

                      {/* Voice Note player */}
                      {m.audio_url && (
                        <VoiceNotePlayer
                          src={m.audio_url}
                          duration={m.audio_duration}
                          mine={mine}
                        />
                      )}

                      {/* Text content with search highlighting */}
                      {m.text && (
                        <p className="whitespace-pre-wrap leading-relaxed selection:bg-background/20">
                          {highlightText(m.text, chatSearchQuery)}
                        </p>
                      )}

                      <div
                        className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                          mine ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        <span>{timeAgo(m.created_at)}</span>
                        {mine && (
                          <DoubleCheck
                            status={isRead ? "read" : "delivered"}
                            className={isRead ? "text-sky-300" : "text-primary-foreground/50"}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {detail.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                    <Send className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Say hello — this thread is private between you two.
                  </p>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Section */}
            <div className="relative z-10 border-t border-border/80 bg-card/80 p-3 sm:p-4 backdrop-blur-md">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-18 left-3 sm:left-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-150"
                  data-testid="emoji-picker-popover"
                >
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(emojiData) => {
                      setText((prev) => prev + emojiData.emoji);
                      inputRef.current?.focus();
                    }}
                    lazyLoadEmojis={true}
                    width={320}
                    height={380}
                  />
                </div>
              )}

              {/* Staged attachments preview */}
              <StagedAttachmentsBar files={stagedFiles} onRemove={removeStagedFile} />

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
                data-testid="chat-file-input"
              />

              {summary ? (
                <div
                  className="mb-3 relative rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs shadow-xs"
                  data-testid="thread-summary"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="eyebrow flex items-center gap-1.5 font-bold text-primary">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> AI summary
                    </p>
                    <button
                      onClick={() => setSummary(null)}
                      className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                    {summary}
                  </p>
                </div>
              ) : null}

              {/* Active Voice Recording Bar (WhatsApp style) */}
              {isRecording ? (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 shadow-xs animate-in fade-in duration-150"
                  data-testid="voice-recording-bar"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="font-num text-xs font-bold text-red-400">
                      {formatDuration(recordingSeconds)}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline ml-2">
                      Recording voice note…
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelRecording}
                      className="h-8 rounded-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Cancel recording"
                      data-testid="cancel-recording-button"
                    >
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                      Cancel
                    </Button>
                    <Button
                      size="icon"
                      onClick={stopAndSendRecording}
                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                      title="Send voice note"
                      data-testid="send-voice-button"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal Composer Bar (WhatsApp style) */
                <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-background/90 px-2 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
                  {/* Attachment button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 shrink-0"
                    title="Attach document or media"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="attach-file-button"
                  >
                    <Paperclip className="h-4 w-4 rotate-45" />
                  </Button>

                  {/* Emoji button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 rounded-full transition-colors shrink-0 ${
                      showEmojiPicker
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                    title="Choose emoji"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    data-testid="emoji-picker-button"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>

                  {/* Input field */}
                  <Input
                    ref={inputRef}
                    placeholder="Type a message"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 flex-1"
                    data-testid="message-input"
                  />

                  {/* Right Action: Send button if text/files present, otherwise Mic button (WhatsApp style) */}
                  {text.trim() || stagedFiles.length > 0 ? (
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0 transition-transform active:scale-95 disabled:opacity-40"
                      onClick={send}
                      data-testid="send-message-button"
                      title="Send message"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 transition-transform active:scale-95"
                      onClick={startRecording}
                      data-testid="mic-button"
                      title="Click to record voice note"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Right Sidebar: Counterparty Profile Panel (Only shows when clicked on user profile) */}
      {showProfile && (
        <div
          className="w-72 lg:w-80 shrink-0 flex flex-col border-l border-border bg-card/40 z-20 transition-all animate-in slide-in-from-right duration-200"
          data-testid="counterparty-panel"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-5">
            <span className="eyebrow font-semibold">Participant Details</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setShowProfile(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!detail ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                <UserCheck className="h-8 w-8 mb-2 opacity-40" />
                Counterparty profile shows here.
              </div>
            ) : (
              <CounterpartyCard
                user={activeOther}
                summarySlot={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-4 w-full rounded-full text-xs font-medium border border-border/60 hover:border-primary/40 transition-colors"
                    disabled={aiOff || sumBusy}
                    onClick={summarize}
                    data-testid="ai-summarize-button"
                  >
                    {sumBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    )}
                    Summarize with AI
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CounterpartyCard({ user, summarySlot }) {
  const c = user?.creator || {};
  const co = user?.company || {};
  return (
    <div data-testid="counterparty-card" className="space-y-4">
      <div className="flex flex-col items-center rounded-2xl border border-border/80 bg-card/60 p-5 text-center shadow-xs">
        <div className="relative">
          <UserAvatar user={user} className="h-16 w-16 ring-2 ring-primary/20" />
          {user?.verified && (
            <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white ring-2 ring-card">
              ✓
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-bold text-foreground">{user?.display_name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs capitalize text-muted-foreground">
            {user?.role === "company" ? co.industry || "Company" : c.niche || "Creator"}
          </span>
          {user?.verified && (
            <Badge className="h-4 px-1.5 text-[9px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
              Verified
            </Badge>
          )}
        </div>

        {user?.rating_avg && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-amber-500" />
            <span className="font-semibold text-foreground">{user.rating_avg}</span>
            <span className="text-muted-foreground">({user.review_count || 1} review{user.review_count !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {user?.role === "creator" ? (
          <>
            {c.pitch && (
              <div className="rounded-xl border border-border/80 bg-background/60 p-3 text-muted-foreground">
                <span className="eyebrow block mb-1">Pitch</span>
                <p className="text-foreground/90 italic leading-relaxed">"{c.pitch}"</p>
              </div>
            )}
            {c.platforms?.length > 0 && (
              <div className="space-y-1.5">
                <span className="eyebrow block">Channels</span>
                {c.platforms.map((p) => (
                  <div
                    key={p.platform}
                    className="flex justify-between items-center rounded-xl border border-border/80 bg-background/60 px-3 py-2"
                  >
                    <span className="capitalize text-muted-foreground font-medium">{p.platform}</span>
                    <span className="font-num text-foreground font-semibold">
                      {fmtNum(p.followers)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {c.rates?.video ? (
              <div className="flex justify-between items-center rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground font-medium">Video rate</span>
                <span className="font-num text-primary font-bold">${c.rates.video}</span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {co.about ? (
              <div className="rounded-xl border border-border/80 bg-background/60 p-3 leading-relaxed text-muted-foreground">
                <span className="eyebrow block mb-1">About</span>
                <p className="text-foreground/90">{co.about}</p>
              </div>
            ) : null}
            {co.requirements?.budget_min && (
              <div className="flex justify-between items-center rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground font-medium">Budget Range</span>
                <span className="font-num text-foreground font-semibold">
                  ${fmtNum(co.requirements.budget_min)} – ${fmtNum(co.requirements.budget_max)}
                </span>
              </div>
            )}
            {co.employees ? (
              <div className="flex justify-between items-center rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground font-medium">Team</span>
                <span className="font-num text-foreground font-semibold">{co.employees}</span>
              </div>
            ) : null}
          </>
        )}
        <div className="flex justify-between items-center rounded-xl border border-border/80 bg-background/60 px-3 py-2">
          <span className="text-muted-foreground font-medium">Member since</span>
          <span className="font-num text-foreground">
            {new Date(user?.created_at || Date.now()).getFullYear()}
          </span>
        </div>
      </div>

      {summarySlot}
    </div>
  );
}
