"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  FaChartBar,
  FaCalendarAlt,
  FaFilm,
  FaInstagram,
  FaThumbsUp,
  FaDollarSign,
  FaSpinner,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function MetricsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchMetrics();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      if (res.ok) {
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
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

  const { summary, charts } = metrics || {
    summary: { totalGenerated: 0, totalPublished: 0, totalLiked: 0, totalDisliked: 0, currentCredits: 0 },
    charts: { daily: [], monthly: [], yearly: [] }
  };

  // Encontrar el valor máximo para calcular alturas/anchuras relativas de las barras
  const maxDaily = Math.max(...charts.daily.map(d => d.count), 1);
  const maxMonthly = Math.max(...charts.monthly.map(m => m.count), 1);

  return (
    <div className="flex-1 bg-transparent overflow-y-auto custom-scrollbar p-4 md:p-12 scrollbar-subtle">
      <header className="max-w-7xl mx-auto mb-10 space-y-3 pt-4 md:pt-0">
        <div className="flex items-center gap-3 text-primary mb-1">
          <FaChartBar className="text-sm" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em]">
            Estadísticas de Uso
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          MÉTRICAS DEL ESTUDIO
        </h1>
        <p className="text-sm text-muted max-w-xl">
          Analiza tu volumen de generación de videos, tu tasa de publicación en Instagram y el balance de créditos de tu cuenta.
        </p>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Contadores Clave (Resumen) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: Generados */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Generados</span>
              <FaFilm className="text-primary text-xs" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
                {summary.totalGenerated}
              </h2>
              <span className="text-[10px] text-muted block mt-1">Reels creados</span>
            </div>
          </div>

          {/* Card 2: Publicados */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Publicados</span>
              <FaInstagram className="text-pink-500 text-xs" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
                {summary.totalPublished}
              </h2>
              <span className="text-[10px] text-muted block mt-1">
                {summary.totalGenerated > 0 
                  ? `${Math.round((summary.totalPublished / summary.totalGenerated) * 100)}% de tasa de publicación`
                  : "0% de tasa de publicación"}
              </span>
            </div>
          </div>

          {/* Card 3: Valoración */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Feedback Positivo</span>
              <FaThumbsUp className="text-green-500 text-xs" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
                {summary.totalLiked}
              </h2>
              <span className="text-[10px] text-muted block mt-1">Reels calificados 👍</span>
            </div>
          </div>

          {/* Card 4: Créditos */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Créditos Restantes</span>
              <FaDollarSign className="text-emerald-500 text-xs" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
                {summary.currentCredits}
              </h2>
              <span className="text-[10px] text-muted block mt-1">Créditos en cuenta</span>
            </div>
          </div>
        </div>

        {/* Sección de Gráficos de CSS Puro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Producción Diaria (Últimos 30 días) */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FaCalendarAlt className="text-primary text-[10px]" />
                Volumen Diario (Últimos 30 días)
              </h3>
              <span className="text-[9px] text-muted font-bold">Creaciones / Día</span>
            </div>
            
            <div className="flex-1 min-h-[220px] flex items-end justify-between gap-1 pt-4 border-b border-divider/30">
              {charts.daily.map((d, index) => {
                const heightPercent = (d.count / maxDaily) * 100;
                // Formatear fecha para el tooltip
                const dayNum = d.date.split("-")[2];
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 bg-bg-elevated border border-divider px-1.5 py-0.5 rounded text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center pointer-events-none whitespace-nowrap">
                      {d.count} Reels <br /> <span className="text-[7px] text-muted">{d.date}</span>
                    </div>
                    {/* Barra */}
                    <div 
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                      className={`w-full rounded-t-sm transition-all duration-500 ${
                        d.count > 0 
                          ? "bg-gradient-to-t from-primary/80 to-primary group-hover:to-secondary shadow-lg shadow-primary/10" 
                          : "bg-bg-elevated/40"
                      }`}
                    />
                    <span className="text-[7px] text-muted font-bold mt-1.5 leading-none select-none">
                      {index % 5 === 0 ? dayNum : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[8px] text-muted uppercase font-bold tracking-wider mt-2.5">
              <span>Hace 30 días</span>
              <span>Hoy</span>
            </div>
          </div>

          {/* Gráfico 2: Producción Mensual (Año actual) */}
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-6">
              <FaCalendarAlt className="text-secondary text-[10px]" />
              Distribución Mensual ({new Date().getFullYear()})
            </h3>
            
            <div className="space-y-3 pt-2">
              {charts.monthly.map((m, index) => {
                const widthPercent = (m.count / maxMonthly) * 100;
                return (
                  <div key={index} className="flex items-center gap-3 group">
                    <span className="w-8 text-[10px] font-bold text-muted uppercase text-right shrink-0">
                      {m.month}
                    </span>
                    <div className="flex-1 bg-bg-elevated/40 rounded-full h-3 overflow-hidden border border-divider/10 relative">
                      <div
                        style={{ width: `${Math.max(2, widthPercent)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.count > 0
                            ? "bg-gradient-to-r from-primary to-secondary group-hover:from-secondary group-hover:to-orange-500 shadow-md"
                            : "bg-transparent"
                        }`}
                      />
                    </div>
                    <span className="w-5 text-[10px] font-bold text-foreground shrink-0 text-left">
                      {m.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gráfico 3: Historial por Año */}
        {charts.yearly.length > 0 && (
          <div className="bg-bg-card border border-divider/40 rounded-2xl p-6 shadow-sm max-w-md">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
              <FaChartBar className="text-primary text-[10px]" />
              Resumen Histórico por Año
            </h3>
            <div className="space-y-3.5 pt-2">
              {charts.yearly.map((y, index) => (
                <div key={index} className="flex items-center justify-between border-b border-divider/30 pb-2">
                  <span className="text-sm font-bold text-foreground">{y.year}</span>
                  <span className="text-sm font-bold text-muted bg-bg-elevated px-2.5 py-0.5 rounded-lg border border-divider/30">
                    {y.count} Reels generados
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
