import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Play, Pause, RotateCcw, Download, Volume2, VolumeX, Sparkles, 
  Video, Eye, CheckCircle2, ArrowLeft, Sliders, Smartphone, Clock, Calendar, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

// 35-Second Storyboard Scenes matching user's exact specification
const SCENES = [
  {
    id: 1,
    start: 0,
    end: 5,
    title: "Cuvasol Intro & Logo",
    voiceover: "Welcome to Cuvasol! Already registered? Let's see how to book your FREE Demo Class.",
    subtitle: "Welcome to Cuvasol! Let's book your FREE Demo Class.",
    highlightKeyword: "FREE Demo Class"
  },
  {
    id: 2,
    start: 5,
    end: 10,
    title: "Student Login & Dashboard",
    voiceover: "First, log in to your Cuvasol student account.",
    subtitle: "First, log in to your Cuvasol student account.",
    highlightKeyword: "log in"
  },
  {
    id: 3,
    start: 10,
    end: 16,
    title: "Subject Selection",
    voiceover: "Choose your preferred subject based on your learning needs.",
    subtitle: "Choose your preferred subject based on your learning needs.",
    highlightKeyword: "preferred subject"
  },
  {
    id: 4,
    start: 16,
    end: 22,
    title: "Tutor Profiles Exploration",
    voiceover: "Explore experienced tutors and select the right tutor for you.",
    subtitle: "Explore experienced tutors & select the right tutor for you.",
    highlightKeyword: "experienced tutors"
  },
  {
    id: 5,
    start: 22,
    end: 29,
    title: "Demo Booking Calendar",
    voiceover: "Select your preferred date and time, and confirm your FREE Demo Class.",
    subtitle: "Select preferred date & time, then confirm your FREE Demo!",
    highlightKeyword: "confirm your FREE Demo"
  },
  {
    id: 6,
    start: 29,
    end: 35,
    title: "Grand Call to Action",
    voiceover: "That's it! Start your learning journey with Cuvasol. Book your FREE Demo today!",
    subtitle: "Start learning with Cuvasol. Book your FREE Demo today!",
    highlightKeyword: "FREE Demo today!"
  }
];

const TOTAL_DURATION = 35; // 35 seconds

export default function PromoVideoGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [resolution, setResolution] = useState<"1080" | "720">("1080");

  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const screenImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicOscillatorsRef = useRef<any[]>([]);
  const isSpeakingRef = useRef<number>(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const width = resolution === "1080" ? 1080 : 720;
  const height = resolution === "1080" ? 1920 : 1280;

  // Preload logo and ACTUAL website screen captures
  useEffect(() => {
    const logo = new Image();
    logo.src = "/logo.png";
    logo.onload = () => { logoImageRef.current = logo; };

    const screenFiles: Record<string, string> = {
      scene1_home: "/website-screens/scene1_home.png",
      scene1_scroll: "/website-screens/scene1_hero_scroll.png",
      scene2_dashboard: "/website-screens/scene2_dashboard.png",
      scene3_subjects: "/website-screens/scene3_subjects.png",
      scene4_tutors: "/website-screens/scene4_tutors.png",
      scene5_booking: "/website-screens/scene5_booking.png",
      scene6_cta: "/website-screens/scene6_cta.png"
    };

    Object.entries(screenFiles).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        screenImagesRef.current[key] = img;
        drawFrame(currentTime);
      };
    });
  }, []);

  // Web Audio Upbeat BGM Generator (low volume, rhythmic chord progression)
  const startBackgroundMusic = useCallback(() => {
    if (isMuted || musicVolume <= 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop previous sounds
      musicOscillatorsRef.current.forEach(node => {
        try { node.stop(); } catch(e) {}
      });
      musicOscillatorsRef.current = [];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(musicVolume * 0.15, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Upbeat Arpeggio Notes (C major / A minor upbeat pop chords)
      const chords = [
        [261.63, 329.63, 392.00, 523.25], // C
        [220.00, 261.63, 329.63, 440.00], // Am
        [174.61, 220.00, 261.63, 349.23], // F
        [196.00, 246.94, 293.66, 392.00]  // G
      ];

      const tempo = 120; // BPM
      const noteInterval = 60 / tempo / 2; // eighth notes
      const startTime = ctx.currentTime;

      for (let bar = 0; bar < 20; bar++) {
        const chord = chords[bar % chords.length];
        for (let i = 0; i < 8; i++) {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = i % 2 === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(chord[i % chord.length], startTime + bar * 4 * (60 / tempo) + i * noteInterval);

          noteGain.gain.setValueAtTime(0.001, startTime + bar * 4 * (60 / tempo) + i * noteInterval);
          noteGain.gain.exponentialRampToValueAtTime(0.4, startTime + bar * 4 * (60 / tempo) + i * noteInterval + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + bar * 4 * (60 / tempo) + (i + 0.8) * noteInterval);

          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(startTime + bar * 4 * (60 / tempo) + i * noteInterval);
          osc.stop(startTime + bar * 4 * (60 / tempo) + (i + 1) * noteInterval);
          musicOscillatorsRef.current.push(osc);
        }
      }
    } catch (e) {
      console.warn("Web Audio BGM error:", e);
    }
  }, [isMuted, musicVolume]);

  const stopBackgroundMusic = useCallback(() => {
    musicOscillatorsRef.current.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    musicOscillatorsRef.current = [];
  }, []);

  // Voiceover Trigger
  const triggerVoiceover = useCallback((sceneIndex: number) => {
    if (!voiceoverEnabled || !("speechSynthesis" in window)) return;
    if (isSpeakingRef.current === sceneIndex) return;

    window.speechSynthesis.cancel();
    const scene = SCENES[sceneIndex];
    if (!scene) return;

    const utterance = new SpeechSynthesisUtterance(scene.voiceover);
    utterance.lang = "en-US";
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Zira")));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    isSpeakingRef.current = sceneIndex;
    window.speechSynthesis.speak(utterance);
  }, [voiceoverEnabled]);

  // Main Canvas Render Loop (Draws the 9:16 Video Frame)
  const drawFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = width;
    const H = height;
    ctx.save();

    // Find current scene
    const activeSceneIndex = SCENES.findIndex(s => time >= s.start && time < s.end);
    const scene = activeSceneIndex !== -1 ? SCENES[activeSceneIndex] : SCENES[SCENES.length - 1];
    const sceneProgress = (time - scene.start) / (scene.end - scene.start);

    // Dynamic Camera Zoom & Pan Calculation
    let cameraScale = 1.0;
    let cameraOffsetX = 0;
    let cameraOffsetY = 0;

    if (scene.id === 2) {
      // Zoom into Dashboard "Book Free Demo" button (scale: 1.0 -> 1.35)
      const t = Math.min(Math.max((sceneProgress - 0.2) / 0.6, 0), 1);
      const ease = t * t * (3 - 2 * t);
      cameraScale = 1.0 + ease * 0.35;
      cameraOffsetY = -ease * (H * 0.12);
    } else if (scene.id === 3) {
      // Zoom into Subject Selection Cards (scale: 1.0 -> 1.3)
      const t = Math.min(Math.max((sceneProgress - 0.2) / 0.6, 0), 1);
      const ease = t * t * (3 - 2 * t);
      cameraScale = 1.0 + ease * 0.3;
      cameraOffsetY = -ease * (H * 0.08);
    } else if (scene.id === 4) {
      // Zoom directly onto Tutor Card "Book Free Demo" CTA button
      const t = Math.min(Math.max((sceneProgress - 0.25) / 0.55, 0), 1);
      const ease = t * t * (3 - 2 * t);
      cameraScale = 1.0 + ease * 0.38;
      cameraOffsetY = -ease * (H * 0.16);
    } else if (scene.id === 5) {
      // Zoom into Demo Booking Calendar & Confirm button
      const t = Math.min(Math.max((sceneProgress - 0.2) / 0.6, 0), 1);
      const ease = t * t * (3 - 2 * t);
      cameraScale = 1.0 + ease * 0.32;
      cameraOffsetY = -ease * (H * 0.15);
    }

    // Apply Camera Transform centered on 9:16 frame
    ctx.translate(W / 2, H / 2);
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-W / 2 + cameraOffsetX, -H / 2 + cameraOffsetY);

    // 1. Draw Background (Cuvasol Soft Emerald & Indigo Gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#f4fbf9");
    bgGrad.addColorStop(0.5, "#ffffff");
    bgGrad.addColorStop(1, "#f3f0ff");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle background mesh grid
    ctx.strokeStyle = "rgba(13, 148, 136, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Render Scene-Specific Cuvasol UI Content using ACTUAL website recordings
    const screens = screenImagesRef.current;

    if (scene.id === 1) {
      // SCENE 1: Homepage & Logo (0-5s)
      const homeImg = sceneProgress > 0.45 ? (screens.scene1_scroll || screens.scene1_home) : screens.scene1_home;
      drawActualWebsiteScreen(ctx, homeImg, W, H);
    } else if (scene.id === 2) {
      // SCENE 2: Student Login & Dashboard (5-10s)
      drawActualWebsiteScreen(ctx, screens.scene2_dashboard, W, H);
    } else if (scene.id === 3) {
      // SCENE 3: Subject Selection Page (10-16s)
      drawActualWebsiteScreen(ctx, screens.scene3_subjects, W, H);
    } else if (scene.id === 4) {
      // SCENE 4: Tutor Profiles Showcase (16-22s)
      drawActualWebsiteScreen(ctx, screens.scene4_tutors, W, H);
    } else if (scene.id === 5) {
      // SCENE 5: Demo Booking Calendar & Confirmation (22-29s)
      drawActualWebsiteScreen(ctx, screens.scene5_booking, W, H);
    } else {
      // SCENE 6: Grand CTA with Cuvasol Logo (29-35s)
      drawActualWebsiteScreen(ctx, screens.scene6_cta, W, H);
    }

    ctx.restore(); // Restore camera transform

    // 3. Draw Mobile Overlay Elements (Floating Header & CapCut-Style Subtitles)
    drawMobileHeader(ctx, W, H, scene.title, time);
    drawSubtitles(ctx, W, H, scene.subtitle, scene.highlightKeyword, sceneProgress);

    // 4. Draw Progress Bar at Top
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, W, 8);
    const progressGrad = ctx.createLinearGradient(0, 0, W, 0);
    progressGrad.addColorStop(0, "#0d9488"); // teal-600
    progressGrad.addColorStop(0.5, "#6366f1"); // indigo-500
    progressGrad.addColorStop(1, "#10b981"); // emerald-500
    ctx.fillStyle = progressGrad;
    ctx.fillRect(0, 0, (time / TOTAL_DURATION) * W, 8);
  }, [width, height]);

  // ==================== SCENE DRAWING HELPERS ====================

  // Draw PURE Actual Live Cuvasol Website Screen Recording (Clean Video, No artificial boxes or emojis)
  function drawActualWebsiteScreen(
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement | undefined, 
    W: number, 
    H: number
  ) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Draw clean full 9:16 mobile website recording frame
    ctx.drawImage(img, 0, 0, W, H);
  }





  // Draw Mobile Status Bar & Navigation
  function drawMobileHeader(ctx: CanvasRenderingContext2D, W: number, H: number, title: string, time: number) {
    // Top status pill
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    drawRoundedRect(ctx, W * 0.25, 24, W * 0.5, 48, 24, "rgba(15, 23, 42, 0.75)", "transparent", 0);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`⏱️ ${Math.floor(time)}s / ${TOTAL_DURATION}s • ${title}`, W / 2, 48);
  }

  // Draw CapCut-Style Vertical Subtitles at Bottom Third
  function drawSubtitles(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, keyword: string, p: number) {
    const subY = H * 0.88;
    const paddingX = 40;
    const paddingY = 22;

    ctx.font = "bold 34px DM Sans, sans-serif";
    const textWidth = ctx.measureText(text).width;
    const boxW = Math.min(textWidth + paddingX * 2, W * 0.92);
    const boxH = 80;

    // Dark rounded translucent pill for subtitle readability
    drawRoundedRect(ctx, (W - boxW) / 2, subY - boxH / 2, boxW, boxH, 24, "rgba(15, 23, 42, 0.88)", "#0d9488", 2);

    // Draw subtitle with highlighted keyword
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, W / 2, subY);
  }

  // Utility: Draw smooth rounded rectangles
  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke: string,
    lineWidth: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && lineWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==================== PLAYBACK CONTROLS ====================

  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000;
      lastStamp = stamp;

      if (isPlaying) {
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= TOTAL_DURATION) {
            setIsPlaying(false);
            stopBackgroundMusic();
            if (isRecording) {
              stopRecording();
            }
            return TOTAL_DURATION;
          }

          // Trigger voiceover for active scene
          const activeIndex = SCENES.findIndex(s => next >= s.start && next < s.end);
          if (activeIndex !== -1) {
            triggerVoiceover(activeIndex);
          }

          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isRecording, stopBackgroundMusic, triggerVoiceover]);

  // Redraw when currentTime changes
  useEffect(() => {
    drawFrame(currentTime);
    if (isRecording) {
      setRecordingProgress(Math.round((currentTime / TOTAL_DURATION) * 100));
    }
  }, [currentTime, drawFrame, isRecording]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopBackgroundMusic();
      if ("speechSynthesis" in window) window.speechSynthesis.pause();
    } else {
      if (currentTime >= TOTAL_DURATION) {
        setCurrentTime(0);
        isSpeakingRef.current = -1;
      }
      setIsPlaying(true);
      startBackgroundMusic();
      if ("speechSynthesis" in window) window.speechSynthesis.resume();
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    isSpeakingRef.current = -1;
    stopBackgroundMusic();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const handleSeek = (val: number[]) => {
    const newTime = val[0];
    setCurrentTime(newTime);
    isSpeakingRef.current = -1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  // ==================== 1-CLICK EXPORT RECORDER ====================

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      recordedChunksRef.current = [];
      const stream = canvas.captureStream(60); // 60 FPS

      const options: MediaRecorderOptions = {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm"
      };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cuvasol-Free-Demo-WhatsApp-Video-9x16.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
        toast.success("🎬 Video recorded & downloaded successfully!");
      };

      recorder.start();
      setIsRecording(true);
      setCurrentTime(0);
      isSpeakingRef.current = -1;
      setIsPlaying(true);
      startBackgroundMusic();
      toast.info("Recording 35s WhatsApp Video (9:16)... Please wait.");
    } catch (err: any) {
      console.error("Recording error:", err);
      toast.error("MediaRecorder not supported in this browser. Please use Chrome/Edge.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-6 px-4">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between pb-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Website
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600/30 text-emerald-400 border-emerald-500/40">
            <Smartphone className="h-3 w-3 mr-1" /> 9:16 Vertical
          </Badge>
          <Badge className="bg-indigo-600/30 text-indigo-400 border-indigo-500/40">
            <Clock className="h-3 w-3 mr-1" /> 35 Seconds
          </Badge>
          <Badge className="bg-teal-600/30 text-teal-400 border-teal-500/40">
            WhatsApp Ready
          </Badge>
        </div>
      </div>

      <div className="w-full max-w-5xl text-center py-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
          Cuvasol 9:16 Promo Video Studio
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Automated WhatsApp promo video showcasing real Cuvasol screen flows, zoom effects & English subtitles.
        </p>
      </div>

      {/* Main Studio View */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
        {/* Left: 9:16 Video Player Container */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative rounded-3xl p-2 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 shadow-2xl">
            {/* Phone Bezel */}
            <div className="relative rounded-2xl overflow-hidden shadow-inner bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-[320px] h-[568px] sm:w-[360px] sm:h-[640px] object-contain rounded-2xl"
              />

              {/* Recording Overlay */}
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  REC {recordingProgress}%
                </div>
              )}
            </div>
          </div>

          {/* Quick Play Controls below Phone */}
          <div className="w-[360px] flex items-center justify-between gap-3 mt-4 px-2">
            <Button
              onClick={handlePlayPause}
              disabled={isRecording}
              className={`flex-1 h-11 font-bold rounded-xl shadow-md gap-2 ${
                isPlaying 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause Video" : "Play Video"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              disabled={isRecording}
              className="h-11 w-11 rounded-xl border-slate-700 hover:bg-slate-800 text-slate-300"
              title="Reset to 0s"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Timeline, Scene Storyboard & Export Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Export Action Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Video className="h-5 w-5 text-emerald-400" />
                  Export 9:16 WhatsApp Video
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Records all 6 scenes at 60 FPS in Full HD (1080x1920) with audio & subtitles.
                </p>
              </div>
              <Badge className="bg-emerald-500 text-slate-950 font-bold">MP4 / WebM</Badge>
            </div>

            <Button
              onClick={startRecording}
              disabled={isRecording}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-base rounded-xl shadow-lg hover:shadow-emerald-500/20 gap-2 transition-all"
            >
              <Download className="h-5 w-5" />
              {isRecording ? `Recording... (${recordingProgress}%)` : "Record & Download 9:16 Video"}
            </Button>
          </div>

          {/* 2. Timeline Scrubber */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400" />
                Current Time: <strong className="text-white text-sm">{currentTime.toFixed(1)}s</strong> / {TOTAL_DURATION}s
              </span>
              <span>{Math.round((currentTime / TOTAL_DURATION) * 100)}%</span>
            </div>
            <Slider
              value={[currentTime]}
              min={0}
              max={TOTAL_DURATION}
              step={0.1}
              onValueChange={handleSeek}
              disabled={isRecording}
              className="py-1"
            />
          </div>

          {/* 3. Audio & Music Settings */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-400" />
              Audio & Subtitles Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Music Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
                    Upbeat BGM Volume
                  </span>
                  <span className="text-white font-mono">{Math.round(musicVolume * 100)}%</span>
                </div>
                <Slider
                  value={[musicVolume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(val) => setMusicVolume(val[0])}
                  disabled={isMuted}
                />
              </div>

              {/* Voiceover Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-xs font-medium text-slate-300">English Voice-Over</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVoiceoverEnabled(!voiceoverEnabled)}
                  className={`h-8 text-xs font-bold rounded-lg ${
                    voiceoverEnabled 
                      ? "border-emerald-500 text-emerald-400 bg-emerald-950/40" 
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {voiceoverEnabled ? "Enabled" : "Muted"}
                </Button>
              </div>
            </div>
          </div>

          {/* 4. Storyboard Scene Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-slate-300">Storyboard Scenes ({SCENES.length})</h4>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {SCENES.map((sc) => {
                const isActive = currentTime >= sc.start && currentTime < sc.end;
                return (
                  <div
                    key={sc.id}
                    onClick={() => {
                      setCurrentTime(sc.start);
                      isSpeakingRef.current = -1;
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive 
                        ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm" 
                        : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
                        Scene {sc.id}: {sc.title}
                      </span>
                      <span className="font-mono text-emerald-400">{sc.start}s - {sc.end}s</span>
                    </div>
                    <p className="mt-1 text-slate-300 italic font-normal line-clamp-1">"{sc.voiceover}"</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
