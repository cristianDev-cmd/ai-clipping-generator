/**
 * Módulo de Utilidades de Almacenamiento
 * Permite subir archivos a Supabase Storage usando fetch y la API REST nativa.
 * De esta forma evitamos instalar la biblioteca pesada @supabase/supabase-js.
 */

/**
 * Sube un recurso (Buffer, Base64 o URL remota) a un bucket de Supabase Storage.
 * 
 * @param {string} source - Base64 limpio/dataURL o una URL HTTP del archivo.
 * @param {string} mimeType - El tipo MIME (ej: image/png, video/mp4).
 * @param {string} pathName - El nombre de destino dentro del bucket (ej: "creations/uuid.mp4").
 * @returns {Promise<string|null>} - La URL pública del archivo subido o null si no está configurado.
 */
export async function uploadMediaToSupabase(source, mimeType, pathName) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[STORAGE_UTIL] Supabase no está configurado en las variables de entorno. Se omitirá la persistencia de archivos.");
    return null;
  }

  try {
    let buffer;
    if (source.startsWith("data:") || !source.startsWith("http")) {
      // Es una dataURI o string base64 directo
      const base64Clean = source.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Clean, "base64");
    } else {
      // Es una URL HTTP remota, la descargamos
      console.log(`[STORAGE_UTIL] Descargando recurso remoto para subirlo a Supabase: ${source}`);
      const res = await fetch(source);
      if (!res.ok) {
        throw new Error(`No se pudo descargar el archivo remoto en ${source}. Status: ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const bucket = "reels-assets";
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${pathName}`;

    console.log(`[STORAGE_UTIL] Subiendo archivo a Supabase Storage: ${pathName} (${buffer.length} bytes)...`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": mimeType,
        "x-upsert": "true", // Reemplazar si el archivo ya existe
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en la subida a Supabase. Status: ${response.status}. Detalle: ${errorText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${pathName}`;
    console.log(`[STORAGE_UTIL] Archivo subido con éxito. URL pública: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[STORAGE_UTIL] Fallo crítico durante la subida a Supabase Storage:", error);
    throw error;
  }
}
