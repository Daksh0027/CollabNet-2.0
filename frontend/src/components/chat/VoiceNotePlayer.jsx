import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function getVoiceNoteProgress(currentTime, totalDuration, isPlaying) {
  if (!totalDuration) return 0;
  return Math.min((currentTime / totalDuration) * 100, isPlaying ? 99 : 100);
}

export function VoiceNotePlayer({ src, duration = 0, mine = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setCurrentTime(time);
      if (time > totalDuration) {
        setTotalDuration(time);
      }
    };

    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotalDuration(Math.max(audio.duration, audio.currentTime || 0));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    handleDurationChange();

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [src, duration, totalDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPct = getVoiceNoteProgress(currentTime, totalDuration, isPlaying);

  // Waveform bars simulation
  const barHeights = [40, 65, 85, 50, 95, 70, 45, 90, 60, 80, 50, 75, 90, 60, 45, 70];

  return (
    <div
      className={`messages-voice-note flex items-center gap-3 py-1 min-w-[220px] sm:min-w-[260px]${mine ? " is-mine" : ""}`}
      data-testid="voice-note-player"
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer ${
          mine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        }`}
        data-testid="voice-play-button"
        title={isPlaying ? "Pause" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current translate-x-0.5" />
        )}
      </button>

      {/* Waveform / Scrubber Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="relative flex items-center h-6 cursor-pointer">
          {/* Simulated audio waveform */}
          <div className="absolute inset-0 flex items-center justify-between gap-1 pointer-events-none">
            {barHeights.map((h, i) => {
              const barPct = (i / (barHeights.length - 1)) * 100;
              const isActive = barPct <= progressPct;
              return (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-1 rounded-full transition-colors ${
                    isActive
                      ? mine
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : mine
                      ? "bg-primary-foreground/30"
                      : "bg-muted-foreground/30"
                  }`}
                />
              );
            })}
          </div>

          {/* Interactive range input */}
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            data-testid="voice-seek-slider"
          />
        </div>

        {/* Timers & Mic icon */}
        <div
          className={`flex items-center justify-between text-[10px] font-num ${
            mine ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          <span>{formatTime(currentTime > 0 ? currentTime : totalDuration)}</span>
          <span className="flex items-center gap-0.5 opacity-70">
            <Mic className="h-3 w-3" />
            <span>Voice note</span>
          </span>
        </div>
      </div>
    </div>
  );
}
