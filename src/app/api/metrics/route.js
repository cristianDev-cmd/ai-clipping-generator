

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Retorna las métricas de generación del usuario conectado.
 * Agrupa creaciones por Día, Mes y Año.
 * Método: GET /api/metrics
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Obtener todas las creaciones de video del usuario
    const creations = await prisma.creation.findMany({
      where: { 
        userId,
        type: "veo_video"
      },
      select: {
        createdAt: true,
        feedbackStatus: true,
        publishStatus: true
      }
    });

    // 2. Agrupar por Día (últimos 30 días para gráfico)
    const daily = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0]; // Formato YYYY-MM-DD
      daily[dateString] = 0;
    }

    // 3. Agrupar por Mes (año en curso)
    const monthly = {};
    const currentYear = new Date().getFullYear();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    monthNames.forEach((m) => (monthly[m] = 0));

    // 4. Agrupar por Año
    const yearly = {};

    // Contadores de resumen
    let totalGenerated = 0;
    let totalPublished = 0;
    let totalLiked = 0;
    let totalDisliked = 0;

    creations.forEach((c) => {
      totalGenerated++;
      if (c.publishStatus === "published") totalPublished++;
      if (c.feedbackStatus === "liked") totalLiked++;
      if (c.feedbackStatus === "disliked") totalDisliked++;

      const date = new Date(c.createdAt);
      const dateStr = date.toISOString().split("T")[0];
      const year = date.getFullYear();
      const monthIndex = date.getMonth();

      // Asignar al Día si entra en el rango de los últimos 30 días
      if (daily[dateStr] !== undefined) {
        daily[dateStr]++;
      }

      // Asignar al Mes (si es el año actual)
      if (year === currentYear) {
        monthly[monthNames[monthIndex]]++;
      }

      // Asignar al Año
      yearly[year] = (yearly[year] || 0) + 1;
    });

    // Formatear agrupaciones para uso de gráficos en el frontend
    const dailyChart = Object.keys(daily).map((date) => ({
      date,
      count: daily[date],
    }));

    const monthlyChart = Object.keys(monthly).map((month) => ({
      month,
      count: monthly[month],
    }));

    const yearlyChart = Object.keys(yearly).map((year) => ({
      year: String(year),
      count: yearly[year],
    }));

    // Cargar balance de créditos del usuario actualizado de la DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    return NextResponse.json({
      summary: {
        totalGenerated,
        totalPublished,
        totalLiked,
        totalDisliked,
        currentCredits: dbUser?.credits ?? 0,
      },
      charts: {
        daily: dailyChart,
        monthly: monthlyChart,
        yearly: yearlyChart,
      },
    });
  } catch (error) {
    console.error("[METRICS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno al calcular las métricas" }, { status: 500 });
  }
}
