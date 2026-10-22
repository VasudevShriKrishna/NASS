"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileText,
  Key,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Radio,
  SendHorizonal,
  Settings,
  ShieldAlert,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { postJson, postFormData, setCookie, getCookie } from "@/lib/client";
import { fmtDateTime } from "@/components/app/shared";
import { useAppStore } from "@/lib/app-state";
import type {
  AssistantResponse,
  AssistantSection,
  AssistantStructured,
  AssistantNavigationAction,
  AssistantReportAction,
} from "@/lib/assistant-types";

/* NASS Operations & Executive Voice Copilot (Phase 6 / Sarvam AI Integration) */

interface AttachedMedia {
  name: string;
  size: number;
  type: string;
  url?: string;
  isVideo?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: AttachedMedia;
  sources?: string[];
  asOf?: string;
  degraded?: boolean;
  structured?: AssistantStructured;
  dataQuality?: string;
  provider?: string;
  model?: string;
  navigation?: AssistantNavigationAction;
  report?: AssistantReportAction;
}

const GOLD = "#d4af37";

const GREETING = [
  "NASS Operations Assistant & CEO Control Tower Copilot.",
  "Live voice-over dictation active: speak into your microphone and your speech is written live into the prompt, ready for you to review, edit, attach video/media, and send.",
  "Connected to verified NASS projects (Projects A–E), BOQ material requirements, purchase orders, inbound shipments, and executive decisions.",
].join(" ");

const SUGGESTIONS = [
  "Take me to Project A's materials and make a PDF report",
  "Open shipment SHP-8803 and generate a PDF report",
  "Generate a CEO summary for all authorized active projects",
  "Find a live traceability for me",
  "Navigate to the inventory page and show available stock",
  "What decisions require CEO approval right now?",
  "How does actual PO price compare to market benchmark for gabbro?",
  "Where is the Dona Marine aggregate barge SHP-8809?",
];

function qualityTone(dq: string | undefined): string {
  const q = (dq ?? "").toLowerCase();
  if (q.startsWith("verified")) return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (q.startsWith("estimated") || q.startsWith("aging")) return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  if (q.startsWith("stale") || q.startsWith("unavailable")) return "border-rose-400/40 bg-rose-400/10 text-rose-300";
  return "border-zinc-400/40 bg-zinc-400/10 text-zinc-300";
}

function RefLine({ text }: { text: string }) {
  const parts = text.split(
    /(\b(?:SHP|PO|GRN|ACT|CEO-ACT|PRJ|MAT|SUP|PB|EX|CN|ADJ|WO)[-][A-Z0-9]+|\b[A-Z]{3,5}-\d{3,5}\b|\b[A-Z]{4}\d{7}\b)/g
  );
  return (
    <>
      {parts.map((p, i) =>
        /^(SHP|PO|GRN|ACT|CEO-ACT|PRJ|MAT|SUP|PB|EX|CN|ADJ|WO)-[A-Z0-9]+$/.test(p) ||
        /^[A-Z]{3,5}-\d{3,5}$/.test(p) ||
        /^[A-Z]{4}\d{7}$/.test(p) ? (
          <span key={i} className="font-mono text-[0.82em] font-bold tracking-tight" style={{ color: GOLD }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function StructuredCard({
  structured,
  dataQuality,
  degraded,
}: {
  structured: AssistantStructured;
  dataQuality?: string;
  degraded?: boolean;
}) {
  const drillTo = useAppStore((s) => s.drillTo);
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-3",
        degraded ? "border-amber-400/30 bg-amber-400/5" : "border-[#d4af37]/25 bg-[#d4af37]/[0.04]"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {structured.shipmentRef || structured.ref ? (
          <button
            type="button"
            onClick={() => drillTo("import-tracking", structured.shipmentRef ?? structured.ref)}
            title="Open the underlying shipment record in Import Tracking"
            className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors hover:bg-[#d4af37]/15"
            style={{ borderColor: `${GOLD}66`, color: GOLD }}
          >
            {structured.shipmentRef ?? structured.ref} ↗
          </button>
        ) : null}
        {dataQuality ? (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              qualityTone(dataQuality)
            )}
          >
            {dataQuality}
          </span>
        ) : null}
      </div>
      {structured.sections.map((sec: AssistantSection) => (
        <div key={sec.key} className="border-l-2 pl-2.5" style={{ borderColor: `${GOLD}55` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            {sec.label}
          </p>
          <div className="mt-0.5 space-y-0.5 text-xs leading-relaxed text-foreground/90">
            {sec.lines.map((l, i) => (
              <p key={i} className="whitespace-pre-wrap">
                <RefLine text={l} />
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssistantView() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attached Media / Video State
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(null);

  // Microphone & Live Audio Dictation States
  const [micStatus, setMicStatus] = useState<"untested" | "checking" | "granted" | "denied">("untested");
  const [micLabel, setMicLabel] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  // Sarvam API Key Configuration
  const [sarvamKey, setSarvamKey] = useState<string>("");
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);
  const [keySource, setKeySource] = useState<string>("none");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<unknown>(null);
  const preSpeechTextRef = useRef<string>("");
  const autoSentRef = useRef<boolean>(false);
  const [voiceCommandAlert, setVoiceCommandAlert] = useState<string | null>(null);
  const sendRef = useRef<(q: string) => Promise<void>>(() => Promise.resolve());
  const attachedMediaRef = useRef(attachedMedia);
  const isRecordingRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSpeechRef = useRef<string>("");

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    attachedMediaRef.current = attachedMedia;
  }, [attachedMedia]);

  // Voice Command Trigger: "send it send it" (case-insensitive with flexible punctuation)
  const SEND_IT_TRIGGER = /\b(?:send\s+it\s*[,.]?\s*send\s+it)\b/i;

  function stripSendItTrigger(text: string): string {
    return text
      .replace(/\s*[,.]?\s*send\s+it\s*[,.]?\s*send\s+it[\s.!?,]*.*$/i, "")
      .replace(/\b(?:send\s+it\s*[,.]?\s*send\s+it)\b/gi, "")
      .trim();
  }

  // Auto-scroll chat
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Check initial Sarvam configuration & cookie
  useEffect(() => {
    const existingCookie = getCookie("sarvam_key");
    const local = typeof window !== "undefined" ? localStorage.getItem("sarvam_key") : null;
    const activeKey = existingCookie || local;

    if (activeKey) {
      setSarvamKey(activeKey);
      setSavedKeyMask(`${activeKey.slice(0, 4)}...${activeKey.slice(-4)}`);
      setKeySource("cookie");
    }

    // Ping backend to check if process.env.SARVAM_API_KEY is configured
    fetch("/api/voice/sarvam", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.configured) {
          setKeySource(j.data.source);
          setSavedKeyMask(
            j.data.maskedKey || (activeKey ? `${activeKey.slice(0, 4)}...${activeKey.slice(-4)}` : "Configured")
          );
        }
      })
      .catch(() => {});

    // Check microphone permission query
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((p) => {
          if (p.state === "granted") {
            setMicStatus("granted");
            enumerateMicLabel();
          } else if (p.state === "denied") {
            setMicStatus("denied");
          } else {
            setMicStatus("untested");
          }
          p.onchange = () => {
            if (p.state === "granted") {
              setMicStatus("granted");
              enumerateMicLabel();
            } else if (p.state === "denied") {
              setMicStatus("denied");
            }
          };
        })
        .catch(() => {});
    }
  }, []);

  async function enumerateMicLabel() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInput = devices.find((d) => d.kind === "audioinput" && d.label);
      if (audioInput) {
        setMicLabel(audioInput.label);
      }
    } catch {}
  }

  // Check & verify microphone access explicitly
  async function verifyMicrophone() {
    setMicStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus("granted");

      const track = stream.getAudioTracks()[0];
      if (track) {
        setMicLabel(track.label || "Default Audio Input");
      }

      setupAudioMeter(stream);
      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
        }
        setAudioLevel(0);
      }, 2000);
    } catch {
      setMicStatus("denied");
    }
  }

  function setupAudioMeter(stream: MediaStream) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {}
  }

  // START LIVE CHATGPT-STYLE VOICE-OVER DICTATION
  async function startRecording() {
    try {
      autoSentRef.current = false;
      setVoiceCommandAlert(null);
      setMicStatus("checking");

      preSpeechTextRef.current = input.trim() ? input.trim() + " " : "";
      accumulatedSpeechRef.current = "";

      const isMobile =
        typeof navigator !== "undefined" &&
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

      const SpeechRecognition =
        typeof window !== "undefined" &&
        ((window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
          .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!SpeechRecognition) {
          setMicStatus("denied");
          return;
        }
      }

      // Android Chrome Hardware Mic Conflict Fix:
      // On Android OS, keeping an active getUserMedia audio stream creates a hardware conflict
      // with Google Speech Recognizer, immediately failing with 'audio-capture' error.
      // On mobile, if SpeechRecognition is available, we probe permission and close the getUserMedia
      // tracks so SpeechRecognition has 100% exclusive access to the microphone hardware.
      // On desktop, we keep getUserMedia active for simultaneous VU meter & MediaRecorder capture.
      let stream: MediaStream | null = null;
      if (!isMobile || !SpeechRecognition) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamRef.current = stream;
        setMicStatus("granted");
        const track = stream.getAudioTracks()[0];
        if (track) setMicLabel(track.label || "Microphone Input");
        setupAudioMeter(stream);
      } else {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
          const track = probe.getAudioTracks()[0];
          if (track) setMicLabel(track.label || "Android Microphone");
          probe.getTracks().forEach((t) => t.stop());
          setMicStatus("granted");
        } catch {
          // Let SpeechRecognition trigger native Android mic prompt
        }
      }

      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          speechRecognitionRef.current = recognizer;

          // Android Chrome does not support continuous: true natively.
          // Continuous false with auto-restart in onend provides seamless continuous dictation on Android!
          recognizer.continuous = !isMobile;
          recognizer.interimResults = true;
          recognizer.lang =
            typeof navigator !== "undefined" && navigator.language
              ? navigator.language
              : "en-US";

          if (isMobile) {
            (recognizer as any).onaudiostart = () => setAudioLevel(45);
            (recognizer as any).onsoundstart = () => setAudioLevel(65);
            (recognizer as any).onspeechstart = () => setAudioLevel(85);
            (recognizer as any).onspeechend = () => setAudioLevel(20);
            (recognizer as any).onaudioend = () => setAudioLevel(0);
          }

          recognizer.onresult = (event: SpeechRecognitionEvent) => {
            if (autoSentRef.current) return;

            let interim = "";
            let sessionFinal = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                sessionFinal += res[0].transcript;
              } else {
                interim += res[0].transcript;
              }
            }

            if (sessionFinal) {
              accumulatedSpeechRef.current = (
                (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + " " : "") + sessionFinal.trim()
              ).trim();
            }

            const currentSpoken = (
              (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + " " : "") + interim.trim()
            ).trim();

            const fullText = (preSpeechTextRef.current + currentSpoken).trim();

            // AUTO-SEND TRIGGER: "send it send it"
            if (!autoSentRef.current && SEND_IT_TRIGGER.test(fullText)) {
              autoSentRef.current = true;
              isRecordingRef.current = false;
              const promptToSend = stripSendItTrigger(fullText);

              try {
                recognizer.onresult = null;
                recognizer.onerror = null;
                recognizer.onend = null;
                recognizer.abort();
              } catch {}
              speechRecognitionRef.current = null;

              preSpeechTextRef.current = "";
              accumulatedSpeechRef.current = "";
              setInput("");

              setVoiceCommandAlert('⚡ Voice Command Detected: "send it send it" — Sending directly without stop permission!');
              setTimeout(() => setVoiceCommandAlert(null), 4000);

              stopRecording();

              if (promptToSend || attachedMediaRef.current) {
                sendRef.current(promptToSend);
              }
              return;
            }

            if (!autoSentRef.current) {
              setInput(preSpeechTextRef.current + currentSpoken);
            }
          };

          // OnEnd auto-restart loop for Android speech pauses
          recognizer.onend = () => {
            if (isRecordingRef.current && !autoSentRef.current) {
              try {
                recognizer.start();
              } catch {}
            }
          };

          recognizer.onerror = (e: any) => {
            if (e?.error === "no-speech") return;
            if (e?.error === "not-allowed") {
              setMicStatus("denied");
            }
          };

          recognizer.start();
        } catch {}
      }

      // MediaRecorder for desktop or stream fallback
      if (stream) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

        try {
          const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mediaRecorderRef.current = mr;
          audioChunksRef.current = [];

          mr.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mr.onstop = async () => {
            if (activeStreamRef.current) {
              activeStreamRef.current.getTracks().forEach((t) => t.stop());
              activeStreamRef.current = null;
            }
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
              audioContextRef.current.close().catch(() => {});
            }
            setAudioLevel(0);

            if (speechRecognitionRef.current) {
              try {
                const r = speechRecognitionRef.current as any;
                r.onresult = null;
                r.onerror = null;
                r.onend = null;
                if (typeof r.abort === "function") r.abort();
                else if (typeof r.stop === "function") r.stop();
              } catch {}
              speechRecognitionRef.current = null;
            }

            if (autoSentRef.current) {
              setInput("");
              return;
            }

            const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
            await handleAudioTranscription(blob);
          };

          mr.start(250);
        } catch {}
      }

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setMicStatus("denied");
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }

  // STOP RECORDING — Leaves transcribed text in prompt for review!
  function stopRecording() {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        const r = speechRecognitionRef.current as any;
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        if (typeof r.abort === "function") r.abort();
        else if (typeof r.stop === "function") r.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      activeStreamRef.current = null;
    }
  }

  // Send audio to /api/voice/sarvam to refine transcript with Sarvam AI
  async function handleAudioTranscription(blob: Blob) {
    // If already auto-sent or audio size is tiny, exit and do not overwrite erased input
    if (autoSentRef.current || blob.size < 1000) return;

    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice_input.webm");
      fd.append("model", "saaras:v2");
      fd.append("language_code", "en-IN");

      const res = await postFormData<{ transcript: string }>("/api/voice/sarvam", fd);

      if (autoSentRef.current) return;

      if (res.ok && res.data?.transcript) {
        const refined = res.data.transcript.trim();
        if (refined && !autoSentRef.current) {
          const fullText = (preSpeechTextRef.current + refined).trim();
          // Check for auto-send trigger in refined transcript as well
          if (SEND_IT_TRIGGER.test(fullText)) {
            autoSentRef.current = true;
            const promptToSend = stripSendItTrigger(fullText);
            preSpeechTextRef.current = "";
            setInput("");
            setVoiceCommandAlert('⚡ Voice Command Detected: "send it send it" — Sending directly without stop permission!');
            setTimeout(() => setVoiceCommandAlert(null), 4000);
            if (promptToSend || attachedMediaRef.current) {
              sendRef.current(promptToSend);
            }
            return;
          }
          if (!autoSentRef.current) {
            setInput(fullText);
          }
        }
      }
    } catch {
      // Retain the live browser dictation already typed into the box
    } finally {
      setTranscribing(false);
      // Focus input so user can review, edit, or hit Send!
      inputRef.current?.focus();
    }
  }

  // File / Video selection handler
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
    setAttachedMedia({
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      isVideo,
    });
    inputRef.current?.focus();
  }

  // Save Sarvam API Key locally & to cookie
  function saveSarvamKey(key: string) {
    const k = key.trim();
    if (!k) return;
    setCookie("sarvam_key", k, 365);
    localStorage.setItem("sarvam_key", k);
    setSarvamKey(k);
    setSavedKeyMask(`${k.slice(0, 4)}...${k.slice(-4)}`);
    setKeySource("cookie");
    setKeySaveMessage("Sarvam API Key saved to browser cookie & local storage successfully!");
    setTimeout(() => setKeySaveMessage(null), 3000);
  }

  // Speak assistant response aloud
  function speakResponse(content: string, idx: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = content.replace(/[*_#`]/g, "").slice(0, 400);
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => setSpeakingIdx(null);
    u.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);

    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(u);
      } catch {
        setSpeakingIdx(null);
      }
    }, 50);
  }

  // Send message from prompt
  async function send(question: string) {
    const q = question.trim();
    if ((!q && !attachedMedia) || loading) return;

    const currentMedia = attachedMedia;
    const finalQuestion = currentMedia
      ? `${q || "Please analyze this attached project media file"}\n[Attached: ${currentMedia.name} (${(currentMedia.size / (1024 * 1024)).toFixed(1)} MB)]`
      : q;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: finalQuestion,
        attachment: currentMedia ?? undefined,
      },
    ]);

    setInput("");
    preSpeechTextRef.current = "";
    setAttachedMedia(null);
    setLoading(true);

    const res = await postJson<AssistantResponse>("/api/assistant", { question: finalQuestion });
    setLoading(false);
    if (res.ok && res.data) {
      const d = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: d.answer,
          sources: d.sources,
          asOf: d.as_of,
          degraded: d.degraded,
          structured: d.structured,
          dataQuality: d.dataQuality,
          provider: d.provider,
          model: d.model,
          navigation: d.navigation,
          report: d.report,
        },
      ]);

      // Contextual auto-navigation if explicit navigation request
      if (d.navigation?.autoExecute) {
        const targetNav = d.navigation;
        setTimeout(() => {
          if (targetNav.view === "live") {
            useAppStore.getState().openTrace(targetNav.targetRef);
          } else {
            useAppStore.getState().drillTo(targetNav.view, targetNav.targetRef);
          }
        }, 1200);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The assistant could not complete the retrieval (${res.error?.message ?? "request failed"}). Core workflows are unaffected — retry, or use the operational views directly.`,
        },
      ]);
    }
    inputRef.current?.focus();
  }

  useEffect(() => {
    sendRef.current = send;
  });

  return (
    <div className="mx-auto flex h-[calc(100vh-210px)] w-full max-w-4xl min-h-[480px] flex-col gap-3">
      {/* Hidden file input for Video & Document attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="video/*,image/*,.pdf,.doc,.docx,.dwg"
        className="hidden"
      />

      {/* Voice & Microphone Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/80 p-2.5 px-3.5 backdrop-blur">
        <div className="flex items-center gap-3">
          {/* Microphone Verification Badge */}
          <div className="flex items-center gap-2">
            {micStatus === "granted" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Mic Verified: {micLabel ? micLabel.slice(0, 22) : "Ready"}
              </span>
            ) : micStatus === "checking" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                Checking Mic...
              </span>
            ) : micStatus === "denied" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                Mic Access Denied
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={verifyMicrophone}
                className="h-7 text-xs border-dashed gap-1 text-muted-foreground hover:text-foreground"
              >
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                Verify Microphone Access
              </Button>
            )}

            {/* Live Audio Decibel Meter */}
            {audioLevel > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">Input:</span>
                <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sarvam AI Key Configuration Status & Modal */}
        <div className="flex items-center gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5 font-medium border-border",
                  savedKeyMask ? "border-amber-500/40 text-amber-300" : "text-muted-foreground"
                )}
              >
                <Key className="h-3 w-3 text-amber-400" />
                {savedKeyMask ? `Sarvam: ${savedKeyMask}` : "Configure Sarvam API Key"}
                <Settings className="h-3 w-3 ml-0.5 opacity-60" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Key className="h-4 w-4 text-amber-400" />
                  Sarvam AI Speech-to-Text Setup
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Provide your Sarvam API subscription key. It will be sent via cookie (<code>sarvam_key</code>) with
                  every voice request.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sarvam API Subscription Key
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your Sarvam API key here..."
                    value={sarvamKey}
                    onChange={(e) => setSarvamKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Saved in browser cookie (<code>credentials: include</code>) and local session storage.
                  </p>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-foreground">Manual Server Configuration (Alternative):</p>
                  <p className="text-muted-foreground leading-relaxed">
                    You can also define <code>SARVAM_API_KEY</code> directly in your <code>.env</code> file or in Vercel
                    Dashboard &gt; Project Settings &gt; Environment Variables.
                  </p>
                </div>

                {keySaveMessage && (
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {keySaveMessage}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCookie("sarvam_key", "", -1);
                      localStorage.removeItem("sarvam_key");
                      setSarvamKey("");
                      setSavedKeyMask(null);
                      setKeySource("none");
                    }}
                    className="text-xs"
                  >
                    Clear Key
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveSarvamKey(sarvamKey)}
                    className="bg-[#d4af37] text-black hover:bg-[#c5a02f] font-semibold text-xs"
                  >
                    Save & Activate
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Copilot Card */}
      <Card className="flex min-h-0 flex-1 flex-col border-[#d4af37]/20 bg-card/95">
        <CardHeader className="flex flex-col gap-0.5 border-b border-[#d4af37]/20 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle
              className="font-display text-base font-semibold tracking-wide flex items-center gap-2"
              style={{ color: GOLD }}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              NASS Operations & Executive Control Tower Copilot
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Live Voice Dictation (ChatGPT style) · Video & Media Attachments · Projects A–E · CEO Action Commands
            </p>
          </div>
          <span
            className="w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ borderColor: `${GOLD}55`, color: GOLD, backgroundColor: `${GOLD}14` }}
          >
            Bahrain Local Time (UTC+3) · Live Grounded
          </span>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {/* Messages scroll area */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-1">
                  {m.attachment && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                      {m.attachment.isVideo ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      <span className="font-medium">{m.attachment.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(m.attachment.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                  )}
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-[#d4af37]/40 bg-[#d4af37]/15 px-3.5 py-2.5 text-sm text-foreground shadow-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] space-y-2">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-2.5 text-sm leading-relaxed">
                      {m.content}
                    </div>

                    {m.structured ? (
                      <StructuredCard structured={m.structured} dataQuality={m.dataQuality} degraded={m.degraded} />
                    ) : null}

                    {/* Sources & Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      {m.sources && m.sources.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Sources:
                          </span>
                          {m.sources.map((s) => (
                            <span
                              key={s}
                              className="rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-[#d4af37]/25 dark:bg-zinc-900 dark:text-[#d4af37]/90"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Text-To-Speech Button */}
                      <button
                        type="button"
                        onClick={() => speakResponse(m.content, i)}
                        title={speakingIdx === i ? "Stop speaking" : "Read answer aloud"}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-400 transition-colors"
                      >
                        {speakingIdx === i ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-amber-400 font-medium">Stop audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>

                    {m.asOf ? <p className="text-[10px] text-muted-foreground">as of {fmtDateTime(m.asOf)}</p> : null}

                    {/* Voice / Contextual Navigation Card */}
                    {m.navigation && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent p-3 text-xs shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Compass className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {m.navigation.autoExecute ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] font-bold uppercase text-amber-300 border border-amber-500/30">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" /> Direct UI Control
                                </span>
                              ) : null}
                              <p className="font-semibold text-amber-300">{m.navigation.label}</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{m.navigation.description}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (m.navigation!.view === "live") {
                              useAppStore.getState().openTrace(m.navigation!.targetRef);
                            } else {
                              useAppStore.getState().drillTo(m.navigation!.view, m.navigation!.targetRef);
                            }
                          }}
                          className="bg-amber-500 text-black font-semibold hover:bg-amber-400 shrink-0 h-8 gap-1.5 shadow-sm"
                        >
                          {m.navigation.autoExecute ? "Opening Destination ➔" : "Open Destination"} <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* On-Demand PDF Report Card */}
                    {m.report && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d4af37]/50 bg-[#14110a] p-3 text-xs shadow-md">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30 shadow-inner">
                            PDF
                          </div>
                          <div>
                            <p className="font-semibold text-[#f3dc8e] text-xs">{m.report.title}</p>
                            <p className="text-[11px] text-muted-foreground">Authoritative luxury A4 PDF report · Verified database snapshot</p>
                          </div>
                        </div>
                        <a
                          href={m.report.downloadUrl}
                          download
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#f3dc8e] transition-colors shrink-0 shadow-sm"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </a>
                      </div>
                    )}

                    {/* AI Model Attribution */}
                    {m.provider && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-medium text-emerald-400">{m.provider}</span>
                        {m.model && <span className="text-zinc-500">({m.model})</span>}
                      </div>
                    )}

                    {m.degraded ? (
                      <p className="inline-flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        Fallback mode — grounded response from retrieved database records.
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            )}

            {/* Active Recording or Transcribing state */}
            {isRecording && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold text-xs">
                    Listening & writing live into prompt... {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                    {String(recordingSeconds % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Say <strong className="text-amber-200">"send it send it"</strong> to auto-send directly!</span>
                </div>
              </div>
            )}

            {/* Voice Command Trigger Alert Badge */}
            {voiceCommandAlert && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-200 shadow-lg shadow-amber-500/10 animate-pulse">
                <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                <span>{voiceCommandAlert}</span>
              </div>
            )}

            {transcribing && (
              <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" /> Refining speech with Sarvam AI Speech-to-Text (saaras:v2)...
              </div>
            )}

            {loading && !transcribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> Querying project commitments, BOQ demands and shipment records…
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading || isRecording}
                onClick={() => send(s)}
                className={cn(
                  "rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 px-2.5 py-1 text-xs text-foreground/90 transition-colors hover:bg-[#d4af37]/20",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Attached Media Pill (shown above prompt) */}
          {attachedMedia && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                {attachedMedia.isVideo ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="font-semibold">{attachedMedia.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({(attachedMedia.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                title="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Input & Microphone Bar (ChatGPT style) */}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            {/* Attachment Button for Video / Documents */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isRecording}
              title="Attach video, photo, or project document"
              className={cn(
                "min-h-11 min-w-11 rounded-lg transition-all border-border",
                attachedMedia ? "border-amber-400 text-amber-400 bg-amber-400/10" : "hover:border-amber-400/60"
              )}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Microphone Recording Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              title={
                isRecording
                  ? "Click to finish voice-over dictation"
                  : "Click to start voice-over dictation into prompt"
              }
              className={cn(
                "min-h-11 min-w-11 rounded-lg transition-all",
                isRecording
                  ? "border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
                  : "border-border hover:border-amber-400/60 hover:text-amber-400"
              )}
            >
              {isRecording ? <MicOff className="h-5 w-5 text-red-400" /> : <Mic className="h-5 w-5 text-amber-400" />}
            </Button>

            {/* Live Dictation Input (transcribed in real time) */}
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? 'Listening live... speak normally, then say "send it send it" to auto-send directly!'
                  : 'Type or click mic for voice-over dictation (say "send it send it" to auto-send)...'
              }
              aria-label="Question"
              maxLength={2000}
              disabled={loading}
              className={cn(
                "min-h-11 border-[#d4af37]/25 focus-visible:ring-[#d4af37]/40 text-sm transition-all",
                isRecording && "border-red-500/60 bg-red-500/5 text-amber-300 font-medium"
              )}
            />

            {/* Send Button — active when text or video is ready */}
            <Button
              type="submit"
              disabled={loading || isRecording || (!input.trim() && !attachedMedia)}
              className="min-h-11 shrink-0 bg-[#d4af37] font-semibold text-black hover:bg-[#c5a02f] px-5 transition-all disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
