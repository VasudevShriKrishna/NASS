"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore, resolveViewFromInput, VALID_VIEWS, ROUTE_REGISTRY } from "@/lib/app-state";
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

/**
 * Automated UI Action Executor (Guarded)
 * Performs automatic tab switches, navigation, and safe selections in the DOM.
 * 
 * SECURITY AUDIT FIX:
 * - Strictly prevents automated clicks on destructive actions (e.g. "delete", "remove", "drop", "purge")
 * - Removed wildcard querySelectorAll("*") DOM walk which posed performance and injection risks
 */
export function executeAutomatedUiActions(actions: any[], targetView?: string) {
  if (typeof window === "undefined" || !actions || !Array.isArray(actions) || actions.length === 0) return;

  // Block destructive keywords from automated execution
  const DANGEROUS_TARGET_REGEX = /\b(delete|remove|destroy|drop|purge|truncate|wipe|kill|format)\b/i;

  const initialDelay = targetView ? 700 : 150;

  setTimeout(() => {
    actions.forEach((act, idx) => {
      setTimeout(() => {
        const rawTarget = (act.target || "").trim();
        const targetLower = rawTarget.toLowerCase();
        if (!targetLower) return;

        // Security check: reject potentially destructive actions from automated click execution
        if (DANGEROUS_TARGET_REGEX.test(targetLower)) {
          console.warn(`[Security Guard] Blocked automated click on sensitive/destructive target: "${rawTarget}"`);
          return;
        }

        // Collect legitimate interactive elements in active view only
        const searchScope = document.querySelector("main") || document.body;
        const candidates = Array.from(
          searchScope.querySelectorAll<HTMLElement>(
            'button, [role="button"], [role="tab"], a, [data-record-ref], tr[data-record-ref]'
          )
        );

        let match: HTMLElement | null = null;

        // 1. Exact match on visible text, aria-label, or title
        for (const el of candidates) {
          const text = (el.textContent || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "").toLowerCase();
          const title = (el.getAttribute("title") || "").toLowerCase();
          if (text === targetLower || aria === targetLower || title === targetLower) {
            match = el;
            break;
          }
        }

        // 2. Partial contains match on tabs/navigation
        if (!match) {
          for (const el of candidates) {
            const text = (el.textContent || "").trim().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            if (text.includes(targetLower) || aria.includes(targetLower)) {
              match = el;
              break;
            }
          }
        }

        if (match) {
          // Smooth scroll to element
          match.scrollIntoView({ behavior: "smooth", block: "nearest" });

          // Visual gold glow pulse highlight so the user sees the automated click happen
          const prevOutline = match.style.outline;
          const prevBoxShadow = match.style.boxShadow;
          const prevTransition = match.style.transition;
          match.style.transition = "all 0.25s ease";
          match.style.outline = "2px solid #eab308";
          match.style.boxShadow = "0 0 18px rgba(234, 179, 8, 0.75)";

          setTimeout(() => {
            try {
              match!.click();
              match!.focus();
            } catch (err) {
              console.warn("[HandsFree] Click execution error:", err);
            }
          }, 200);

          setTimeout(() => {
            if (match) {
              match.style.outline = prevOutline;
              match.style.boxShadow = prevBoxShadow;
              match.style.transition = prevTransition;
            }
          }, 900);

          console.log(`[HandsFree] Automated click executed on target "${rawTarget}"`);
        } else {
          console.warn(`[HandsFree] Target element "${rawTarget}" not found in current DOM.`);
        }
      }, idx * 500);
    });
  }, initialDelay);
}

const INITIAL_SUGGESTIONS = [
  "Open shipment tracking and click on SHP-8802",
  "Open live traceability and click on CMA CGM PUCCINI",
  "Open exceptions and in it click on Critical",
  "Open CEO control tower and click on export PDF",
  "Open projects and click on Bahrain Marina",
  "Open procurement and click on PO-3001",
  "Why does PO-3001 show 0 linked shipments while 120t is in transit?",
  "Check connector health vs data freshness for Customs Broker",
];

// Rainbow color spectrum (strictly Red, Orange, Yellow, Green, Blue - EXCLUDES Indigo & Violet)
export const RAINBOW_COLORS = [
  {
    name: "Red",
    hex: "#ef4444",
    rgb: "239, 68, 68",
    glow: "rgba(239, 68, 68, 0.75)",
    border: "rgba(239, 68, 68, 0.75)",
    bg: "rgba(239, 68, 68, 0.22)",
    highlight: "#fca5a5",
    primary: "#ef4444",
    secondary: "#b91c1c",
    dark: "#7f1d1d",
    bodyGrad: "radial-gradient(circle at 45% 28%, #fca5a5 0%, #ef4444 32%, #b91c1c 68%, #450a0a 100%)",
    bodyOpen: "radial-gradient(circle at 50% 35%, #b91c1c 0%, #7f1d1d 60%, #450a0a 100%)",
    irisGrad: "linear-gradient(135deg, #fca5a5 0%, #ef4444 55%, #991b1b 100%)",
    gemHex: "#ef4444",
    gemLight: "#fca5a5",
  },
  {
    name: "Orange",
    hex: "#f97316",
    rgb: "249, 115, 22",
    glow: "rgba(249, 115, 22, 0.75)",
    border: "rgba(249, 115, 22, 0.75)",
    bg: "rgba(249, 115, 22, 0.22)",
    highlight: "#fdba74",
    primary: "#f97316",
    secondary: "#c2410c",
    dark: "#7c2d12",
    bodyGrad: "radial-gradient(circle at 45% 28%, #fdba74 0%, #f97316 32%, #c2410c 68%, #431407 100%)",
    bodyOpen: "radial-gradient(circle at 50% 35%, #c2410c 0%, #7c2d12 60%, #431407 100%)",
    irisGrad: "linear-gradient(135deg, #fdba74 0%, #f97316 55%, #9a3412 100%)",
    gemHex: "#f97316",
    gemLight: "#fdba74",
  },
  {
    name: "Yellow",
    hex: "#eab308",
    rgb: "234, 179, 8",
    glow: "rgba(234, 179, 8, 0.75)",
    border: "rgba(234, 179, 8, 0.75)",
    bg: "rgba(234, 179, 8, 0.22)",
    highlight: "#fef08a",
    primary: "#eab308",
    secondary: "#b45309",
    dark: "#78350f",
    bodyGrad: "radial-gradient(circle at 45% 28%, #fef08a 0%, #eab308 32%, #b45309 68%, #422006 100%)",
    bodyOpen: "radial-gradient(circle at 50% 35%, #b45309 0%, #78350f 60%, #422006 100%)",
    irisGrad: "linear-gradient(135deg, #fef08a 0%, #eab308 55%, #854d0e 100%)",
    gemHex: "#eab308",
    gemLight: "#fef08a",
  },
  {
    name: "Green",
    hex: "#22c55e",
    rgb: "34, 197, 94",
    glow: "rgba(34, 197, 94, 0.75)",
    border: "rgba(34, 197, 94, 0.75)",
    bg: "rgba(34, 197, 94, 0.22)",
    highlight: "#86efac",
    primary: "#22c55e",
    secondary: "#15803d",
    dark: "#064e3b",
    bodyGrad: "radial-gradient(circle at 45% 28%, #86efac 0%, #22c55e 32%, #15803d 68%, #022c22 100%)",
    bodyOpen: "radial-gradient(circle at 50% 35%, #15803d 0%, #064e3b 60%, #022c22 100%)",
    irisGrad: "linear-gradient(135deg, #86efac 0%, #22c55e 55%, #15803d 100%)",
    gemHex: "#22c55e",
    gemLight: "#86efac",
  },
  {
    name: "Blue",
    hex: "#3b82f6",
    rgb: "59, 130, 246",
    glow: "rgba(59, 130, 246, 0.75)",
    border: "rgba(59, 130, 246, 0.75)",
    bg: "rgba(59, 130, 246, 0.22)",
    highlight: "#93c5fd",
    primary: "#3b82f6",
    secondary: "#1d4ed8",
    dark: "#1e3a8a",
    bodyGrad: "radial-gradient(circle at 45% 28%, #93c5fd 0%, #3b82f6 32%, #1d4ed8 68%, #0f172a 100%)",
    bodyOpen: "radial-gradient(circle at 50% 35%, #1d4ed8 0%, #1e3a8a 60%, #0f172a 100%)",
    irisGrad: "linear-gradient(135deg, #93c5fd 0%, #3b82f6 55%, #1e40af 100%)",
    gemHex: "#3b82f6",
    gemLight: "#93c5fd",
  },
] as const;


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

  // =============================================================================
  // COMMENTED OUT: Rainbow color cycling, cartoon emotional states & crying/sad eyes
  // Reason: Unprofessional UI feature-bloat that caused constant background CPU usage,
  // timer churn, and full-screen color flashes on every mouse click.
  // =============================================================================
  /*
  const [rainbowIndex, setRainbowIndex] = useState(3);
  const [isGlowFlashing, setIsGlowFlashing] = useState(false);
  const [cursorDistance, setCursorDistance] = useState<number>(9999);
  const [isAgentHovered, setIsAgentHovered] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isMouseOnScreen, setIsMouseOnScreen] = useState(false);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const eyeContainerRef = useRef<HTMLDivElement | null>(null);
  */

  // ─── DRAGGABLE FLOATING AI BUTTON STATE (PERSISTED IN LOCALSTORAGE) ───
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    moved: boolean;
    isPointerDown: boolean;
    startTime: number;
    pointerId?: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false,
    isPointerDown: false,
    startTime: 0,
  });
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize position from Cookie or localStorage, or default to bottom-right (as shown in reference screenshot)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cookieVal = getCookie("nass_ai_btn_pos");
      const localVal = localStorage.getItem("nass_ai_btn_pos");
      const saved = cookieVal || localVal;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const maxX = Math.max(10, window.innerWidth - 88);
          const maxY = Math.max(10, window.innerHeight - 88);
          setBtnPos({
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
          });
          return;
        }
      }
    } catch {}
    // Default position: Exact Bottom-Right (as shown in the user's reference image)
    const defaultX = Math.max(10, window.innerWidth - 88);
    const defaultY = Math.max(10, window.innerHeight - 92);
    setBtnPos({ x: defaultX, y: defaultY });
  }, []);

  // Update on window resize to ensure button stays on screen
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        if (!prev) return prev;
        const maxX = Math.max(10, window.innerWidth - 88);
        const maxY = Math.max(10, window.innerHeight - 88);
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =============================================================================
  // COMMENTED OUT: Global mousemove and global click listeners
  // Reason: Performance disaster and UX defect — caused continuous re-renders on
  // mouse movements and triggered random glow flashes across the entire screen.
  // =============================================================================

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const currentX = btnPos ? btnPos.x : Math.max(10, window.innerWidth - 80);
    const currentY = btnPos ? btnPos.y : 12;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      moved: false,
      isPointerDown: true,
      startTime: Date.now(),
      pointerId: e.pointerId,
    };
    // Do NOT capture pointer or mark dragging here so clicks and double-clicks are clean!
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current.isPointerDown) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // Only initiate drag if moved more than 10 pixels
    if (!isDragging && dist > 10) {
      dragStartRef.current.moved = true;
      setIsDragging(true);
      try {
        if (dragStartRef.current.pointerId !== undefined) {
          (e.currentTarget as HTMLElement).setPointerCapture(dragStartRef.current.pointerId);
        }
      } catch {}
    }

    if (!isDragging && !dragStartRef.current.moved) return;

    const rect = buttonContainerRef.current?.getBoundingClientRect();
    const btnW = rect?.width || 64;
    const btnH = rect?.height || 64;
    const maxX = Math.max(8, window.innerWidth - btnW - 8);
    const maxY = Math.max(8, window.innerHeight - btnH - 8);

    const newX = Math.min(Math.max(8, dragStartRef.current.initX + dx), maxX);
    const newY = Math.min(Math.max(8, dragStartRef.current.initY + dy), maxY);

    setBtnPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragStartRef.current.isPointerDown = false;
    if (isDragging) {
      setIsDragging(false);
      try {
        if (dragStartRef.current.pointerId !== undefined) {
          (e.currentTarget as HTMLElement).releasePointerCapture(dragStartRef.current.pointerId);
        }
      } catch {}

      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const rect = buttonContainerRef.current?.getBoundingClientRect();
      const btnW = rect?.width || 64;
      const btnH = rect?.height || 64;
      const maxX = Math.max(8, window.innerWidth - btnW - 8);
      const maxY = Math.max(8, window.innerHeight - btnH - 8);
      const finalX = Math.min(Math.max(8, dragStartRef.current.initX + dx), maxX);
      const finalY = Math.min(Math.max(8, dragStartRef.current.initY + dy), maxY);

      const posToSave = { x: finalX, y: finalY };
      setBtnPos(posToSave);
      try {
        const json = JSON.stringify(posToSave);
        localStorage.setItem("nass_ai_btn_pos", json);
        setCookie("nass_ai_btn_pos", json, 365);
      } catch {}
    }
  };

  // Safe toggle function for single-click, double-click, and close actions
  const toggleCopilot = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (dragStartRef.current.moved) return;
    setIsOpen(!isOpen);
    if (voiceState === "SPEAKING") stopCurrentAudio();
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
  const isDictatingRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSpeechRef = useRef<string>("");

  useEffect(() => {
    isDictatingRef.current = isDictating;
  }, [isDictating]);

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

    // Check backend status safely without raw res.json() crashes
    fetch("/api/voice/stt", { credentials: "include" })
      .then(async (res) => {
        const txt = await res.text().catch(() => "");
        return txt ? JSON.parse(txt) : {};
      })
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
  const lastFailedRequestRef = useRef<{ userQuery: string; mediaSnapshot: any } | null>(null);

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

          // Safe execution on Android Chrome: brief timeout after cancel and explicit audio resume
          setTimeout(() => {
            try {
              if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
              }
              window.speechSynthesis.speak(utterance);
            } catch {
              setVoiceState("IDLE");
            }
          }, 50);
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
      autoSentRef.current = false;
      promptBeforeSpeechRef.current = inputText;
      accumulatedSpeechRef.current = "";

      const isMobile =
        typeof navigator !== "undefined" &&
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

      const SpeechRecognition =
        typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!SpeechRecognition) {
          alert("Microphone capture is not supported in this browser environment. You can type queries below.");
          setMicPermission("unsupported");
          return;
        }
      }

      if (micPermission !== "granted") {
        setVoiceState("REQUESTING_PERMISSION");
      }

      // Android Chrome Hardware Mic Conflict Fix:
      // On Android OS, keeping an active getUserMedia audio stream creates a hardware conflict
      // with Google Speech Recognizer, immediately failing with 'audio-capture' error.
      // On mobile, if SpeechRecognition is available, we do a quick probe if needed and close
      // the getUserMedia tracks so SpeechRecognition has 100% exclusive access to the microphone.
      // On desktop, we keep getUserMedia active for simultaneous VU meter & MediaRecorder capture.
      let stream: MediaStream | null = null;
      if (!isMobile || !SpeechRecognition) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamRef.current = stream;
        setMicPermission("granted");
        startAudioMeter(stream);
      } else {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
          probe.getTracks().forEach((t) => t.stop());
          setMicPermission("granted");
        } catch {
          // Allow SpeechRecognition to trigger native Android mic prompt
        }
      }

      // Initialize browser Web Speech API for real-time live typing
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          speechRecognitionRef.current = recognition;

          // Android Chrome does not support continuous: true natively (aborts or crashes).
          // Continuous false with auto-restart in onend provides rock-solid continuous dictation on Android!
          recognition.continuous = !isMobile;
          recognition.interimResults = true;
          recognition.lang =
            typeof navigator !== "undefined" && navigator.language
              ? navigator.language
              : "en-IN";

          if (isMobile) {
            recognition.onaudiostart = () => setAudioLevel(45);
            recognition.onsoundstart = () => setAudioLevel(65);
            recognition.onspeechstart = () => setAudioLevel(85);
            recognition.onspeechend = () => setAudioLevel(20);
            recognition.onaudioend = () => setAudioLevel(0);
          }

          recognition.onresult = (event: any) => {
            if (autoSentRef.current) return;

            let interimTranscript = "";
            let sessionFinal = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                sessionFinal += res[0].transcript;
              } else {
                interimTranscript += res[0].transcript;
              }
            }

            if (sessionFinal) {
              accumulatedSpeechRef.current = (
                (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + " " : "") + sessionFinal.trim()
              ).trim();
            }

            const currentSpoken = (
              (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + " " : "") + interimTranscript.trim()
            ).trim();

            if (!currentSpoken) return;

            // ─── LOCAL VOICE COMMAND INTERCEPTION ───
            // 1. "Stop speaking"
            if (/\b(stop speaking|shut up|be quiet|stop talking|stop audio)\b/i.test(currentSpoken)) {
              stopCurrentAudio();
              setVoiceState("INTERRUPTED");
              setVoiceCommandTriggered('⚡ Voice Command Detected: "Stop Speaking" — Audio halted');
              setInputText("");
              promptBeforeSpeechRef.current = "";
              accumulatedSpeechRef.current = "";
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
              accumulatedSpeechRef.current = "";
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
              accumulatedSpeechRef.current = "";
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
              accumulatedSpeechRef.current = "";
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
              accumulatedSpeechRef.current = "";
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
              autoSentRef.current = true;
              isDictatingRef.current = false;

              try {
                recognition.onresult = null;
                recognition.onerror = null;
                recognition.onend = null;
                recognition.abort();
              } catch {}
              speechRecognitionRef.current = null;

              const cleanPrompt = stripSendItTrigger(combined);
              setInputText("");
              promptBeforeSpeechRef.current = "";
              accumulatedSpeechRef.current = "";

              setVoiceCommandTriggered('⚡ Voice Command Detected: "send it send it" — Sending directly without stop permission!');
              setTimeout(() => {
                setVoiceCommandTriggered(null);
              }, 5500);

              stopVoiceOverDictation();

              if (cleanPrompt) {
                submitFinalQuery(cleanPrompt);
              }
              return;
            }

            setInputText(combined);
          };

          // OnEnd auto-restart loop for Android speech pauses:
          // Android Chrome terminates on single phrase pauses; restart automatically while dictating
          recognition.onend = () => {
            if (isDictatingRef.current && !autoSentRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("[SpeechRecognition Error]", e);
            if (e.error === "no-speech") return;
            if (e.error === "not-allowed") {
              setMicPermission("denied");
              setVoiceState("PERMISSION_DENIED");
            }
          };

          recognition.start();
        } catch (e) {
          console.warn("[SpeechRecognition Start Failed]", e);
        }
      }

      // MediaRecorder fallback / precision STT for desktop or stream
      if (stream) {
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

        try {
          const mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            if (activeStreamRef.current) {
              activeStreamRef.current.getTracks().forEach((track) => track.stop());
              activeStreamRef.current = null;
            }
            stopAudioMeter();

            if (autoSentRef.current) return;

            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
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
                  const raw = await sttRes.text().catch(() => "");
                  const sttData = raw ? JSON.parse(raw) : {};
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

          mediaRecorder.start(250);
        } catch (mrErr) {
          console.warn("[MediaRecorder Init Notice]", mrErr);
        }
      }

      isDictatingRef.current = true;
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
      isDictatingRef.current = false;
      setIsDictating(false);
      setMicPermission("denied");
      setVoiceState("PERMISSION_DENIED");
      setShowMicModal(true);
      setTimeout(() => setVoiceState("IDLE"), 4000);
    }
  };

  const stopVoiceOverDictation = () => {
    isDictatingRef.current = false;
    setIsDictating(false);
    setVoiceState("IDLE");

    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }

    if (activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      activeStreamRef.current = null;
    }

    stopAudioMeter();
  };

  const cancelVoiceOverDictation = () => {
    stopVoiceOverDictation();
    accumulatedSpeechRef.current = "";
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

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === "string" ? reader.result.split(",")[1] : undefined;
      setAttachedMedia({
        id: `media-${Date.now()}`,
        name: file.name,
        size: file.size,
        type,
        url,
        mimeType: file.type || (isVideo ? "video/mp4" : "application/octet-stream"),
        base64,
      });
    };
    reader.readAsDataURL(file);

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

    // Check for intelligent action retry
    if (textToSend && textToSend.trim().toLowerCase() === "retry") {
      if (lastFailedRequestRef.current) {
        const failed = lastFailedRequestRef.current;
        lastFailedRequestRef.current = null;
        submitFinalQuery(failed.userQuery);
        return;
      } else {
        const noRetryMsg: CopilotMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: "No failed or incomplete operations to retry. All prior commands executed successfully.",
          timestamp: fmtBahrainTime(new Date()),
        };
        setMessages((prev) => [...prev, noRetryMsg]);
        return;
      }
    }

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
          fileBase64: mediaSnapshot?.base64,
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

      // Safe single-read body extraction
      let rawText = "";
      try {
        rawText = await res.text();
      } catch (readErr: any) {
        throw new Error(`Failed to read response stream: ${readErr?.message || String(readErr)}`);
      }

      let responseData: any = {};
      try {
        responseData = rawText && rawText.trim() ? JSON.parse(rawText) : {};
      } catch (parseErr: any) {
        throw new Error(`Server returned invalid response (HTTP ${res.status}): ${rawText.slice(0, 80)}`);
      }

      if (!res.ok) {
        throw new Error(responseData?.error || `HTTP ${res.status}`);
      }

      // Clear last failed request on successful API roundtrip
      lastFailedRequestRef.current = null;

      // Handle sidebar manipulation actions
      if (responseData.sidebarAction) {
        const sa = responseData.sidebarAction;
        if (sa.type === "open") {
          useAppStore.getState().setSidebarOpen(true);
        } else if (sa.type === "close") {
          useAppStore.getState().setSidebarOpen(false);
        } else if (sa.type === "toggle") {
          useAppStore.getState().toggleSidebar();
        } else if (sa.type === "scroll") {
          useAppStore.getState().scrollSidebar(sa.direction || "down");
        }
      }

      // Handle navigation redirection smoothly
      if (responseData.navigation) {
        setVoiceState("NAVIGATING");
        const nav = responseData.navigation;
        if (nav.view === "__back__") {
          useAppStore.getState().goBack();
        } else {
          const resolved = resolveViewFromInput(nav.view);
          const targetView = resolved ? resolved.view : (VALID_VIEWS.includes(nav.view as any) ? nav.view : null);
          const target = nav.targetRef || nav.recordRef;

          const doNavigation = () => {
            if (targetView === "live" && target && /^SHP-/i.test(target)) {
              openTrace(target);
            } else if (targetView) {
              drillTo(targetView as any, target);
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

      // Hands-Free Automated UI Action Execution (clicks, tabs, filters)
      if (responseData.uiActions && responseData.uiActions.length > 0) {
        executeAutomatedUiActions(responseData.uiActions, responseData.navigation?.view);
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
      lastFailedRequestRef.current = { userQuery, mediaSnapshot };
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

  // Render text with clean Markdown support, clickable badges, headings, and links
  const renderFormattedText = (content: string) => {
    // Strip raw template headers if returned by model
    const cleanContent = content
      .replace(/^### Answer\s*\n?/i, "")
      .replace(/\n### Key Details\s*\n?/gi, "\n\n")
      .replace(/\n### Evidence\s*\n?/gi, "\n\n**Evidence:**\n")
      .replace(/\n### Verification Notes\s*\n?/gi, "\n\n**Verification Notes:**\n");

    const lines = cleanContent.split("\n");
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      // Headings
      let isH3 = false;
      let isH4 = false;
      let processedLine = line;

      if (trimmed.startsWith("### ")) {
        isH4 = true;
        processedLine = trimmed.replace(/^###\s+/, "");
      } else if (trimmed.startsWith("## ")) {
        isH3 = true;
        processedLine = trimmed.replace(/^##\s+/, "");
      }

      // Markdown links: [Title](URL)
      const renderLineContent = (text: string) => {
        // First match markdown links [Title](URL)
        const linkParts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

        return linkParts.map((lpart, lidx) => {
          const linkMatch = lpart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            const [, linkTitle, linkUrl] = linkMatch;
            return (
              <a
                key={lidx}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 mx-0.5 font-medium"
              >
                <span>{linkTitle}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-80" />
              </a>
            );
          }

          // Then match entity badges
          const entityParts = lpart.split(/(\b(?:SHP|PO|GRN|AST|PRJ|EXC)-[A-Za-z0-9_-]+\b)/g);
          return entityParts.map((part, partIdx) => {
            if (/^(?:SHP|PO|GRN|AST|PRJ|EXC)-[A-Za-z0-9_-]+$/i.test(part)) {
              return (
                <button
                  key={`${lidx}-${partIdx}`}
                  onClick={() => handleEntityClick(part)}
                  title={`Click to inspect ${part} in Control Tower`}
                  className="mx-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all hover:scale-[1.03]"
                >
                  <span>{part}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </button>
              );
            }

            // Bold text **text**
            if (part.includes("**")) {
              const boldParts = part.split(/(\*\*.*?\*\*)/g);
              return (
                <span key={`${lidx}-${partIdx}`}>
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

            return <span key={`${lidx}-${partIdx}`}>{part}</span>;
          });
        });
      };

      if (isH3) {
        return (
          <h3 key={lineIdx} className="font-bold text-amber-400 text-sm sm:text-base mt-2.5 mb-1 tracking-wide">
            {renderLineContent(processedLine)}
          </h3>
        );
      }

      if (isH4) {
        return (
          <h4 key={lineIdx} className="font-semibold text-amber-300 text-xs sm:text-sm mt-2 mb-0.5 tracking-wide">
            {renderLineContent(processedLine)}
          </h4>
        );
      }

      const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      if (isBullet) {
        const bulletText = trimmed.replace(/^[•\-*]\s+/, "");
        return (
          <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5 text-xs sm:text-sm leading-relaxed">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
            <div className="flex-1">{renderLineContent(bulletText)}</div>
          </div>
        );
      }

      return (
        <p key={lineIdx} className={cn(lineIdx > 0 && "mt-1", "leading-relaxed text-xs sm:text-sm")}>
          {renderLineContent(line)}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── SINGLE DRAGGABLE FLOATING AI BUTTON (CUTE KING AGENT · DEFAULT BOTTOM-RIGHT DOCKED) ─── */}
      <div
        ref={buttonContainerRef}
        style={
          btnPos
            ? { left: `${btnPos.x}px`, top: `${btnPos.y}px` }
            : { right: "1.5rem", bottom: "1.75rem" }
        }
        className={cn(
          "fixed z-[75] flex items-center justify-center select-none touch-none",
          isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={toggleCopilot}
      >
        {/* Floating Mini Status Indicator (When dictating or speaking) */}
        {!isOpen && (isDictating || voiceState === "SPEAKING") && (
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/95 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 shadow-xl backdrop-blur-md animate-pulse pointer-events-none"
          >
            <Radio className="h-2.5 w-2.5 animate-spin" />
            <span>{isDictating ? "Dictating..." : "Speaking..."}</span>
          </div>
        )}

        {/*
          =============================================================================
          REPLACED: "Cute King" crown SVG, sad crying eyes, and rainbow color cycling.
          Reason: Unprofessional for an enterprise logistics control tower.
          Replaced with a sleek, clean, modern AI Copilot floating launcher.
          =============================================================================
        */}
        {/* Dedicated Close Button Badge on Circle (When Open) */}
        {isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              if (voiceState === "SPEAKING") stopCurrentAudio();
            }}
            className="absolute -top-1.5 -right-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white border-2 border-[#090b10] shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer"
            title="Close Copilot"
          >
            <X className="h-3.5 w-3.5 stroke-[3]" />
          </button>
        )}

        {/* ─── PROFESSIONAL ENTERPRISE AI COPILOT LAUNCHER BUTTON ─── */}
        <button
          type="button"
          onClick={toggleCopilot}
          onDoubleClick={toggleCopilot}
          className={cn(
            "relative w-14 h-14 sm:w-16 sm:h-16 rounded-full aspect-square flex flex-col items-center justify-center",
            "border-2 border-amber-500/60 bg-gradient-to-br from-[#1b170c] via-[#141208] to-[#0c0e14]",
            "shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-all duration-300 group cursor-pointer overflow-hidden",
            isOpen ? "ring-2 ring-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.55)] scale-105" : "hover:scale-105 hover:border-amber-400"
          )}
          title="NASS Voice AI Copilot (Click to open/close)"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-sm pointer-events-none" />

          {/* Audio / Dictation Active Pulse Ring */}
          {isDictating && (
            <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75 pointer-events-none" />
          )}
          {voiceState === "SPEAKING" && (
            <div className="absolute inset-0.5 rounded-full border border-dashed border-amber-400 animate-spin pointer-events-none opacity-80" />
          )}

          {/* Clean AI Copilot Icon */}
          <div className="relative flex items-center justify-center text-amber-400 group-hover:text-amber-300 transition-colors">
            {isDictating ? (
              <Mic className="h-6 w-6 text-red-400 animate-pulse" />
            ) : voiceState === "SPEAKING" ? (
              <Radio className="h-6 w-6 text-amber-300 animate-pulse" />
            ) : (
              <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
            )}
          </div>
        </button>
      </div>

      {/* ─── EXPANDABLE VOICE COPILOT DRAWER (ADAPTIVE BOTTOM-RIGHT / TOP-RIGHT ANCHORED) ─── */}
      {isOpen && (
        <div
          className={cn(
            "fixed right-4 sm:right-6 z-[70] flex flex-col w-[94vw] sm:w-[500px] h-[660px] max-h-[calc(100vh-6.5rem)]",
            "rounded-2xl border border-amber-500/30 bg-[#0c0e14]/98 shadow-2xl shadow-black/90 backdrop-blur-xl",
            "transition-all duration-300 animate-in fade-in",
            btnPos && btnPos.y < 350
              ? "top-20 slide-in-from-top-4"
              : "bottom-24 slide-in-from-bottom-4"
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
                  <h3 className="text-xs font-bold tracking-wide text-zinc-100">
                    NASS Closed-Loop Copilot
                  </h3>
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" /> Read-Only
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Context: <span className="font-mono text-amber-300/80">{view}</span>
                  {drill?.ref ? ` · Ref: ${drill.ref}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/*
                =============================================================================
                REMOVED UNNECESSARY UI CLUTTER / VULNERABILITIES:
                1. [Hands-Free: ON/OFF] — Cluttered the header. Advanced voice features should
                   not occupy primary toolbar real estate in a production enterprise dashboard.
                2. [+ Set Key / Sarvam: Ready] — SECURITY VULNERABILITY: Prompting operators to
                   paste API keys into client-side UI and storing them in unencrypted cookies/
                   localStorage is an anti-pattern. API keys must reside safely on the server
                   in process.env.SARVAM_API_KEY.
                3. [Mic: Blocked / OK] — Permanent status badge caused visual noise. Browser mic
                   permissions are handled naturally when clicking "Speak Voice-Over".
                =============================================================================
              */}

              {/* Audio Mute/Unmute toggle (ESSENTIAL) */}
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

              {/* Close Drawer Button (ESSENTIAL) */}
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

          {/*
            =============================================================================
            COMMENTED OUT: INLINE API KEY CONFIGURATION MODAL
            Reason: Security risk — API keys belong in server environment variables (.env),
            not entered by dashboard users into client cookies or local storage.
            =============================================================================
          */}
          {/*
          {showKeyModal && (
            <div className="border-b border-amber-500/20 bg-[#10131b] p-3 text-xs ...">
               ...
            </div>
          )}
          */}

          {/*
            =============================================================================
            COMMENTED OUT: PERMANENT MICROPHONE VERIFICATION MODAL
            Reason: Redundant popups that distract users. Standard getUserMedia prompt
            is triggered cleanly when the user clicks "Speak Voice-Over".
            =============================================================================
          */}
          {/*
          {showMicModal && (
            <div className="border-b border-amber-500/20 bg-[#10131b] p-3 text-xs ...">
               ...
            </div>
          )}
          */}

          {/* ─── STATUS INDICATOR BANNER (ACTIVE STATE ONLY) ─── */}
          {(isDictating || voiceState !== "IDLE") && (
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
                    <p className="text-[10px] text-zinc-400">
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
