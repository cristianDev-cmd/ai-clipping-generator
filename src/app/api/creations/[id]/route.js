import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Actualiza el estado de una creación (feedbackStatus o publishStatus)
 * Método: PATCH /api/creations/[id]
 */
export async function PATCH(req, context) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Desestructurar de forma segura await params si es Next.js 16/15
  const params = await context.params;
  const { id } = params;

  try {
    const body = await req.json();
    const { feedbackStatus, publishStatus } = body;

    // Verificar si la creación existe y pertenece al usuario
    const creation = await prisma.creation.findUnique({
      where: { id }
    });

    if (!creation) {
      return NextResponse.json({ error: "Creación no encontrada" }, { status: 404 });
    }

    if (creation.userId !== session.user.id) {
      return NextResponse.json({ error: "Acceso prohibido" }, { status: 403 });
    }

    // Construir los datos a actualizar dinámicamente
    const updateData = {};
    if (feedbackStatus !== undefined) {
      updateData.feedbackStatus = feedbackStatus;
    }
    if (publishStatus !== undefined) {
      updateData.publishStatus = publishStatus;
    }

    const updatedCreation = await prisma.creation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCreation);
  } catch (error) {
    console.error("[CREATIONS_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Error interno al actualizar la creación" }, { status: 500 });
  }
}
