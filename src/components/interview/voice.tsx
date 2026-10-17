"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Voice interview plumbing, all in the browser: the interviewer speaks with
 * the Web Speech API and the answer is dictated back. Nothing is recorded or
 * uploaded — the transcript is what gets graded, and it stays editable.
 */

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionClass(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Reads the interviewer's lines aloud. Supported in every current browser. */
export function useInterviewerVoice(enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1;
      // Prefer an Indian English voice when the device has one.
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
      utterance.lang = utterance.voice?.lang ?? "en-IN";
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [enabled],
  );

  useEffect(() => stop, [stop]);
  return { speak, stop, speaking };
}

export type DictationState = {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

/** Live speech-to-text. Chrome, Edge and Safari have it; Firefox does not. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<RecognitionLike | null>(null);
  const onFinal = useRef(onFinalText);

  // Read on the client only, so the server and the first client render agree.
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(recognitionClass()),
    () => false,
  );

  useEffect(() => {
    onFinal.current = onFinalText;
  });

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    const Recognition = recognitionClass();
    if (!Recognition) return;
    setError(null);
    const r = new Recognition();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) onFinal.current(result[0].transcript.trim());
        else live += result[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone access was blocked. Allow it in your browser, or type your answer instead."
          : e.error === "no-speech"
            ? "I didn't catch that — try again, a little closer to the mic."
            : "Dictation stopped. You can keep typing instead.",
      );
      setListening(false);
    };
    r.onend = () => {
      setInterim("");
      setListening(false);
    };
    recognition.current = r;
    r.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}

/** Camera preview so students practise looking at the lens. Never recorded. */
export function SelfView({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: 480, facingMode: "user" }, audio: false });
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play().catch(() => null);
      }
      setOn(true);
      setError(null);
    } catch {
      setError("Camera unavailable — check the browser's permission for this site.");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("relative aspect-video overflow-hidden rounded-xl border bg-muted", !on && "grid place-items-center")}>
        <video ref={video} muted playsInline className={cn("size-full object-cover", !on && "hidden")} />
        {!on && <p className="px-4 text-center text-xs text-muted-foreground">Camera off — turn it on to practise eye contact</p>}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full rounded-full" onClick={() => (on ? stopCamera() : startCamera())}>
        {on ? <VideoOff /> : <Video />} {on ? "Turn camera off" : "Turn camera on"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function MicButton({ dictation, disabled }: { dictation: DictationState; disabled?: boolean }) {
  if (!dictation.supported) return null;
  return (
    <Button
      type="button"
      variant={dictation.listening ? "destructive" : "default"}
      size="lg"
      className="rounded-full"
      disabled={disabled}
      onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
    >
      {dictation.listening ? <MicOff /> : <Mic />} {dictation.listening ? "Stop answering" : "Answer out loud"}
    </Button>
  );
}

export function SpeakerToggle({ on, onToggle, speaking }: { on: boolean; onToggle: () => void; speaking: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="rounded-full text-muted-foreground"
      onClick={onToggle}
      aria-pressed={on}
      title={on ? "Mute the interviewer" : "Let the interviewer speak"}
    >
      {on ? <Volume2 className={cn(speaking && "text-primary")} /> : <VolumeX />} {on ? (speaking ? "Speaking…" : "Voice on") : "Voice off"}
    </Button>
  );
}
