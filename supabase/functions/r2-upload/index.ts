// ==============================================================================
// SUPABASE EDGE FUNCTION: r2-upload
// ==============================================================================
// Processa uploads otimizados diretamente para o Cloudflare R2 (S3 API)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID") || "";
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID") || "";
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY") || "";
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET") || "cardapio-images";
    const publicUrlBase = (Deno.env.get("CLOUDFLARE_R2_PUBLIC_URL") || "").replace(/\/+$/, "");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileName = (formData.get("fileName") as string) || `uploads/${Date.now()}-${file.name || "image.webp"}`;

    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo não enviado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (accountId && accessKeyId && secretAccessKey) {
      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const buffer = new Uint8Array(await file.arrayBuffer());

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: file.type || "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      const publicUrl = publicUrlBase
        ? `${publicUrlBase}/${fileName}`
        : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`;

      return new Response(
        JSON.stringify({ success: true, url: publicUrl, key: fileName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Credenciais do Cloudflare R2 não configuradas nos secrets do Supabase" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
