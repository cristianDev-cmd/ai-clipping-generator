"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  FaTimes,
  FaPlus,
  FaClock,
  FaExclamationTriangle,
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

// =========================================================================
// PRESETS DE ESTILO ACTUALIZADOS (ESPAÑOL -> INGLÉS)
// =========================================================================
const STYLE_PRESETS = [
  {
    label: "Zoom lento profesional",
    prompt: "Professional commercial product videography, slow and smooth cinematic camera zoom-in towards the center, 8k resolution, photorealistic. Studio lighting with soft key light and dramatic rim light highlighting the premium textures and clean edges of the product. Elegant reflections, pristine environment, high-end advertising aesthetic, shallow depth of field with a beautifully blurred background (bokeh). No shaky motion, seamless animation, 60fps fluid movement."
  },
  {
    label: "Giro fluido completo",
    prompt: "Commercial product videography, slow and ultra-smooth 360-degree camera orbit rotation around the product. Perfect studio stabilization, flawless seamless loop, cinematic ambient lighting with soft key light, premium textures, high-end advertising aesthetic, 60fps fluid motion, no shaking."
  },
  {
    label: "Luces de neón",
    prompt: "Futuristic tech product commercial, dynamic neon cyberpunk ambient light reflecting on sleek surfaces. Slow macro pan, moody cinematic atmosphere, dark clean studio backdrop with subtle smoke, vibrant blue and magenta glowing rim lights, premium aesthetic, smooth animation."
  },
  {
    label: "Cámara lenta épica",
    prompt: "High-speed product commercial videography, ultra slow-motion action shot, 120fps feel. Elegant floating dust particles or subtle liquid drops caught in mid-air around the item, dramatic cinematic studio lighting, extreme contrast, sharp focus, high-end advertising style."
  },
  {
    label: "Sol y sombras",
    prompt: "Aesthetic organic product video, slow cinematic camera pan, natural morning sunlight streaming through a window, elegant shifting leaf shadows moving softly across the scene. Minimalist clean setup, soft warm lighting, photorealistic textures, calm ambient vibe."
  },
  {
    label: "Detalles de cerca",
    prompt: "Macro lens luxury product commercial, extreme close-up shot slowly sliding along the premium materials and precise textures. High-end lighting highlighting intricate details, deep bokeh, elegant shadows, polished professional advertising aesthetic, ultra-fluid 60fps movement."
  },
  {
    label: "Revelado con sombras",
    prompt: "Cinematic product reveal, slow camera tilt up, dramatic volumetric lighting cutting through the dark. Elegant moving shadows, mysterious high-contrast studio atmosphere, premium commercial aesthetic, pristine environment, flawless fluid transition."
  },
  {
    label: "Fondo limpio nórdico",
    prompt: "Minimalist Scandinavian product videography, slow smooth dolly-out camera movement. Bright, clean, pastel-toned studio background, soft uniform diffusion lighting, matte textures, elegant and simple high-end design commercial vibe, photorealistic."
  },
  {
    label: "Destellos de lente",
    prompt: "Premium commercial cinematography, slow cinematic slide, elegant and subtle anamorphic lens flares crossing the screen softly. Dreamy high-end advertising lighting, glossy reflections, shallow depth of field, fluid seamless transition, 8k resolution."
  },
  {
    label: "Reflejo en agua",
    prompt: "High-end product commercial, item placed over a dark, pristine liquid mirror surface with perfect, subtle water ripples moving slowly. Elegant dark studio mood, sharp reflections, crisp lighting on edges, cinematic high-contrast advertising look."
  },
  {
    label: "Levitación lenta flotante",
    prompt: "Surreal premium product videography, the item softly levitates and rotates on its axis with a slow cinematic zoom-in. Gravity-defying commercial aesthetic, dreamlike studio lighting, smooth seamless animation, ethereal ambient look, photorealistic."
  }
];

// =========================================================================
// FASES DE CARGA (MENSAJES DINÁMICOS)
// =========================================================================
const LOADING_MESSAGES = [
  "Preparando las imágenes para la IA...",
  "Enviando a Veo en Vertex AI para renderizar...",
  "La IA está componiendo tu video con referencias múltiples...",
  "Generando transiciones fluidas de cámara...",
  "Analizando la imagen principal con Gemini...",
  "Creando copys virales para tu Reel...",
  "Casi listo, finalizando la renderización del MP4...",
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
  // — State: Múltiples Imágenes (Máximo 4 o 3 dependiendo del modelo) —
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imagesBase64, setImagesBase64] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // — State: Configuración —
  const [prompt, setPrompt] = useState("");
  const [videoModel, setVideoModel] = useState(VIDEO_MODELS[0].id);
  const [copyModel, setCopyModel] = useState(COPY_MODELS[0].id);
  const [duration, setDuration] = useState(5);

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

  // — Reglas de Validación Dinámica —
  const isVeo20 = videoModel.includes("veo-2.0");
  const isMultiImage = imagePreviews.length > 1;
  const maxImages = isVeo20 ? 3 : 4;

  // Determinar opciones de duración disponibles dinámicamente
  let availableDurations = [5, 10, 15];
  if (isVeo20) {
    if (isMultiImage) {
      availableDurations = [8]; // Veo 2.0 con referencias múltiples requiere obligatoriamente 8s
    } else {
      availableDurations = [5, 8]; // Veo 2.0 con imagen única soporta 5s u 8s
    }
  }

  // Sincronizar duración si la opción seleccionada deja de estar disponible
  useEffect(() => {
    if (!availableDurations.includes(duration)) {
      setDuration(availableDurations[0]);
    }
  }, [videoModel, imagePreviews.length, availableDurations, duration]);

  // Si se cambia a un modelo con límite menor y se excede, truncar excedente
  useEffect(() => {
    if (imagePreviews.length > maxImages) {
      setImageFiles((prev) => prev.slice(0, maxImages));
      setImagePreviews((prev) => prev.slice(0, maxImages));
      setImagesBase64((prev) => prev.slice(0, maxImages));
      setError(`Se ha limitado la carga a ${maxImages} imágenes por compatibilidad con el modelo seleccionado.`);
    }
  }, [videoModel, maxImages, imagePreviews.length]);

  // =========================================================================
  // HANDLERS: PROCESAR IMÁGENES MÚLTIPLES (FIX DUPLICACIÓN STRICT MODE)
  // =========================================================================
  const processFiles = useCallback((files) => {
    const validImageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    
    if (validImageFiles.length === 0) return;

    // Calcular espacio disponible
    const availableSlots = maxImages - imagePreviews.length;
    if (availableSlots <= 0) {
      setError(`Ya has alcanzado el límite de ${maxImages} imágenes de referencia.`);
      return;
    }

    const filesToProcess = validImageFiles.slice(0, availableSlots);
    if (validImageFiles.length > availableSlots) {
      setError(`Solo se agregaron ${availableSlots} imágenes. El máximo permitido es ${maxImages}.`);
    }

    let loadedCount = 0;
    const newPreviews = [];
    const newBase64s = [];
    const newFiles = [];

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result;
        if (base64) {
          newPreviews.push(base64);
          newBase64s.push(base64);
          newFiles.push(file);
        }
        loadedCount++;
        // Cuando todas las imágenes seleccionadas se leyeron, actualizamos el estado una sola vez
        if (loadedCount === filesToProcess.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
          setImagesBase64((prev) => [...prev, ...newBase64s]);
          setImageFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Limpiar resultados anteriores
    setVideoUrl(null);
    setCaptions([]);
    setEditedCaptions([]);
  }, [imagePreviews.length, maxImages]);

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImagesBase64((prev) => prev.filter((_, i) => i !== index));
    setVideoUrl(null);
    setCaptions([]);
    setEditedCaptions([]);
    setError(null);
  };

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
      if (e.dataTransfer.files) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  // =========================================================================
  // HANDLER: GENERAR VIDEO + COPYS
  // =========================================================================
  const handleGenerate = async () => {
    if (imagesBase64.length === 0 || !prompt.trim()) {
      setError("Por favor sube al menos una imagen de referencia y escribe tu prompt de animación.");
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
          images: imagesBase64,
          prompt: prompt.trim(),
          videoModel,
          copyModel,
          duration,
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

    try {
      await downloadMedia(videoUrl, "reel-video.mp4");
    } catch (e) {
      console.error("Error al descargar:", e);
    }

    try {
      await navigator.clipboard.writeText(captionText);
    } catch (e) {
      console.error("Error al copiar al portapapeles:", e);
    }

    setShowSuccessModal(true);
    setCountdown(3);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setShowSuccessModal(false);
        window.open("https://www.instagram.com/reels/create/", "_blank");
      }
    }, 1000);
  };

  // =========================================================================
  // HANDLERS AUXILIARES
  // =========================================================================
  const applyPreset = (presetPrompt) => {
    setPrompt((prev) =>
      prev ? `${prev}, ${presetPrompt}` : presetPrompt
    );
  };

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
            Sube hasta {maxImages} imágenes, define la duración, elige tus presets de estilo y genera un video vertical listo para redes.
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
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-350 ml-2">
                  <FaTimes />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== DROPZONE DE IMÁGENES MÚLTIPLES ==================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
              <FaCloudUploadAlt className="text-primary" />
              Imágenes de Referencia (Máx. {maxImages})
            </label>
            <span className="text-[10px] font-bold text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-divider/30">
              {imagePreviews.length} / {maxImages}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {imagePreviews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-bg-card border border-divider/30 rounded-2xl">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black/40 border border-divider/40 group shadow-md"
                >
                  <img
                    src={preview}
                    alt={`Referencia ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Botón de Borrar */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                  >
                    <FaTimes className="text-[10px]" />
                  </button>
                  
                  {/* Identificador de Orden */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white tracking-widest border border-white/10 uppercase">
                    {index === 3 ? "Style" : `Ref ${index + 1}`}
                  </div>
                </div>
              ))}

              {/* Botón slot para añadir más imágenes */}
              {imagePreviews.length < maxImages && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-[9/16] rounded-xl border-2 border-dashed border-divider/50 bg-bg-elevated/40 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-bg-elevated border border-divider/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FaPlus className="text-xs text-muted group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-muted group-hover:text-primary uppercase tracking-wider">
                    Añadir
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 py-12 sm:py-16 flex flex-col items-center gap-3 ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-divider/50 bg-bg-card hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-divider/30 flex items-center justify-center">
                <FaCloudUploadAlt className="text-2xl text-muted" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  Arrastra tus imágenes aquí
                </p>
                <p className="text-xs text-muted mt-1">
                  Sube hasta {maxImages} imágenes · JPG, PNG, WebP
                </p>
              </div>
            </div>
          )}
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

        {/* ==================== SELECTOR DE DURACIÓN DEL REEL ==================== */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
            <FaClock className="text-primary text-[10px]" />
            Duración del Reel
          </label>
          <div className="grid grid-cols-4 gap-2 p-1 bg-bg-elevated border border-divider/40 rounded-xl max-w-md">
            {[5, 8, 10, 15].map((s) => {
              const isAvailable = availableDurations.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => setDuration(s)}
                  className={`py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
                    duration === s
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-muted hover:text-foreground hover:bg-bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  {s}s
                </button>
              );
            })}
          </div>

          {/* Advertencia visual de limitación del modelo */}
          {isVeo20 && isMultiImage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 flex items-start gap-2"
            >
              <FaExclamationTriangle className="shrink-0 mt-0.5" />
              <span>
                <strong>Limitación de Veo 2.0:</strong> La animación con referencias múltiples (2-3 imágenes) está fijada por Google Cloud en **8 segundos** y formato horizontal **16:9** (el video final se ajustará automáticamente).
              </span>
            </motion.div>
          )}
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
            placeholder="Describe cómo quieres que se anime el producto o la escena... (Ej: Movimiento de órbita suave con luces reflejadas...)"
            rows={3}
            className="w-full bg-bg-elevated border border-divider/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-y min-h-[80px]"
          />
          
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Presets de Movimiento Cinematográfico (Traducidos a Inglés)
            </span>
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto scrollbar-subtle p-1 border border-divider/20 rounded-xl bg-bg-card/40">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.prompt)}
                  className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-divider/30 text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  ✨ {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== BOTÓN GENERAR ==================== */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || imagesBase64.length === 0 || !prompt.trim()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando Reel ({duration}s)...
            </>
          ) : (
            <>
              <FaMagic />
              Generar Reel e IA Copys
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
                  Esto puede tardar entre 1 y 3 minutos debido al renderizado de {duration}s. No cierres esta pestaña.
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
                  Tu Reel Generado ({duration}s)
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
