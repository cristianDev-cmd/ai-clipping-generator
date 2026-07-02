"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMagic,
  FaCalendarAlt,
  FaPlay,
  FaCheck,
  FaCopy,
  FaThumbsUp,
  FaThumbsDown,
  FaClock,
  FaDownload,
  FaExclamationCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { downloadMedia } from "@/lib/utils";
import { FiDownload } from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function CreationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCreations();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status]);

  const fetchCreations = async () => {
    try {
      const res = await fetch("/api/creations");
      const data = await res.json();
      if (res.ok) {
        setCreations(data);
      }
    } catch (error) {
      console.error("Error fetching creations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, field, value) => {
    setUpdatingId(id);
    try {
      const body = {};
      body[field] = value;

      const res = await fetch(`/api/creations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("No se pudo actualizar el estado.");
      }

      const updated = await res.json();
      
      // Actualizar en el estado local
      setCreations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
      );

      // Si el modal está abierto para este clip, actualizarlo también
      if (selectedClip && selectedClip.id === id) {
        setSelectedClip((prev) => ({ ...prev, ...updated }));
      }

      toast.success(
        field === "feedbackStatus" 
          ? "Valoración guardada" 
          : "Estado de publicación actualizado"
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Fallo al actualizar el estado de la creación.");
    } finally {
      setUpdatingId(null);
    }
  };

  const parseResultUrl = (url) => {
    try {
      const parsed = JSON.parse(url);
      return Array.isArray(parsed) ? parsed : [url];
    } catch (e) {
      return [url];
    }
  };

  const parseCaptions = (captionsStr) => {
    try {
      return JSON.parse(captionsStr || "[]");
    } catch (e) {
      return [captionsStr || ""];
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full drop-shadow-md"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent overflow-y-auto custom-scrollbar p-4 md:p-12 scrollbar-subtle">
      <header className="max-w-7xl mx-auto mb-10 space-y-3 pt-4 md:pt-0">
        <div className="flex items-center gap-3 text-primary mb-1">
          <FaCalendarAlt className="text-sm" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em]">
            Archivo Histórico
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          MIS CREACIONES
        </h1>
        <p className="text-sm text-muted max-w-xl">
          Visualiza tu galería de Reels generados por IA, descarga tus videos y gestiona el estado de publicación en tus redes.
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        {creations.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-8">
            <div className="w-20 h-20 rounded-3xl bg-bg-card border border-divider/50 flex items-center justify-center shadow-sm">
              <FaMagic className="text-3xl text-muted" />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">TUS CREACIONES APARECERÁN AQUÍ</h3>
              <p className="text-xs text-muted max-w-xs mx-auto">Sube una imagen en el estudio para generar tu primer video con inteligencia artificial.</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl shadow-primary/20"
              >
                Comenzar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {creations.map((item, index) => {
                const urls = parseResultUrl(item.resultUrl);
                const thumbnail = urls[0];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative rounded-2xl bg-bg-card border border-divider/40 aspect-[9/16] cursor-pointer overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col"
                  >
                    {/* Header superior de la tarjeta */}
                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 bg-black/60 rounded-lg text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/5">
                        {item.type === "veo_video" ? "Veo Video" : "AI Highlight"}
                      </span>
                      {item.publishStatus === "published" && (
                        <span className="px-2.5 py-1 bg-green-500/80 rounded-lg text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-green-500/20">
                          Publicado
                        </span>
                      )}
                      {item.publishStatus === "scheduled" && (
                        <span className="px-2.5 py-1 bg-amber-500/80 rounded-lg text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-amber-500/20">
                          Planificado
                        </span>
                      )}
                    </div>

                    {/* Contenido Visual */}
                    <div 
                      className="flex-1 w-full relative bg-black"
                      onClick={() => setSelectedClip(item)}
                    >
                      {item.status === "completed" ? (
                        <video
                          src={thumbnail}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                        />
                      ) : item.status === "failed" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/5 gap-3 p-4">
                          <FaExclamationCircle className="text-red-500 text-2xl" />
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">Fallo en generación</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-bg-card-hover gap-4">
                          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] animate-pulse">Renderizando...</span>
                        </div>
                      )}

                      {/* Botón de reproducción visible */}
                      {item.status === "completed" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/40 transition-colors">
                          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/35 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-lg">
                            <FaPlay className="text-white text-xs translate-x-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer con controles rápidos */}
                    {item.status === "completed" && (
                      <div className="p-3.5 bg-bg-elevated border-t border-divider/30 flex items-center justify-between gap-2 z-20">
                        {/* Likes/Dislikes */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "feedbackStatus", item.feedbackStatus === "liked" ? null : "liked")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.feedbackStatus === "liked" 
                                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                : "text-muted hover:text-foreground hover:bg-bg-card-hover"
                            }`}
                          >
                            <FaThumbsUp className="text-xs" />
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "feedbackStatus", item.feedbackStatus === "disliked" ? null : "disliked")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.feedbackStatus === "disliked" 
                                ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                : "text-muted hover:text-foreground hover:bg-bg-card-hover"
                            }`}
                          >
                            <FaThumbsDown className="text-xs" />
                          </button>
                        </div>

                        {/* Publicar / Descargar */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "publishStatus", item.publishStatus === "published" ? "not_published" : "published")}
                            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                              item.publishStatus === "published"
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "border-divider/50 text-muted hover:text-foreground hover:bg-bg-card-hover"
                            }`}
                          >
                            Publicado
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "publishStatus", item.publishStatus === "scheduled" ? "not_published" : "scheduled")}
                            className={`p-1.5 rounded-lg border transition-all ${
                              item.publishStatus === "scheduled"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "border-divider/50 text-muted hover:text-foreground hover:bg-bg-card-hover"
                            }`}
                          >
                            <FaClock className="text-xs" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Detallado de Creación */}
      <AnimatePresence>
        {selectedClip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md p-4 md:p-12 flex flex-col items-center justify-center"
            onClick={() => setSelectedClip(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative max-w-4xl w-full h-[85vh] bg-bg-card border border-divider/50 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lado del Video */}
              <div className="flex w-full md:w-[45%] h-[50%] md:h-full bg-black relative flex-col justify-center">
                {selectedClip.status === "completed" ? (
                  <video
                    src={parseResultUrl(selectedClip.resultUrl)[0]}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/5 gap-4">
                    <FaExclamationCircle className="text-red-500 text-3xl" />
                    <span className="text-sm font-bold text-red-500">Error en la generación</span>
                  </div>
                )}
              </div>

              {/* Lado de los Detalles */}
              <div className="flex w-full md:w-[55%] h-[50%] md:h-full p-6 flex-col bg-bg-card overflow-y-auto scrollbar-subtle">
                <div className="space-y-5">
                  <div>
                    <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">Detalles del Reel</span>
                    <h3 className="text-lg font-bold text-foreground">Creación Generada</h3>
                  </div>

                  <div className="border-t border-divider/30 pt-4 space-y-4">
                    {/* Prompt de animación */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Prompt Utilizado</span>
                      <p className="text-xs text-foreground bg-bg-elevated/40 border border-divider/30 rounded-xl p-3 leading-relaxed">
                        {selectedClip.prompt || "No especificado"}
                      </p>
                    </div>

                    {/* Copys de Gemini */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Descripciones Virales</span>
                      <div className="space-y-2.5">
                        {parseCaptions(selectedClip.captions).map((cap, idx) => (
                          <div
                            key={idx}
                            className="bg-bg-elevated/60 border border-divider/40 rounded-xl p-3 relative group flex items-start gap-2.5"
                          >
                            <span className="text-[9px] font-black text-muted bg-bg-card px-1.5 py-0.5 rounded border border-divider/30 shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <p className="text-xs text-foreground leading-relaxed flex-1 select-all pr-6">
                              {cap}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cap);
                                toast.success("Copiado al portapapeles");
                              }}
                              className="absolute top-2.5 right-2.5 text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <FaCopy size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fecha de Creación */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Fecha de Generación</span>
                      <span className="text-[11px] text-muted">
                        {new Date(selectedClip.createdAt).toLocaleString("es-ES", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones principales del Modal */}
                <div className="pt-8 mt-auto flex flex-col gap-3">
                  <button
                    onClick={() => downloadMedia(parseResultUrl(selectedClip.resultUrl)[0], "reel-video.mp4")}
                    className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2.5 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                  >
                    <FiDownload className="text-sm" />
                    Descargar Video
                  </button>
                </div>
              </div>

              {/* Botón de Cerrar */}
              <button
                onClick={() => setSelectedClip(null)}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors bg-bg-elevated/40 border border-divider/40 rounded-full"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
        .custom-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
