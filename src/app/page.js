"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCloudUploadAlt,
  FaPlay,
  FaCheck,
  FaCopy,
  FaInstagram,
  FaChevronDown,
  FaMagic,
  FaRobot,
  FaFilm,
  FaPen,
  FaDownload,
} from "react-icons/fa";
import { downloadMedia } from "@/lib/utils";

// =========================================================================
// MODELOS DISPONIBLES
// =========================================================================
const VIDEO_MODELS = [
  {
    id: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast (Preview)",
    description: "Recomendado",
  },
  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1 Pro (Preview)",
    description: "Alta calidad",
  },
  {
    id: "veo-3.0-fast-generate-preview",
    label: "Veo 3.0 Fast (Preview)",
    description: "Versión 3.0 rápida",
  },
  {
    id: "veo-3.0-generate-preview",
    label: "Veo 3.0 Pro (Preview)",
    description: "Versión 3.0 estándar",
  },
  {
    id: "veo-2.0-generate-001",
    label: "Veo 2.0 (GA)",
    description: "Mayor disponibilidad",
  },
];

const COPY_MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Veloz — Recomendado",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Razonamiento avanzado",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Generación anterior",
  },
];

const STYLE_PRESETS = [
  { label: "Cinemático", prompt: "Cinematic slow-motion camera movement, dramatic lighting, shallow depth of field, movie-quality color grading" },
  { label: "Cyberpunk", prompt: "Futuristic neon-lit cyberpunk city atmosphere, holographic elements, vivid electric colors, rain reflections" },
  { label: "3D Render", prompt: "High-quality 3D render, smooth plastic-like materials, soft studio lighting, Pixar-style animation" },
  { label: "Acuarela", prompt: "Watercolor painting style animation, soft flowing colors, artistic brush strokes, dreamy atmosphere" },
  { label: "Retro VHS", prompt: "Retro VHS tape aesthetic, scan lines, vintage color distortion, 80s nostalgic warm tones" },
];

// =========================================================================
// FASES DE CARGA (MENSAJES DINÁMICOS)
// =========================================================================
const LOADING_MESSAGES = [
  "Preparando la imagen para la IA...",
  "Enviando a Veo 3.1 para renderizar...",
  "La IA está componiendo tu video vertical...",
  "Generando audio y efectos visuales...",
  "Analizando la imagen con Gemini...",
  "Creando copys virales para tu Reel...",
  "Casi listo, finalizando la renderización...",
];

// =========================================================================
// COMPONENTE: SELECTOR DROPDOWN
// =========================================================================
function ModelSelector({ label, icon, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.id === selected);

  return (
    <div className="relative" ref={ref}>
      <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-bg-elevated border border-divider/50 rounded-xl text-sm transition-all text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        <div className="flex flex-col items-start">
          <span className="font-semibold text-[13px]">{current?.label}</span>
          <span className="text-[10px] text-muted">{current?.description}</span>
        </div>
        <FaChevronDown
          className={`text-muted text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-bg-elevated border border-divider/60 rounded-xl shadow-2xl overflow-hidden p-1"
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                  selected === opt.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-bg-card-hover hover:text-foreground"
                }`}
              >
                <div className="font-semibold text-[13px]">{opt.label}</div>
                <div className="text-[10px] opacity-70">{opt.description}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL: DASHBOARD
// =========================================================================
export default function Home() {
  // — State: Imagen —
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // — State: Configuración —
  const [prompt, setPrompt] = useState("");
  const [videoModel, setVideoModel] = useState(VIDEO_MODELS[0].id);
  const [copyModel, setCopyModel] = useState(COPY_MODELS[0].id);

  // — State: Generación —
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState(null);

  // — State: Resultados —
  const [videoUrl, setVideoUrl] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [editedCaptions, setEditedCaptions] = useState([]);

  // — State: Publicación —
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // =========================================================================
  // HANDLERS: IMAGEN
  // =========================================================================
  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);

    // Reset resultados previos
    setVideoUrl(null);
    setCaptions([]);
    setEditedCaptions([]);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // =========================================================================
  // HANDLER: GENERAR VIDEO + COPYS
  // =========================================================================
  const handleGenerate = async () => {
    if (!imageBase64 || !prompt.trim()) {
      setError("Por favor sube una imagen y escribe un prompt de animación.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setCaptions([]);
    setLoadingMsgIndex(0);

    // Ciclar mensajes de carga
    const msgInterval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          prompt: prompt.trim(),
          videoModel,
          copyModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar el video.");
      }

      setVideoUrl(data.videoUrl);
      setCaptions(data.captions || []);
      setEditedCaptions(data.captions || []);
      setSelectedCaption(0);
    } catch (err) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      clearInterval(msgInterval);
      setIsGenerating(false);
    }
  };

  // =========================================================================
  // HANDLER: APROBAR Y PREPARAR PUBLICACIÓN
  // =========================================================================
  const handleApproveAndPublish = async () => {
    if (!videoUrl) return;
    const captionText = editedCaptions[selectedCaption] || "";

    // 1. Descargar el video MP4 forzando descarga via Blob
    try {
      await downloadMedia(videoUrl, "reel-video.mp4");
    } catch (e) {
      console.error("Error al descargar:", e);
    }

    // 2. Copiar copy seleccionado al portapapeles
    try {
      await navigator.clipboard.writeText(captionText);
    } catch (e) {
      console.error("Error al copiar al portapapeles:", e);
    }

    // 3. Mostrar modal de éxito con cuenta regresiva
    setShowSuccessModal(true);
    setCountdown(3);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setShowSuccessModal(false);
        // 4. Redirección a Instagram Reels
        window.open("https://www.instagram.com/reels/create/", "_blank");
      }
    }, 1000);
  };

  // =========================================================================
  // HANDLER: PRESET DE ESTILO
  // =========================================================================
  const applyPreset = (presetPrompt) => {
    setPrompt((prev) =>
      prev ? `${prev}, ${presetPrompt}` : presetPrompt
    );
  };

  // =========================================================================
  // HANDLER: EDICIÓN DE CAPTION
  // =========================================================================
  const updateCaption = (index, text) => {
    setEditedCaptions((prev) => {
      const copy = [...prev];
      copy[index] = text;
      return copy;
    });
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="flex-1 overflow-y-auto scrollbar-subtle">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* ==================== HEADER ==================== */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <FaFilm className="text-white text-sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Reel Studio
            </h1>
          </div>
          <p className="text-sm text-muted">
            Sube una imagen, genera un video vertical con IA y publícalo en
            Instagram Reels al instante.
          </p>
        </div>

        {/* ==================== ERROR ALERT ==================== */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== DROPZONE DE IMAGEN ==================== */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
            <FaCloudUploadAlt className="text-primary" />
            Imagen de Referencia
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : imagePreview
                ? "border-divider/30 bg-bg-card"
                : "border-divider/50 bg-bg-card hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative aspect-[9/16] max-h-[400px] w-full flex items-center justify-center bg-black/20">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                    {imageFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      setImageBase64(null);
                      setVideoUrl(null);
                      setCaptions([]);
                    }}
                    className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 sm:py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-divider/30 flex items-center justify-center">
                  <FaCloudUploadAlt className="text-2xl text-muted" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Arrastra tu imagen aquí
                  </p>
                  <p className="text-xs text-muted mt-1">
                    o haz clic para seleccionar · JPG, PNG, WebP
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SELECTORES DE MODELO ==================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModelSelector
            label="Modelo de Video"
            icon={<FaFilm className="text-primary text-[9px]" />}
            options={VIDEO_MODELS}
            selected={videoModel}
            onSelect={setVideoModel}
          />
          <ModelSelector
            label="Modelo de Copy"
            icon={<FaRobot className="text-secondary text-[9px]" />}
            options={COPY_MODELS}
            selected={copyModel}
            onSelect={setCopyModel}
          />
        </div>

        {/* ==================== PROMPT + PRESETS ==================== */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
            <FaPen className="text-primary text-[9px]" />
            Prompt de Animación
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe cómo quieres que se anime la imagen... Ej: Movimiento cinematográfico suave con efecto de parallax, luces cálidas de atardecer..."
            rows={3}
            className="w-full bg-bg-elevated border border-divider/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-y min-h-[80px]"
          />
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.prompt)}
                className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-divider/30 text-[11px] font-semibold text-muted hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== BOTÓN GENERAR ==================== */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !imageBase64 || !prompt.trim()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FaMagic />
              Generar Video e IA Copys
            </>
          )}
        </button>

        {/* ==================== ESTADO DE CARGA ==================== */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-bg-card border border-divider/30 rounded-2xl p-6 flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaFilm className="text-primary text-lg" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <motion.p
                  key={loadingMsgIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-semibold text-foreground"
                >
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </motion.p>
                <p className="text-[11px] text-muted">
                  Esto puede tardar entre 1 y 3 minutos. No cierres esta
                  pestaña.
                </p>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 120, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== RESULTADOS ==================== */}
        <AnimatePresence>
          {videoUrl && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* — Reproductor de Video — */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <FaPlay className="text-green-400 text-[9px]" />
                  Tu Reel Generado
                </label>
                <div className="bg-black rounded-2xl overflow-hidden border border-divider/30 shadow-xl">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full aspect-[9/16] max-h-[500px] object-contain bg-black"
                  />
                </div>
              </div>

              {/* — Selector de Copys — */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <FaCopy className="text-secondary text-[9px]" />
                  Elige tu Descripción para Instagram
                </label>
                <div className="space-y-3">
                  {editedCaptions.map((caption, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedCaption(index)}
                      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        selectedCaption === index
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-divider/30 bg-bg-card hover:border-primary/30"
                      }`}
                    >
                      {selectedCaption === index && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <FaCheck className="text-white text-[9px]" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-black text-muted bg-bg-elevated px-2 py-1 rounded-md shrink-0">
                          #{index + 1}
                        </span>
                        <textarea
                          value={caption}
                          onChange={(e) =>
                            updateCaption(index, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          rows={3}
                          className="flex-1 bg-transparent text-sm text-foreground outline-none resize-none placeholder-muted/40"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* — Botón Aprobar y Publicar — */}
              <button
                type="button"
                onClick={handleApproveAndPublish}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-extrabold text-sm tracking-wide flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:shadow-pink-500/25 active:scale-[0.98]"
              >
                <FaInstagram className="text-lg" />
                Aprobar y Preparar Publicación
                <FaDownload className="text-xs opacity-70" />
              </button>
              <p className="text-center text-[11px] text-muted -mt-4">
                Descarga el video · Copia el texto · Abre Instagram Reels
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================== MODAL DE ÉXITO ==================== */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-divider/50 rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <FaCheck className="text-white text-2xl" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-foreground">
                  ¡Todo listo!
                </h3>
                <p className="text-sm text-muted">
                  Video guardado y texto copiado al portapapeles.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted text-sm">
                <FaInstagram className="text-pink-500" />
                <span>
                  Abriendo Instagram en{" "}
                  <span className="font-black text-foreground">{countdown}s</span>
                  ...
                </span>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
