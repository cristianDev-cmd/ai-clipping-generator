import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, images, prompt, videoModel, copyModel, duration = 5 } = body;

    // Validación de duración (mínimo 5, máximo 15 segundos)
    const validDuration = Math.max(5, Math.min(15, Number(duration)));

    // Obtener lista de imágenes en Base64
    const imagesList: string[] = images || (image ? [image] : []);

    if (imagesList.length === 0 || !prompt || !videoModel || !copyModel) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (images o image, prompt, videoModel, copyModel)." },
        { status: 400 }
      );
    }

    // Extraer datos Base64 de la primera imagen para Gemini
    const firstImgMatch = imagesList[0].match(/^data:([^;]+);base64,(.+)$/);
    if (!firstImgMatch) {
      return NextResponse.json(
        { error: "Formato de imagen de referencia principal inválido. Debe ser una URI Base64 válida." },
        { status: 400 }
      );
    }
    const firstImgMime = firstImgMatch[1];
    const firstImgData = firstImgMatch[2];

    // =========================================================================
    // FASE 2 - ACOPLAMIENTO DE PRISMA Y MERCADO PAGO:
    // 1. Validar la sesión del usuario (NextAuth / getServerSession).
    // 2. Verificar el estado de la suscripción del usuario en la base de datos (Prisma).
    // 3. Verificar que el usuario posea créditos suficientes para la generación.
    // 4. Descontar créditos en la base de datos.
    // =========================================================================

    // FASE 1: Inicialización híbrida e inteligente de Google Gen AI SDK
    let ai: GoogleGenAI;
    const vertexCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    const vertexProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
    const studioApiKey = process.env.GOOGLE_STUDIO_API_KEY?.trim();

    const hasVertexCreds = vertexCredentialsJson && 
      vertexCredentialsJson !== "" && 
      vertexCredentialsJson !== '""' && 
      vertexCredentialsJson !== "''";

    const hasVertexProject = vertexProjectId && 
      vertexProjectId !== "" && 
      vertexProjectId !== '""' && 
      vertexProjectId !== "''";

    if (hasVertexCreds && hasVertexProject) {
      console.log("[IA_INTEGRATION] Inicializando en modo Vertex AI (Google Cloud)...");
      try {
        const credentials = JSON.parse(vertexCredentialsJson);
        ai = new GoogleGenAI({
          vertexai: true,
          project: vertexProjectId,
          location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
          googleAuthOptions: {
            credentials,
          },
        });
      } catch (parseErr: any) {
        console.error("[IA_INTEGRATION] Error parseando GOOGLE_APPLICATION_CREDENTIALS_JSON:", parseErr);
        return NextResponse.json(
          { error: "Error al configurar Vertex AI. El JSON de las credenciales de Google Cloud no es válido." },
          { status: 500 }
        );
      }
    } else if (studioApiKey) {
      console.log("[IA_INTEGRATION] Inicializando en modo Google AI Studio...");
      ai = new GoogleGenAI({
        apiKey: studioApiKey,
      });
    } else {
      console.error("[IA_INTEGRATION] Error: No se configuró Vertex AI ni AI Studio en el entorno.");
      return NextResponse.json(
        {
          error: "Falta configuración de IA en el servidor. Defina GOOGLE_STUDIO_API_KEY o las credenciales de Vertex AI (GOOGLE_APPLICATION_CREDENTIALS_JSON y GOOGLE_CLOUD_PROJECT_ID) en su archivo de entorno.",
        },
        { status: 500 }
      );
    }

    // Configuración del video y parámetros
    const isVeo31 = videoModel.includes("veo-3.1");
    const isVeo20 = videoModel.includes("veo-2.0");
    
    // Veo 2.0 con múltiples imágenes (reference_to_video) requiere obligatoriamente una duración de 8 segundos y formato 16:9 (horizontal).
    let targetDuration = validDuration;
    let targetAspectRatio = "9:16";
    
    if (isVeo20 && imagesList.length > 1) {
      console.log("[IA_INTEGRATION] Sobrescribiendo duración a 8s y aspect ratio a 16:9 por restricciones de Veo 2.0.");
      targetDuration = 8;
      targetAspectRatio = "16:9";
    }

    const videoConfig: any = {
      aspectRatio: targetAspectRatio,
      durationSeconds: targetDuration,
    };
    
    // Solo habilitar generación de audio si el modelo es Veo 3.1
    if (isVeo31) {
      videoConfig.generateAudio = true;
    }

    let veoParams: any = {
      model: videoModel,
      prompt: prompt,
      config: videoConfig,
    };

    // Procesar imágenes múltiples o única
    if (imagesList.length > 1) {
      console.log(`[IA_INTEGRATION] Procesando múltiples imágenes de referencia (${imagesList.length}).`);
      // Mapear hasta 4 imágenes a referenceImages
      videoConfig.referenceImages = imagesList.slice(0, 4).map((imgBase64, idx) => {
        const match = imgBase64.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = match ? match[1] : "image/jpeg";
        const base64Data = match ? match[2] : imgBase64;
        return {
          image: {
            imageBytes: base64Data,
            mimeType: mimeType,
          },
          // Usamos la cuarta imagen como STYLE y las primeras 3 como ASSET
          referenceType: idx === 3 ? "STYLE" : "ASSET",
        };
      });
    } else {
      console.log("[IA_INTEGRATION] Procesando una única imagen de referencia.");
      veoParams.image = {
        imageBytes: firstImgData,
        mimeType: firstImgMime,
      };
    }

    console.log(`[IA_INTEGRATION] Iniciando generación de video con modelo: ${videoModel} y duración: ${validDuration}s`);
    
    // 1. Iniciar la generación del video con Veo
    let videoOp;
    try {
      videoOp = await ai.models.generateVideos(veoParams);
    } catch (veoErr: any) {
      console.error("[IA_INTEGRATION] Error en llamada inicial a la API de Veo:", veoErr);
      return NextResponse.json(
        { error: `Error al iniciar la generación de video en el proveedor seleccionado: ${veoErr.message || veoErr}` },
        { status: 500 }
      );
    }

    console.log(`[IA_INTEGRATION] Iniciando generación de copys con modelo: ${copyModel}`);
    
    // 2. Llamar a Gemini para generar las 3 propuestas de copys en paralelo
    const copyPromise = ai.models.generateContent({
      model: copyModel,
      contents: [
        {
          inlineData: {
            data: firstImgData,
            mimeType: firstImgMime,
          },
        },
        "Genera exactamente 3 propuestas de descripción y hashtags virales para un post de Instagram Reels basándote en esta imagen. El tono debe ser muy persuasivo, moderno y enfocado en generar alto engagement. Retorna la respuesta estrictamente en un formato JSON que sea un array con 3 strings. Ejemplo: [\"propuesta 1...\", \"propuesta 2...\", \"propuesta 3...\"]. No agregues markdown ni bloques de código extra.",
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
          description: "3 propuestas de descripciones para Instagram Reels con hashtags.",
        },
      },
    });

    // 3. Polling de la operación de Veo para esperar a que termine
    let secondsElapsed = 0;
    const pollingInterval = 5000; // 5 segundos
    const maxTimeout = 180000; // 3 minutos máximo

    try {
      while (!videoOp.done) {
        if (secondsElapsed >= maxTimeout) {
          throw new Error("La generación de video superó el tiempo límite de espera de 3 minutos.");
        }
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        secondsElapsed += pollingInterval;
        console.log(`[IA_INTEGRATION] Esperando video... (${secondsElapsed / 1000}s transcurridos)`);
        videoOp = await ai.operations.getVideosOperation({ operation: videoOp });
      }
    } catch (pollErr: any) {
      console.error("[IA_INTEGRATION] Error durante el polling del video:", pollErr);
      return NextResponse.json(
        { error: `Error durante el procesamiento del video en la nube: ${pollErr.message || pollErr}` },
        { status: 500 }
      );
    }

    if (videoOp.error) {
      console.error("[IA_INTEGRATION] Error reportado por el servicio de video:", videoOp.error);
      return NextResponse.json(
        { error: `La generación de video falló en el proveedor: ${videoOp.error.message || JSON.stringify(videoOp.error)}` },
        { status: 500 }
      );
    }

    console.log("[IA_INTEGRATION] videoOp.response:", JSON.stringify(videoOp.response, null, 2));

    const videoObj = videoOp.response?.generatedVideos?.[0]?.video;
    let videoUrl = "";

    if (videoObj?.videoBytes) {
      console.log("[IA_INTEGRATION] Video recibido en formato bytes (Base64).");
      const mime = videoObj.mimeType || "video/mp4";
      videoUrl = `data:${mime};base64,${videoObj.videoBytes}`;
    } else if (videoObj?.uri) {
      console.log("[IA_INTEGRATION] Video recibido como URI:", videoObj.uri);
      videoUrl = videoObj.uri;
    }

    if (!videoUrl) {
      return NextResponse.json(
        { 
          error: "No se recibió la URL ni los bytes del video de salida tras completarse la operación.",
          debugResponse: videoOp.response
        },
        { status: 500 }
      );
    }

    // Esperar la respuesta de Gemini y parsear los copys
    let captions: string[] = [];
    try {
      const copyResponse = await copyPromise;
      captions = JSON.parse(copyResponse.text || "[]");
    } catch (e: any) {
      console.error("[IA_INTEGRATION] Error parseando JSON de copys de Gemini:", e);
      captions = [
        "¡Mira este increíble video generado por IA! 🚀✨ #AIReels #Veo3",
        "Animando mis imágenes con el modelo Veo 3.1 de Google. 🎥🔥 #InteligenciaArtificial #VideoGeneration",
        "El futuro del contenido ya está aquí. ¿Qué te parece esta animación? 👇 #Innovation #CreativeAI"
      ];
    }

    // =========================================================================
    // FASE 2 - REGISTRO EN BASE DE DATOS (PRISMA):
    // ... (notas de base de datos)
    // =========================================================================

    return NextResponse.json({
      success: true,
      videoUrl,
      captions,
    });
  } catch (error: any) {
    console.error("[GLOBAL_ROUTE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Ocurrió un error interno e inesperado al procesar la solicitud." },
      { status: 500 }
    );
  }
}
