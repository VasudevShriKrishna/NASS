"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { fmtBahrainTime } from "@/lib/bahrain-time";
import type { VoiceState, CopilotMessage, MediaAttachment } from "@/lib/voice/copilot-types";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Radio,
  CornerDownRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Paperclip,
  Video,
  Image as ImageIcon,
  FileText,
  Key,
  Check,
  Trash2,
  Play,
  Square,
  Eye,
  EyeOff,
  Sliders,
  Compass,
  ArrowUpRight,
  Download,
  Zap,
  GripVertical,
} from "lucide-react";

/**
 * Hands-Free Voice Trigger: "send it send it"
 * Case-insensitive match with flexible whitespace and optional trailing/intervening punctuation.
 */
export const SEND_IT_TRIGGER_REGEX = /\b(?:send\s+it\s*[,.]?\s*send\s+it)\b/i;

/**
 * Strips "send it send it" and any trailing filler words from the dictated text
 * so only the authentic operator query is dispatched to the LLM.
 */
export function stripSendItTrigger(text: string): string {
  return text
    .replace(/\s*[,.]?\s*send\s+it\s*[,.]?\s*send\s+it[\s.!?,]*.*$/i, "")
    .replace(/\b(?:send\s+it\s*[,.]?\s*send\s+it)\b/gi, "")
    .trim();
}

const INITIAL_SUGGESTIONS = [
  "Open shipment SHP-8803 and show live status",
  "Take me to Project A's materials and generate a PDF report",
  "Download CEO executive summary report for all projects",
  "Why does PO-3001 show 0 linked shipments while 120t is in transit?",
  "Check connector health vs data freshness for Customs Broker",
  "Generate a material and backup-stock report for S355 steel",
];

// Helper: Cookie reading/writing
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VoiceCopilot() {
  const { view, drill, drillTo, openTrace, isVoiceCopilotOpen, setVoiceCopilotOpen } = useAppStore();
  const isOpen = isVoiceCopilotOpen;
  const setIsOpen = setVoiceCopilotOpen;
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Welcome to the NASS Voice AI Copilot. I can navigate directly to any operational module or record, answer complex supply-chain questions, and generate on-demand downloadable PDF reports.\n\nTry asking: *'Open shipment SHP-8803'*, *'Take me to Project A materials'*, or *'Generate a CEO executive summary PDF'*.",
      timestamp: fmtBahrainTime(new Date()),
      sources: ["nass_operational_backbone"],
    },
  ]);

  // ChatGPT-style Dictation & Prompt States
  const [inputText, setInputText] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<MediaAttachment | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationDuration, setDictationDuration] = useState(0);

  // "Send It Send It" Hands-Free Auto-Dispatch States
  const autoSentRef = useRef<boolean>(false);
  const [voiceCommandTriggered, setVoiceCommandTriggered] = useState<string | null>(null);

  // Configurable Hands-Free Continuous Voice Mode (Master Spec Section 4)
  const [isHandsFreeMode, setIsHandsFreeMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nass_handsfree_mode") === "true";
    }
    return false;
  });

  // Conversational Context Tracking (Active entity resolution)
  const [activeContext, setActiveContext] = useState({
    selectedProject: "PRJ-2201",
    selectedShipment: "SHP-8802",
    selectedPo: "PO-3001",
    selectedMaterial: "MAT-REBAR-B500B",
  });

  // Settings & Verification States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioLatency, setAudioLatency] = useState<number | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);

  // Sarvam Key Configuration
  const [sarvamKey, setSarvamKey] = useState("");
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [serverKeyStatus, setServerKeyStatus] = useState<{ configured: boolean; source: string }>({
    configured: false,
    source: "none",
  });
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);

  // Microphone Verification State
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "unsupported">("prompt");
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestRecordedUrl, setMicTestRecordedUrl] = useState<string | null>(null);

  // ─── DRAGGABLE FLOATING AI BUTTON STATE (PERSISTED IN LOCALSTORAGE) ───
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false,
  });
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize position from localStorage or default to top-right
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("nass_ai_btn_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const maxX = Math.max(10, window.innerWidth - 240);
          const maxY = Math.max(10, window.innerHeight - 60);
          setBtnPos({
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
          });
          return;
        }
      }
    } catch {}
    // Default top-right position
    const defaultX = Math.max(10, window.innerWidth - 240);
    setBtnPos({ x: defaultX, y: 12 });
  }, []);

  // Update on window resize to ensure button stays on screen
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        if (!prev) return prev;
        const maxX = Math.max(10, window.innerWidth - 240);
        const maxY = Math.max(10, window.innerHeight - 60);
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const currentX = btnPos ? btnPos.x : Math.max(10, window.innerWidth - 240);
    const currentY = btnPos ? btnPos.y : 12;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      moved: false,
    };
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 4) {
      dragStartRef.current.moved = true;
    }

    const rect = buttonContainerRef.current?.getBoundingClientRect();
    const btnW = rect?.width || 220;
    const btnH = rect?.height || 50;
    const maxX = Math.max(8, window.innerWidth - btnW - 8);
    const maxY = Math.max(8, window.innerHeight - btnH - 8);

    const newX = Math.min(Math.max(8, dragStartRef.current.initX + dx), maxX);
    const newY = Math.min(Math.max(8, dragStartRef.current.initY + dy), maxY);

    setBtnPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (btnPos) {
      try {
        localStorage.setItem("nass_ai_btn_pos", JSON.stringify(btnPos));
      } catch {}
    }
  };

  // Audio recording & playback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dictationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptBeforeSpeechRef = useRef<string>("");

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, voiceState]);

  // Load Sarvam Key from Cookie / LocalStorage and check server status
  useEffect(() => {
    try {
      const cookieKey = getCookie("sarvam_api_key");
      const localKey = localStorage.getItem("nass_sarvam_api_key");
      const effective = cookieKey || localKey || "";
      if (effective) {
        setSarvamKey(effective);
      }
    } catch {}

    // Check backend status
    fetch("/api/voice/stt", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.configured === "boolean") {
          setServerKeyStatus({ configured: data.configured, source: data.source || "none" });
        }
      })
      .catch(() => {});
  }, []);

  // Check microphone permissions
  const checkMicPermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermission("unsupported");
        return "unsupported";
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicPermission(result.state as any);
          result.onchange = () => {
            setMicPermission(result.state as any);
          };
          return result.state;
        } catch {
          // Some browsers reject { name: "microphone" }
        }
      }
      return "prompt";
    } catch {
      return "prompt";
    }
  }, []);

  useEffect(() => {
    checkMicPermission();
  }, [checkMicPermission]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (dictationTimerRef.current) {
        clearInterval(dictationTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isHandsFreeRef = useRef(isHandsFreeMode);
  useEffect(() => {
    isHandsFreeRef.current = isHandsFreeMode;
  }, [isHandsFreeMode]);

  const startVoiceOverDictationRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (voiceState === "SPEAKING") {
      setVoiceState("INTERRUPTED");
      setTimeout(() => setVoiceState("IDLE"), 800);
    }
  }, [voiceState]);

  // Play audio response via Sarvam TTS output or browser fallback
  const playTtsAudio = useCallback(
    (audioBase64: string | null | undefined, textFallback: string) => {
      if (isAudioMuted) {
        setVoiceState("IDLE");
        if (isHandsFreeRef.current) {
          setTimeout(() => startVoiceOverDictationRef.current(), 700);
        }
        return;
      }

      stopCurrentAudio();

      if (audioBase64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
          currentAudioRef.current = audio;
          setVoiceState("SPEAKING");

          audio.onended = () => {
            currentAudioRef.current = null;
            setVoiceState("IDLE");
            if (isHandsFreeRef.current) {
              setTimeout(() => {
                startVoiceOverDictationRef.current();
              }, 700);
            }
          };

          audio.onerror = (e) => {
            console.warn("[VoiceCopilot] Audio playback error:", e);
            currentAudioRef.current = null;
            setVoiceState("IDLE");
            if (isHandsFreeRef.current) {
              setTimeout(() => startVoiceOverDictationRef.current(), 700);
            }
          };

          audio.play().catch((err) => {
            console.warn("[VoiceCopilot] Playback rejected by browser policy:", err);
            setVoiceState("IDLE");
            if (isHandsFreeRef.current) {
              setTimeout(() => startVoiceOverDictationRef.current(), 700);
            }
          });
        } catch (e) {
          console.error("[VoiceCopilot] TTS audio init failed:", e);
          setVoiceState("IDLE");
        }
      } else if ("speechSynthesis" in window) {
        // Fallback to browser Web Speech API
        try {
          window.speechSynthesis.cancel();
          const cleanText = textFallback
            .replace(/[*#_`[\]]/g, "")
            .replace(/\b(SHP|PO|GRN|AST|PRJ)-\d+\b/g, "$&")
            .slice(0, 300);

          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = "en-US";
          utterance.rate = 1.05;

          utterance.onstart = () => setVoiceState("SPEAKING");
          utterance.onend = () => {
            setVoiceState("IDLE");
            if (isHandsFreeRef.current) {
              setTimeout(() => startVoiceOverDictationRef.current(), 700);
            }
          };
          utterance.onerror = () => {
            setVoiceState("IDLE");
            if (isHandsFreeRef.current) {
              setTimeout(() => startVoiceOverDictationRef.current(), 700);
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          setVoiceState("IDLE");
        }
      } else {
        setVoiceState("IDLE");
      }
    },
    [isAudioMuted, stopCurrentAudio]
  );

  // Setup Audio Meter Visualizer
  const startAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn("[VoiceCopilot] Could not start audio meter:", err);
    }
  };

  const stopAudioMeter = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Test Microphone Functionality (Verification)
  const runMicrophoneTest = async () => {
    if (isTestingMic) return;
    try {
      setIsTestingMic(true);
      setMicTestRecordedUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      startAudioMeter(stream);

      const chunks: Blob[] = [];
      const testRecorder = new MediaRecorder(stream);
      testRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      testRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopAudioMeter();
        setIsTestingMic(false);

        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 200) {
          const url = URL.createObjectURL(blob);
          setMicTestRecordedUrl(url);
          // Play back the recorded test audio
          const audio = new Audio(url);
          audio.play().catch(() => {});
        }
      };

      testRecorder.start();
      // Record 2.5 seconds
      setTimeout(() => {
        if (testRecorder.state === "recording") {
          testRecorder.stop();
        }
      }, 2500);
    } catch (err: any) {
      console.error("[Microphone Test Error]", err);
      setIsTestingMic(false);
      stopAudioMeter();
      setMicPermission("denied");
    }
  };

  // ─── CHATGPT-STYLE VOICE-OVER DICTATION ───
  // Step 1: User clicks [ 🎙️ Speak Voice-Over ]
  // Step 2: Words are typed LIVE into the chat prompt input
  // Step 3: User can edit, attach video/media (optional)
  // Step 4: User reviews and clicks Send
  const startVoiceOverDictation = async () => {
    startVoiceOverDictationRef.current = startVoiceOverDictation;
    if (voiceState === "SPEAKING") {
      stopCurrentAudio();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone capture is not supported in this browser environment. You can type queries below.");
        setMicPermission("unsupported");
        return;
      }

      autoSentRef.current = false;
      promptBeforeSpeechRef.current = inputText;
      if (micPermission !== "granted") {
        setVoiceState("REQUESTING_PERMISSION");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      startAudioMeter(stream);

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        stopAudioMeter();

        // If hands-free "send it send it" auto-dispatched the query, abort STT refinement so we never repopulate the erased prompt
        if (autoSentRef.current) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        // If user configured Sarvam or want high-precision refinement
        if (audioBlob.size > 500) {
          try {
            const formData = new FormData();
            formData.append("file", audioBlob, "dictation.webm");
            if (sarvamKey) formData.append("sarvamApiKey", sarvamKey);

            const sttRes = await fetch("/api/voice/stt", {
              method: "POST",
              credentials: "include",
              headers: sarvamKey ? { "x-sarvam-key": sarvamKey } : {},
              body: formData,
            });

            if (sttRes.ok) {
              const sttData = await sttRes.json();
              if (!autoSentRef.current && sttData.transcript && sttData.transcript.trim()) {
                const refined = sttData.transcript.trim();
                setInputText((prev) => {
                  if (autoSentRef.current) return "";
                  const base = promptBeforeSpeechRef.current.trim();
                  return base ? `${base} ${refined}` : refined;
                });
              }
            }
          } catch (e) {
            console.warn("[Sarvam STT Refine Notice]", e);
          }
        }
      };

      // Try browser Web Speech API for real-time live typing into the prompt
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          speechRecognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-IN";

          recognition.onresult = (event: any) => {
            // Guard: If query was already auto-dispatched, ignore trailing audio frames
            if (autoSentRef.current) return;

            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            const currentSpoken = (finalTranscript || interimTranscript).trim();
            if (!currentSpoken) return;

            // ─── LOCAL VOICE COMMAND INTERCEPTION (Section 4) ───
            // 1. "Stop speaking"
            if (/\b(stop speaking|shut up|be quiet|stop talking|stop audio)\b/i.test(currentSpoken)) {
              stopCurrentAudio();
              setVoiceState("INTERRUPTED");
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Stop Speaking" — Audio halted');
              setInputText("");
              promptBeforeSpeechRef.current = "";
              setTimeout(() => {
                setVoiceCommandTriggered(null);
                setVoiceState(isHandsFreeRef.current ? "LISTENING" : "IDLE");
              }, 1200);
              return;
            }

            // 2. "Pause listening"
            if (/\b(pause listening|pause dictation|stop listening)\b/i.test(currentSpoken)) {
              stopVoiceOverDictation();
              setVoiceState("PAUSED");
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Pause Listening" — Listening paused (say "resume listening" to continue)');
              setInputText("");
              promptBeforeSpeechRef.current = "";
              setTimeout(() => setVoiceCommandTriggered(null), 3500);
              return;
            }

            // 3. "Resume listening"
            if (/\b(resume listening|resume dictation|start listening)\b/i.test(currentSpoken)) {
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Resume Listening" — Listening resumed');
              setTimeout(() => setVoiceCommandTriggered(null), 2500);
              startVoiceOverDictation();
              return;
            }

            // 4. "Cancel that operation"
            if (/\b(cancel that operation|cancel operation|cancel that|abort operation)\b/i.test(currentSpoken)) {
              stopVoiceOverDictation();
              setInputText("");
              promptBeforeSpeechRef.current = "";
              setVoiceState("IDLE");
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Cancel Operation" — Operation cancelled');
              setTimeout(() => setVoiceCommandTriggered(null), 3000);
              return;
            }

            // 5. "Repeat the last answer"
            if (/\b(repeat the last answer|repeat that|say that again|repeat last answer|repeat answer)\b/i.test(currentSpoken)) {
              stopVoiceOverDictation();
              setInputText("");
              promptBeforeSpeechRef.current = "";
              const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
              if (lastAssistant) {
                setVoiceCommandTriggered('⚡ Voice Command Detected: "Repeat Last Answer"');
                playTtsAudio(null, lastAssistant.spokenText || lastAssistant.content || "");
              }
              setTimeout(() => setVoiceCommandTriggered(null), 3000);
              return;
            }

            // 6. "Go back"
            if (/\b(go back|return to previous page|take me back)\b/i.test(currentSpoken)) {
              stopVoiceOverDictation();
              setInputText("");
              promptBeforeSpeechRef.current = "";
              useAppStore.getState().goBack();
              setVoiceState("NAVIGATING");
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Go Back" — Returning to previous page');
              setTimeout(() => {
                setVoiceCommandTriggered(null);
                setVoiceState(isHandsFreeRef.current ? "LISTENING" : "IDLE");
                if (isHandsFreeRef.current) startVoiceOverDictation();
              }, 1400);
              return;
            }

            const base = promptBeforeSpeechRef.current.trim();
            const combined = base ? `${base} ${currentSpoken}` : currentSpoken;

            // ─── HANDS-FREE VOICE TRIGGER: "send it send it" AUTO-DISPATCH ───
            if (SEND_IT_TRIGGER_REGEX.test(combined)) {
              // 1. Set Guard Flag to prevent double dispatch or race conditions
              autoSentRef.current = true;

              // 2. Unhook Trailing Speech Events immediately to stop browser engine delivering trailing audio frames
              try {
                recognition.onresult = null;
                recognition.onerror = null;
                recognition.onend = null;
                recognition.abort();
              } catch {}
              speechRecognitionRef.current = null;

              // 3. Extract cleaned prompt and erase the prompt bar immediately
              const cleanPrompt = stripSendItTrigger(combined);
              setInputText("");
              promptBeforeSpeechRef.current = "";

              // 4. Visual Indicator: Animated gold badge
              setVoiceCommandTriggered('⚡ Voice Command Detected: "send it send it" — Sending directly without stop permission!');
              setTimeout(() => {
                setVoiceCommandTriggered(null);
              }, 5500);

              // 5. Halt Recording (power down mic & meter)
              stopVoiceOverDictation();

              // 6. Dispatch directly without requiring any user click or permission
              if (cleanPrompt) {
                submitFinalQuery(cleanPrompt);
              }
              return;
            }

            setInputText(combined);
          };

          recognition.onerror = (e: any) => {
            console.warn("[SpeechRecognition Error]", e);
          };

          recognition.start();
        } catch (e) {
          console.warn("[SpeechRecognition Start Failed]", e);
        }
      }

      mediaRecorder.start(250);
      setIsDictating(true);
      setDictationDuration(0);
      setVoiceState("LISTENING");
      if (!isOpen) setIsOpen(true);

      // Start timer
      dictationTimerRef.current = setInterval(() => {
        setDictationDuration((prev) => prev + 1);
      }, 1000);

      // Focus textarea
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err: any) {
      console.warn("[VoiceCopilot Mic Error]", err);
      setMicPermission("denied");
      setVoiceState("PERMISSION_DENIED");
      setShowMicModal(true);
      setTimeout(() => setVoiceState("IDLE"), 4000);
    }
  };

  const stopVoiceOverDictation = () => {
    setIsDictating(false);
    setVoiceState("IDLE");

    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceOverDictation = () => {
    stopVoiceOverDictation();
    // Revert to prompt before speaking
    setInputText(promptBeforeSpeechRef.current);
  };

  // ─── MEDIA ATTACHMENT HANDLER ───
  const handleFileAttach = (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const type: "video" | "image" | "document" = isVideo ? "video" : isImage ? "image" : "document";
    const url = URL.createObjectURL(file);

    setAttachedMedia({
      id: `media-${Date.now()}`,
      name: file.name,
      size: file.size,
      type,
      url,
      mimeType: file.type || (isVideo ? "video/mp4" : "application/octet-stream"),
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ─── SUBMIT QUERY (REVIEW & CLICK SEND) ───
  const submitFinalQuery = async (queryOverride?: string) => {
    let textToSend = (typeof queryOverride === "string" ? queryOverride : inputText).trim();
    textToSend = stripSendItTrigger(textToSend);
    if (!textToSend && !attachedMedia) return;

    autoSentRef.current = false;

    if (isDictating) {
      stopVoiceOverDictation();
    }

    stopCurrentAudio();
    setVoiceState("INTERPRETING");

    const pageContext = {
      activeView: view,
      selectedRef: drill?.ref,
      context: activeContext,
    };

    const mediaSnapshot = attachedMedia ? { ...attachedMedia } : null;
    const userQuery = textToSend || (mediaSnapshot ? `Inspect attached ${mediaSnapshot.type}` : "");

    // Add user message to conversation immediately with AST (Bahrain Local Time)
    const userMsgId = `user-${Date.now()}`;
    const userMsg: CopilotMessage = {
      id: userMsgId,
      role: "user",
      content: userQuery,
      timestamp: fmtBahrainTime(new Date()),
      media: mediaSnapshot || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setAttachedMedia(null);

    setVoiceState("FETCHING_DATA");

    try {
      const res = await fetch("/api/voice/copilot", {
        method: "POST",
        credentials: "include", // Transmit cookies including sarvam_api_key
        headers: {
          "Content-Type": "application/json",
          ...(sarvamKey ? { "x-sarvam-key": sarvamKey } : {}),
        },
        body: JSON.stringify({
          userMessage: userQuery,
          pageContext,
          voiceOutputWanted: !isAudioMuted,
          sarvamApiKey: sarvamKey || undefined,
          media: mediaSnapshot
            ? {
                name: mediaSnapshot.name,
                type: mediaSnapshot.type,
                size: mediaSnapshot.size,
              }
            : undefined,
          history: messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content || "" })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const responseData = await res.json();

      // Handle navigation redirection smoothly
      if (responseData.navigation) {
        setVoiceState("NAVIGATING");
        const nav = responseData.navigation;
        if (nav.view === "__back__") {
          useAppStore.getState().goBack();
        } else {
          const target = nav.targetRef || nav.recordRef;
          const doNavigation = () => {
            if (nav.view === "live" && target && /^SHP-/i.test(target)) {
              openTrace(target);
            } else if (nav.view) {
              drillTo(nav.view as any, target);
            }
          };

          if (nav.autoExecute) {
            // Smooth auto-navigation execution after 1.2s per Master Spec Section 4.C
            setTimeout(doNavigation, 1200);
          } else {
            doNavigation();
          }
        }

        // Update active context entities
        if (nav.recordRef?.startsWith("SHP-") || nav.targetRef?.startsWith("SHP-")) {
          setActiveContext((prev) => ({ ...prev, selectedShipment: nav.targetRef || nav.recordRef! }));
        } else if (nav.recordRef?.startsWith("PO-")) {
          setActiveContext((prev) => ({ ...prev, selectedPo: nav.recordRef! }));
        } else if (nav.recordRef?.startsWith("PRJ-")) {
          setActiveContext((prev) => ({ ...prev, selectedProject: nav.recordRef! }));
        }
      }

      if (responseData.report) {
        setVoiceState("GENERATING_REPORT");
      }

      let messageContent = responseData.answerText?.trim();
      if (!messageContent) {
        if (responseData.toolsUsed?.length) {
          messageContent = `Executed operational intelligence tools (${responseData.toolsUsed.join(", ")}). Data retrieved from authoritative NASS records.`;
        } else {
          messageContent = "NASS Control Tower operational. Inquire about active projects (PRJ-2201, PRJ-BIA-01, PRJ-KAMC-03), purchase orders, shipments, or stock balance.";
        }
      }

      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: messageContent,
        spokenText: responseData.spokenText || messageContent,
        timestamp: fmtBahrainTime(new Date()),
        toolsUsed: responseData.toolsUsed || [],
        sources: responseData.sources || [],
        followUpSuggestions: responseData.followUpSuggestions || [],
        navigation: responseData.navigation,
        report: responseData.report,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAudioLatency(responseData.latencyMs || null);
      if (responseData.providerNotice) {
        setProviderNotice(responseData.providerNotice);
      }

      // Voice output
      if (!isAudioMuted && (responseData.tts?.audioBase64 || responseData.spokenText || responseData.answerText)) {
        playTtsAudio(responseData.tts?.audioBase64, responseData.spokenText || responseData.answerText);
      } else {
        setVoiceState("IDLE");
        if (isHandsFreeRef.current) {
          setTimeout(() => startVoiceOverDictationRef.current(), 700);
        }
      }
    } catch (err: any) {
      console.error("[VoiceCopilot Query Error]", err);
      setVoiceState("RECOVERING");
      setTimeout(() => setVoiceState("ERROR"), 800);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠ **Operational Notice:** ${err?.message || "Encountered an unexpected network or processing error. Please retry."}`,
          timestamp: fmtBahrainTime(new Date()),
          sources: ["error_recovery"],
        },
      ]);
      setTimeout(() => {
        setVoiceState(isHandsFreeRef.current ? "LISTENING" : "IDLE");
        if (isHandsFreeRef.current) startVoiceOverDictationRef.current();
      }, 4000);
    }
  };

  // Save Sarvam Key to Cookie & LocalStorage
  const handleSaveSarvamKey = () => {
    const cleanKey = sarvamKey.trim();
    if (cleanKey) {
      setCookie("sarvam_api_key", cleanKey, 30);
      try {
        localStorage.setItem("nass_sarvam_api_key", cleanKey);
      } catch {}
      setServerKeyStatus({ configured: true, source: "cookie" });
    } else {
      deleteCookie("sarvam_api_key");
      try {
        localStorage.removeItem("nass_sarvam_api_key");
      } catch {}
      setServerKeyStatus({ configured: false, source: "none" });
    }
    setKeySavedFeedback(true);
    setTimeout(() => {
      setKeySavedFeedback(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const handleEntityClick = (entityRef: string) => {
    if (/^SHP-\d+/i.test(entityRef)) {
      openTrace(entityRef);
    } else if (/^PO-\d+/i.test(entityRef)) {
      drillTo("procurement", entityRef);
    } else if (/^GRN-\d+/i.test(entityRef)) {
      drillTo("receiving", entityRef);
    } else if (/^AST-[\w-]+/i.test(entityRef)) {
      drillTo("assets", entityRef);
    } else if (/^PRJ-\d+/i.test(entityRef)) {
      drillTo("projects", entityRef);
    } else if (/^EXC-\d+/i.test(entityRef)) {
      drillTo("exceptions", entityRef);
    }
  };

  // Render text with clickable badges for entities
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\b(?:SHP|PO|GRN|AST|PRJ|EXC)-[A-Za-z0-9_-]+\b)/g);

      return (
        <p key={lineIdx} className={cn(lineIdx > 0 && "mt-1.5", "leading-relaxed text-xs sm:text-sm")}>
          {parts.map((part, partIdx) => {
            if (/^(?:SHP|PO|GRN|AST|PRJ|EXC)-[A-Za-z0-9_-]+$/i.test(part)) {
              return (
                <button
                  key={partIdx}
                  onClick={() => handleEntityClick(part)}
                  title={`Click to inspect ${part} in Control Tower`}
                  className="mx-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all hover:scale-[1.03]"
                >
                  <span>{part}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </button>
              );
            }

            if (part.includes("**")) {
              const boldParts = part.split(/(\*\*.*?\*\*)/g);
              return (
                <span key={partIdx}>
                  {boldParts.map((bp, bpi) => {
                    if (bp.startsWith("**") && bp.endsWith("**")) {
                      return (
                        <strong key={bpi} className="font-semibold text-foreground">
                          {bp.slice(2, -2)}
                        </strong>
                      );
                    }
                    return bp;
                  })}
                </span>
              );
            }

            return <span key={partIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── SINGLE DRAGGABLE FLOATING AI BUTTON (TOP-RIGHT DEFAULT · STAYS ON ALL PAGES) ─── */}
      <div
        ref={buttonContainerRef}
        style={
          btnPos
            ? { left: `${btnPos.x}px`, top: `${btnPos.y}px` }
            : { right: "1.5rem", top: "0.75rem" }
        }
        className={cn(
          "fixed z-[75] flex items-center gap-2 select-none touch-none",
          isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isOpen && (isDictating || voiceState === "SPEAKING") && (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-black/90 px-3 py-1.5 text-xs text-amber-400 shadow-xl backdrop-blur-md animate-pulse">
            <Radio className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="font-medium tracking-wide">
              {isDictating ? "Voice dictation active..." : "Speaking response..."}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            if (dragStartRef.current.moved) {
              e.stopPropagation();
              return;
            }
            setIsOpen(!isOpen);
            if (voiceState === "SPEAKING") stopCurrentAudio();
          }}
          className={cn(
            "relative flex items-center gap-2 rounded-full border px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-2xl transition-all duration-200 group",
            isOpen
              ? "border-amber-400 bg-[#12141a] text-amber-300 shadow-[0_0_20px_rgba(212,175,55,0.35)] ring-1 ring-amber-400/40"
              : "border-amber-500/40 bg-[#0d0f14]/95 text-foreground hover:border-amber-400 shadow-black/80 backdrop-blur-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          )}
          title="Drag anywhere on screen · Click to open Sarvam 105B Voice AI Copilot"
        >
          {/* Subtle Drag Grip Handle */}
          <GripVertical className="h-3.5 w-3.5 text-amber-500/50 group-hover:text-amber-300 shrink-0" />

          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/20 blur opacity-75 group-hover:opacity-100 transition duration-500 -z-10" />

          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors shrink-0",
              isDictating
                ? "bg-red-500/20 text-red-400 animate-ping"
                : voiceState === "SPEAKING"
                ? "bg-amber-500/20 text-amber-300 animate-pulse"
                : "bg-amber-500/15 text-amber-400"
            )}
          >
            {voiceState === "SPEAKING" ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : isDictating ? (
              <Mic className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </div>

          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300 whitespace-nowrap">
                Voice AI
              </span>
              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[8px] font-mono font-medium text-amber-400">
                Sarvam 105B
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              {isDictating ? (
                <span className="text-red-400 font-semibold animate-pulse">● Live Dictating...</span>
              ) : voiceState === "SPEAKING" ? (
                <span className="text-amber-400 font-semibold">● Speaking...</span>
              ) : (
                <span>Voice Copilot · Drag &amp; Drop</span>
              )}
            </span>
          </div>

          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-400 shrink-0" />
          )}
        </button>
      </div>

      {/* ─── EXPANDABLE VOICE COPILOT DRAWER (TOP-RIGHT ANCHORED) ─── */}
      {isOpen && (
        <div
          className={cn(
            "fixed top-16 right-4 sm:right-6 z-[70] flex flex-col w-[94vw] sm:w-[500px] h-[660px] max-h-[84vh]",
            "rounded-2xl border border-amber-500/30 bg-[#0c0e14]/98 shadow-2xl shadow-black/90 backdrop-blur-xl",
            "transition-all duration-300 animate-in fade-in slide-in-from-top-4"
          )}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between border-b border-amber-500/15 px-4 py-3 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-foreground">
                    NASS Closed-Loop Copilot
                  </h3>
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" /> Read-Only
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Context: <span className="font-mono text-amber-300/80">{view}</span>
                  {drill?.ref ? ` · Ref: ${drill.ref}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Hands-Free Voice Mode Toggle (Section 4) */}
              <button
                onClick={() => {
                  const next = !isHandsFreeMode;
                  setIsHandsFreeMode(next);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("nass_handsfree_mode", String(next));
                  }
                  if (next && voiceState === "IDLE") {
                    setTimeout(() => startVoiceOverDictation(), 200);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold tracking-wide transition-all",
                  isHandsFreeMode
                    ? "border-amber-400 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-200 shadow-sm shadow-amber-500/30"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
                title="Hands-Free Voice Mode: Operates continuously without repeated clicks"
              >
                <Zap className={cn("h-3 w-3", isHandsFreeMode ? "text-amber-300 animate-pulse" : "text-muted-foreground")} />
                <span>{isHandsFreeMode ? "Hands-Free: ON" : "Hands-Free: OFF"}</span>
              </button>

              {/* Sarvam Key Status Button */}
              <button
                onClick={() => setShowKeyModal(!showKeyModal)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors",
                  serverKeyStatus.configured || sarvamKey
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 animate-pulse"
                )}
                title="Configure Sarvam API Key (Cookie / .env / Header)"
              >
                <Key className="h-3 w-3" />
                <span>{serverKeyStatus.configured || sarvamKey ? "Sarvam: Ready" : "+ Set Key"}</span>
              </button>

              {/* Microphone Verification Button */}
              <button
                onClick={() => setShowMicModal(!showMicModal)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors",
                  micPermission === "granted"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : micPermission === "denied"
                    ? "border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                )}
                title="Verify Microphone Access & Audio Levels"
              >
                <Mic className="h-3 w-3" />
                <span>
                  {micPermission === "granted"
                    ? "Mic: OK"
                    : micPermission === "denied"
                    ? "Mic: Blocked"
                    : "Check Mic"}
                </span>
              </button>

              {/* Audio Mute/Unmute toggle */}
              <button
                onClick={() => {
                  if (voiceState === "SPEAKING") stopCurrentAudio();
                  setIsAudioMuted(!isAudioMuted);
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                  isAudioMuted
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
                title={isAudioMuted ? "Audio output muted (Text only)" : "Audio voice output active"}
              >
                {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={() => {
                  stopCurrentAudio();
                  if (isDictating) stopVoiceOverDictation();
                  setIsOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground transition-colors"
                title="Minimize Copilot"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ─── POPUP: SARVAM API KEY CONFIGURATION ─── */}
          {showKeyModal && (
            <div className="border-b border-amber-500/20 bg-[#10131b] p-3 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" /> Sarvam API Key Configuration
                </span>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Current Source:</span>
                  <span className="font-mono text-amber-400">
                    {sarvamKey
                      ? "Browser Cookie (sarvam_api_key)"
                      : serverKeyStatus.configured
                      ? `Server (${serverKeyStatus.source})`
                      : "Not Configured"}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKeyPassword ? "text" : "password"}
                    value={sarvamKey}
                    onChange={(e) => setSarvamKey(e.target.value)}
                    placeholder="Paste Sarvam api-subscription-key..."
                    className="w-full rounded-md border border-border/70 bg-[#0b0c10] px-3 py-1.5 pr-8 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-amber-500/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2 text-muted-foreground hover:text-foreground"
                    title={showKeyPassword ? "Hide key" : "Show key"}
                  >
                    {showKeyPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-muted-foreground/80 leading-tight">
                    Stored in cookie &amp; sent via <code className="font-mono text-[9px]">credentials: &apos;include&apos;</code>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {sarvamKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setSarvamKey("");
                          deleteCookie("sarvam_api_key");
                          localStorage.removeItem("nass_sarvam_api_key");
                          setServerKeyStatus({ configured: false, source: "none" });
                        }}
                        className="rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveSarvamKey}
                      className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                    >
                      {keySavedFeedback ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" /> Saved!
                        </>
                      ) : (
                        "Save to Cookie"
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-muted-foreground">
                  <p className="font-semibold text-amber-300/90 mb-0.5">Manual Setup Options:</p>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    <li><strong>In Web App (Cookie):</strong> Paste key above &amp; click &ldquo;Save to Cookie&rdquo;.</li>
                    <li><strong>In Server (.env):</strong> Add <code className="font-mono text-[9px] text-amber-300">SARVAM_API_KEY=&quot;your_key&quot;</code> to your <code className="font-mono text-[9px]">.env</code> or Vercel Environment Variables.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ─── POPUP: MICROPHONE VERIFICATION & TEST ─── */}
          {showMicModal && (
            <div className="border-b border-amber-500/20 bg-[#10131b] p-3 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Microphone Access &amp; Audio Level Verification
                </span>
                <button
                  onClick={() => setShowMicModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Browser Permission:</span>
                  <span
                    className={cn(
                      "font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded border",
                      micPermission === "granted"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : micPermission === "denied"
                        ? "border-red-500/40 bg-red-500/20 text-red-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    )}
                  >
                    {micPermission === "granted"
                      ? "● Granted & Verified"
                      : micPermission === "denied"
                      ? "● Blocked"
                      : "● Needs Verification"}
                  </span>
                </div>

                {/* Live VU Meter Bars */}
                <div className="rounded-md border border-border/60 bg-[#0a0c10] p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Live Input Volume Level:</span>
                    <span className="font-mono text-amber-400">{audioLevel}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden flex">
                    <div
                      className={cn(
                        "h-full transition-all duration-75 rounded-full",
                        audioLevel > 65
                          ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
                          : "bg-gradient-to-r from-emerald-500 to-amber-400"
                      )}
                      style={{ width: `${Math.max(4, audioLevel)}%` }}
                    />
                  </div>
                </div>

                {/* Actions: Test Mic button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={runMicrophoneTest}
                    disabled={isTestingMic}
                    className="inline-flex items-center gap-1.5 rounded bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                  >
                    {isTestingMic ? (
                      <>
                        <Radio className="h-3 w-3 animate-spin text-red-400" />
                        <span>Recording 2.5s test... Speak now</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        <span>Test Microphone &amp; Playback</span>
                      </>
                    )}
                  </button>

                  {micTestRecordedUrl && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Audio playback verified
                    </span>
                  )}
                </div>

                {micPermission === "denied" && (
                  <div className="rounded-md border border-red-500/30 bg-red-950/40 p-2 text-[10px] text-red-200">
                    <p className="font-bold mb-0.5">How to unblock microphone:</p>
                    <p>Click the Lock 🔒 or Site Settings icon in your browser URL bar, set Microphone to <strong>Allow</strong>, and click &ldquo;Test Microphone&rdquo; above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STATUS INDICATOR BANNER (14-STATE MACHINE) ─── */}
          {(isDictating || voiceState !== "IDLE" || isHandsFreeMode) && (
            <div
              className={cn(
                "flex items-center justify-between border-b px-4 py-1.5 text-[11px] font-mono transition-all",
                (isDictating || voiceState === "LISTENING") && "border-red-500/40 bg-red-950/50 text-red-300",
                voiceState === "REQUESTING_PERMISSION" && "border-amber-500/40 bg-amber-950/50 text-amber-300",
                voiceState === "TRANSCRIBING" && "border-amber-500/30 bg-amber-950/40 text-amber-300",
                voiceState === "INTERPRETING" && "border-yellow-500/40 bg-yellow-950/40 text-yellow-300",
                voiceState === "FETCHING_DATA" && "border-amber-500/30 bg-amber-950/40 text-amber-300",
                voiceState === "EXECUTING_TOOL" && "border-amber-500/40 bg-amber-950/40 text-amber-300",
                voiceState === "NAVIGATING" && "border-sky-500/40 bg-sky-950/50 text-sky-300",
                voiceState === "GENERATING_REPORT" && "border-amber-500/40 bg-amber-950/50 text-amber-300",
                voiceState === "SPEAKING" && "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
                voiceState === "INTERRUPTED" && "border-orange-500/40 bg-orange-950/50 text-orange-300",
                voiceState === "PAUSED" && "border-amber-500/40 bg-amber-950/50 text-amber-300",
                voiceState === "RECOVERING" && "border-blue-500/40 bg-blue-950/50 text-blue-300",
                voiceState === "PERMISSION_DENIED" && "border-red-500/30 bg-red-950/50 text-red-300",
                voiceState === "ERROR" && "border-red-500/30 bg-red-950/50 text-red-300",
                voiceState === "IDLE" && isHandsFreeMode && "border-amber-500/25 bg-amber-950/20 text-amber-400"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex h-2 w-2 rounded-full bg-current", voiceState !== "IDLE" && "animate-ping")} />
                <span>
                  {(isDictating || voiceState === "LISTENING") && `🎙️ Listening: Words typing live into prompt (${dictationDuration}s)...`}
                  {voiceState === "REQUESTING_PERMISSION" && "Requesting browser microphone permission..."}
                  {voiceState === "TRANSCRIBING" && "Refining operational terms via Sarvam STT (saaras:v3)..."}
                  {voiceState === "INTERPRETING" && "Reasoning & Tool Selection with Sarvam 105B..."}
                  {voiceState === "FETCHING_DATA" && "Querying verified records from Control Tower databases..."}
                  {voiceState === "EXECUTING_TOOL" && "Executing authorized operational tool..."}
                  {voiceState === "NAVIGATING" && "Redirecting to destination module..."}
                  {voiceState === "GENERATING_REPORT" && "Generating luxury on-demand PDF dossier..."}
                  {voiceState === "SPEAKING" && "Speaking verified response via Sarvam TTS..."}
                  {voiceState === "INTERRUPTED" && "Speech playback interrupted by user."}
                  {voiceState === "PAUSED" && "Voice listening paused. (Say 'resume listening' to continue)"}
                  {voiceState === "RECOVERING" && "Recovering connection..."}
                  {voiceState === "PERMISSION_DENIED" && "Microphone blocked. Check browser settings."}
                  {voiceState === "ERROR" && "Encountered processing notice. Data secured."}
                  {voiceState === "IDLE" && isHandsFreeMode && "⚡ Hands-Free Active: Speak naturally or say 'send it send it' to query"}
                </span>
              </div>

              {isDictating || voiceState === "LISTENING" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={stopVoiceOverDictation}
                    className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                  >
                    Done Speaking ✓
                  </button>
                  <button
                    onClick={cancelVoiceOverDictation}
                    className="rounded bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/30"
                  >
                    Cancel
                  </button>
                </div>
              ) : voiceState === "SPEAKING" ? (
                <button
                  onClick={stopCurrentAudio}
                  className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
                >
                  Stop Audio
                </button>
              ) : voiceState === "PAUSED" ? (
                <button
                  onClick={() => startVoiceOverDictation()}
                  className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30"
                >
                  Resume Listening
                </button>
              ) : null}
            </div>
          )}

          {/* ─── VOICE COMMAND DETECTED BADGE ("send it send it") ─── */}
          {voiceCommandTriggered && (
            <div className="mx-4 my-2 flex items-center gap-2 rounded-xl border border-amber-500/70 bg-gradient-to-r from-amber-500/30 via-yellow-500/25 to-amber-500/30 px-3.5 py-2.5 text-xs font-bold text-amber-200 shadow-xl shadow-amber-500/30 animate-pulse animate-in fade-in slide-in-from-top-2">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 animate-ping" />
              <Zap className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="truncate">{voiceCommandTriggered}</span>
            </div>
          )}

          {/* ─── CONVERSATION TRANSCRIPT AREA ─── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-amber-500/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[90%] rounded-xl p-3 text-xs sm:text-sm transition-all",
                  msg.role === "user"
                    ? "ml-auto bg-amber-500/15 border border-amber-500/30 text-amber-100"
                    : "mr-auto bg-[#141720] border border-border/40 text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-amber-400/90">
                    {msg.role === "user" ? "You (Operator)" : "NASS AI Copilot"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Render prompt text */}
                {renderFormattedText(msg.content || msg.text || "")}

                {/* Render Attached Media inside Chat Message Bubble */}
                {msg.media && (
                  <div className="mt-2.5 pt-2 border-t border-amber-500/20">
                    {msg.media.type === "video" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-medium">
                          <Video className="h-3.5 w-3.5 text-amber-400" />
                          <span>Attached Video: {msg.media.name}</span>
                          <span className="text-muted-foreground">({formatFileSize(msg.media.size)})</span>
                        </div>
                        <video
                          controls
                          src={msg.media.url}
                          className="w-full max-h-56 rounded-lg bg-black border border-amber-500/30 shadow-md"
                        />
                      </div>
                    ) : msg.media.type === "image" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-medium">
                          <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                          <span>Attached Image: {msg.media.name}</span>
                        </div>
                        <img
                          src={msg.media.url}
                          alt={msg.media.name}
                          className="max-h-56 rounded-lg object-cover border border-amber-500/30"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2 text-[11px]">
                        <FileText className="h-4 w-4 text-amber-400" />
                        <span className="font-medium text-foreground">{msg.media.name}</span>
                        <span className="text-muted-foreground">({formatFileSize(msg.media.size)})</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── NAVIGATION REDIRECTION CARD (LUXURY GOLD THEME) ─── */}
                {msg.navigation && (
                  <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#1b170c] via-[#141208] to-[#0c0e14] p-3 text-xs shadow-lg shadow-black/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                          <Compass className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-amber-200 truncate block">
                            {msg.navigation.label || (msg.navigation.executed ? "Destination Reached" : "Navigation Action")}
                          </span>
                          <p className="text-[11px] text-amber-300/80 line-clamp-2">
                            {msg.navigation.description || msg.navigation.reason || `Opening ${msg.navigation.view}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const target = msg.navigation?.targetRef || msg.navigation?.recordRef;
                          if (msg.navigation?.view === "live" && target && /^SHP-/i.test(target)) {
                            openTrace(target);
                          } else if (msg.navigation?.view) {
                            drillTo(msg.navigation.view as any, target);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-gradient-to-r from-amber-500/25 to-yellow-600/25 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/35 hover:scale-[1.02] transition-all shrink-0 cursor-pointer shadow-sm shadow-amber-500/20"
                        title="Open Destination now"
                      >
                        <span>Open Destination ➔</span>
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-2 border-t border-amber-500/20">
                      <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-amber-300">
                        view: {msg.navigation.view}
                      </span>
                      {(msg.navigation.targetRef || msg.navigation.recordRef) && (
                        <span className="rounded bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 text-yellow-300">
                          target: {msg.navigation.targetRef || msg.navigation.recordRef}
                        </span>
                      )}
                      {(msg.navigation.filter || msg.navigation.filterProject) && (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300">
                          filter: {msg.navigation.filter || msg.navigation.filterProject}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── ON-DEMAND PDF REPORT DOWNLOAD CARD ─── */}
                {msg.report && (
                  <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#1b170c] via-[#141208] to-[#0c0e14] p-3 text-xs shadow-lg shadow-black/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-600/20 text-amber-300 border border-amber-500/40 shadow-sm">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-200 text-xs truncate">
                              {msg.report.reportName || "On-Demand Operational Report"}
                            </span>
                            <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-mono font-medium text-amber-400">
                              PDF · Ready
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {msg.report.summary || "Verified authoritative dataset from NASS operational backbone."}
                          </p>
                          <p className="text-[10px] font-mono text-amber-400/80 truncate">
                            {msg.report.fileName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-amber-500/20">
                      <a
                        href={msg.report.downloadUrl}
                        download={msg.report.fileName}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/60 bg-gradient-to-r from-amber-500/25 to-yellow-600/25 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/35 hover:scale-[1.01] transition-all shadow-sm shadow-amber-500/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download PDF</span>
                      </a>
                      <a
                        href={`${msg.report.downloadUrl}&mode=inline`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        title="Open PDF in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Grounding Metadata: Tools & Sources */}
                {msg.role === "assistant" && (msg.toolsUsed?.length || msg.sources?.length) ? (
                  <div className="mt-2.5 pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5 text-[10px]">
                    {msg.toolsUsed?.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 font-mono text-sky-400"
                      >
                        tool:{t}
                      </span>
                    ))}
                    {msg.sources?.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 font-mono text-amber-300/80"
                      >
                        src:{s}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Follow-up suggestions */}
                {msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/30 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <CornerDownRight className="h-2.5 w-2.5 text-amber-400" /> Suggested Follow-ups:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.followUpSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputText(sug);
                            textareaRef.current?.focus();
                          }}
                          className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/40 text-left transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Questions (if conversation is short) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-border/20 bg-black/20">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground/80 mb-1.5">
                Quick Verification Questions:
              </p>
              <div className="flex flex-wrap gap-1">
                {INITIAL_SUGGESTIONS.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(q);
                      textareaRef.current?.focus();
                    }}
                    className="rounded border border-border/40 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-left truncate max-w-full"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── CHATGPT-STYLE PROMPT & ACTION BAR ─── */}
          {/* [ 🎙️ Speak Voice-Over ] ──► [ Live Words Typed into Chat Prompt ] ──► [ 📎 Attach Video/Media ] ──► [ Review & Send ] */}
          <div className="border-t border-amber-500/15 p-3 bg-[#0a0c10]">
            {/* Attached Media Preview Box (Before Send) */}
            {attachedMedia && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {attachedMedia.type === "video" ? (
                    <Video className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : attachedMedia.type === "image" ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <div className="min-w-0 truncate">
                    <p className="truncate font-medium text-amber-200">{attachedMedia.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {attachedMedia.type.toUpperCase()} · {formatFileSize(attachedMedia.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedMedia(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                  title="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Prompt Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitFinalQuery();
              }}
              className="flex flex-col gap-2"
            >
              {/* Textarea for Live Spoken Words + Manual Review */}
              <div
                className={cn(
                  "relative rounded-xl border bg-[#12151d] transition-all",
                  isDictating
                    ? "border-red-500/60 ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "border-border/60 focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/40"
                )}
              >
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitFinalQuery();
                    }
                  }}
                  placeholder={
                    isDictating
                      ? "Listening to voice-over... (Words are being typed live here)"
                      : "Type prompt or click [🎙️ Speak Voice-Over] to dictate live words..."
                  }
                  className="w-full resize-none bg-transparent px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />

                {/* Live Speech Pulse Indicator inside textarea */}
                {isDictating && (
                  <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="font-mono text-[10px] font-semibold text-red-400">
                      LIVE REC
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Control Strip */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* [ 🎙️ Speak Voice-Over ] Button */}
                  <button
                    type="button"
                    onClick={isDictating ? stopVoiceOverDictation : startVoiceOverDictation}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                      isDictating
                        ? "border-red-500 bg-red-600/30 text-red-200 animate-pulse shadow-md shadow-red-500/30"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400"
                    )}
                    title={
                      isDictating
                        ? "Click to finish voice-over dictation"
                        : "Click to speak voice-over (words type live into chat prompt)"
                    }
                  >
                    {isDictating ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current text-red-400" />
                        <span>Done Speaking</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        <span>Speak Voice-Over</span>
                      </>
                    )}
                  </button>

                  {/* [ 📎 Attach Video/Media (Optional) ] Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*,.pdf,.doc,.docx,.csv,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileAttach(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      attachedMedia
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                    title="Attach Video, Photo, or Inspection Document (Optional)"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Attach Media</span>
                  </button>
                </div>

                {/* [ Review & Click Send ] Button */}
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachedMedia) || voiceState === "PROCESSING"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-bold transition-all shadow-md",
                    inputText.trim() || attachedMedia
                      ? "border-amber-500/60 bg-gradient-to-r from-amber-500/25 to-yellow-600/25 text-amber-200 hover:bg-amber-500/35 hover:scale-[1.02] cursor-pointer shadow-amber-500/20"
                      : "border-border/20 bg-muted/10 text-muted-foreground/40 cursor-not-allowed"
                  )}
                  title="Send query with prompt and attachments"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Bottom Footer Info */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/70 px-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400/80" /> Verified read-only Control Tower facts
              </span>
              {audioLatency && (
                <span className="font-mono text-[9px] text-amber-400/80">
                  Latency: {audioLatency}ms
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
