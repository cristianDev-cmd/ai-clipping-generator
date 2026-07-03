

import { NextRequest, NextResponse } from "next/server";
class GoogleGenAI {
  private isVertex: boolean = false;
  private apiKey?: string;
  private projectId?: string;
  private location?: string;
  private credentials?: any;
  private cachedToken?: string;
  private tokenExpiry?: number;

  constructor(options: {
    apiKey?: string;
    vertexai?: boolean;
    project?: string;
    location?: string;
    googleAuthOptions?: { credentials?: any };
  }) {
    if (options.vertexai) {
      this.isVertex = true;
      this.projectId = options.project;
      this.location = options.location || "us-central1";
      this.credentials = options.googleAuthOptions?.credentials;
    } else {
      this.apiKey = options.apiKey;
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.isVertex) return "";
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.tokenExpiry && now < this.tokenExpiry - 60) {
      return this.cachedToken;
    }
    
    const pem = this.credentials.private_key;
    const pemContents = pem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s+/g, "");
    
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
    
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: this.credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };
    
    const base64UrlEncode = (obj: any) => {
      const str = JSON.stringify(obj);
      const base64 = btoa(str);
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    };
    
    const tokenParts = [base64UrlEncode(header), base64UrlEncode(payload)];
    const stringToSign = tokenParts.join(".");
    
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      encoder.encode(stringToSign)
    );
    
    const signatureArray = new Uint8Array(signatureBuffer);
    let signatureString = "";
    for (let i = 0; i < signatureArray.length; i++) {
      signatureString += String.fromCharCode(signatureArray[i]);
    }
    const signatureBase64Url = btoa(signatureString)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    
    const signedJwt = `${stringToSign}.${signatureBase64Url}`;
    
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
    });
    
    if (!tokenRes.ok) {
      throw new Error(`Failed to get OAuth token: ${await tokenRes.text()}`);
    }
    
    const tokenData = await tokenRes.json();
    this.cachedToken = tokenData.access_token;
    this.tokenExpiry = now + 3600;
    return this.cachedToken!;
  }

  get models() {
    return {
      generateVideos: async (params: any) => {
        const { model, prompt, config, image } = params;
        
        if (this.isVertex) {
          const token = await this.getAccessToken();
          const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:predictLongRunning`;
          
          const instances = [];
          const instance: any = { prompt };
          
          if (image) {
            instance.image = {
              bytesBase64Encoded: image.imageBytes,
              mimeType: image.mimeType,
            };
          }
          
          if (config?.referenceImages) {
            instance.referenceImages = config.referenceImages.map((ref: any) => ({
              image: {
                bytesBase64Encoded: ref.image.imageBytes,
                mimeType: ref.image.mimeType,
              },
              referenceType: ref.referenceType,
            }));
          }
          
          instances.push(instance);
          
          const parameters: any = {
            aspectRatio: config?.aspectRatio || "9:16",
            durationSeconds: config?.durationSeconds || 5,
          };
          
          if (config?.generateAudio !== undefined) {
            parameters.generateAudio = config.generateAudio;
          }
          
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ instances, parameters }),
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Vertex AI error: ${errText}`);
          }
          
          const data = await response.json();
          return {
            name: data.name,
            done: data.done || false,
            response: data.response,
            error: data.error,
          };
        } else {
          // Google AI Studio
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateVideos?key=${this.apiKey}`;
          
          const body: any = {
            prompt,
            config: {
              aspectRatio: config?.aspectRatio || "9:16",
              durationSeconds: config?.durationSeconds || 5,
            }
          };
          
          if (image) {
            body.image = {
              imageBytes: image.imageBytes,
              mimeType: image.mimeType,
            };
          }
          
          if (config?.referenceImages) {
            body.config.referenceImages = config.referenceImages;
          }
          
          if (config?.generateAudio !== undefined) {
            body.config.generateAudio = config.generateAudio;
          }
          
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google AI Studio error: ${errText}`);
          }
          
          const data = await response.json();
          return {
            name: data.name,
            done: data.done || false,
            response: data.response,
            error: data.error,
          };
        }
      },

      generateContent: async (params: any) => {
        const { model, contents, config } = params;
        
        if (this.isVertex) {
          const token = await this.getAccessToken();
          const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;
          
          const body: any = {
            contents: contents.map((item: any) => {
              if (typeof item === "string") {
                return { parts: [{ text: item }] };
              }
              if (item.inlineData) {
                return { parts: [{ inlineData: item.inlineData }] };
              }
              return item;
            }),
          };
          
          if (config) {
            body.generationConfig = {};
            if (config.responseMimeType) {
              body.generationConfig.responseMimeType = config.responseMimeType;
            }
            if (config.responseSchema) {
              body.generationConfig.responseSchema = config.responseSchema;
            }
          }
          
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Vertex AI generateContent error: ${errText}`);
          }
          
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          return { text };
        } else {
          // Google AI Studio
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
          
          const body: any = {
            contents: contents.map((item: any) => {
              if (typeof item === "string") {
                return { parts: [{ text: item }] };
              }
              if (item.inlineData) {
                return { parts: [{ inlineData: item.inlineData }] };
              }
              return item;
            }),
          };
          
          if (config) {
            body.generationConfig = {};
            if (config.responseMimeType) {
              body.generationConfig.responseMimeType = config.responseMimeType;
            }
            if (config.responseSchema) {
              body.generationConfig.responseSchema = config.responseSchema;
            }
          }
          
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google AI Studio generateContent error: ${errText}`);
          }
          
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          return { text };
        }
      }
    };
  }

  get operations() {
    return {
      getVideosOperation: async (params: { operation: any }) => {
        const opName = params.operation.name;
        
        if (this.isVertex) {
          const token = await this.getAccessToken();
          const url = `https://${this.location}-aiplatform.googleapis.com/v1/${opName}`;
          
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Vertex AI operations error: ${errText}`);
          }
          
          const data = await response.json();
          return {
            name: data.name,
            done: data.done || false,
            response: data.response,
            error: data.error,
          };
        } else {
          // Google AI Studio
          const url = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${this.apiKey}`;
          
          const response = await fetch(url, {
            method: "GET",
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google AI Studio operations error: ${errText}`);
          }
          
          const data = await response.json();
          return {
            name: data.name,
            done: data.done || false,
            response: data.response,
            error: data.error,
          };
        }
      }
    };
  }
}
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMediaToSupabase } from "@/lib/storage";

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
    // FASE 2: Validación de Sesión y Descuento de Créditos (Prisma)
    // =========================================================================
    const session = await getServerSession(authOptions);
    let userId = "guest";
    let isUserLoggedIn = false;

    if (session?.user?.id) {
      userId = session.user.id;
      isUserLoggedIn = true;
      console.log(`[IA_INTEGRATION] Usuario autenticado detectado: ${userId}. Verificando créditos...`);
      
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!dbUser || dbUser.credits < 1) {
          return NextResponse.json(
            { error: "Créditos insuficientes. Por favor adquiere más créditos para continuar." },
            { status: 403 }
          );
        }
        
        // Descontar 1 crédito de forma preventiva
        await prisma.user.update({
          where: { id: userId },
          data: { credits: dbUser.credits - 1 }
        });
        console.log(`[IA_INTEGRATION] Crédito descontado correctamente. Créditos restantes: ${dbUser.credits - 1}`);
      } catch (dbErr) {
        console.error("[IA_INTEGRATION] Error interactuando con la base de datos (créditos):", dbErr);
        // Si hay una base de datos mal configurada localmente pero hay sesión,
        // permitimos seguir en la demo sin bloquear, pero logueando el error.
      }
    } else {
      console.log("[IA_INTEGRATION] Ejecutando en Modo Demo pública (sin inicio de sesión). Saltando validación de créditos.");
    }

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

    console.log(`[IA_INTEGRATION] Iniciando generación de video con modelo: ${videoModel} y duración: ${targetDuration}s`);
    
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
    // FASE 2: Persistencia a Supabase Storage y Registro en Base de Datos (Prisma)
    // =========================================================================
    if (isUserLoggedIn) {
      console.log(`[IA_INTEGRATION] Iniciando persistencia persistente para usuario: ${userId}`);
      try {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 1. Subir la imagen de referencia principal (o imágenes unidas) a Supabase Storage
        const publicImageUrls: string[] = [];
        for (let i = 0; i < imagesList.length; i++) {
          const mime = i === 3 ? "image/jpeg" : "image/jpeg"; // o inferir
          const uploadedImgUrl = await uploadMediaToSupabase(
            imagesList[i],
            mime,
            `creations/${userId}/${uniqueId}-ref-${i}.jpg`
          );
          if (uploadedImgUrl) publicImageUrls.push(uploadedImgUrl);
        }

        const finalImagesUrl = publicImageUrls.length > 0 ? publicImageUrls.join(",") : null;

        // 2. Subir el video generado (Base64 o URI remota) a Supabase Storage
        const videoMime = videoObj?.mimeType || "video/mp4";
        const publicVideoUrl = await uploadMediaToSupabase(
          videoUrl,
          videoMime,
          `creations/${userId}/${uniqueId}-result.mp4`
        );

        // 3. Crear el registro de creación en Prisma
        if (publicVideoUrl) {
          const creation = await prisma.creation.create({
            data: {
              userId: userId,
              type: "veo_video",
              resultUrl: publicVideoUrl,
              imageUrl: finalImagesUrl,
              prompt: prompt,
              captions: JSON.stringify(captions),
              aspectRatio: targetAspectRatio,
              status: "completed"
            }
          });
          console.log(`[IA_INTEGRATION] Creación guardada en Prisma con ID: ${creation.id}`);
        } else {
          console.warn("[IA_INTEGRATION] Supabase no devolvió URL de video. Saltando creación de fila en Prisma.");
        }
      } catch (saveErr) {
        console.error("[IA_INTEGRATION] Error durante la persistencia en Supabase / Prisma:", saveErr);
        // No arrojamos un error 500 al cliente si la IA ya funcionó correctamente,
        // para no frustrar la experiencia de usuario si el almacenamiento falla.
      }
    }

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
