import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Serviço de Armazenamento Cloudflare R2
 * - Armazena imagens otimizadas em WebP com zero custo de saída (zero egress)
 * - Suporta upload via Edge Function, Worker dedicado ou Presigned URL
 * - Fallback inteligente para Supabase Storage caso o R2 ainda não tenha sido configurado
 */
export const r2StorageService = {
  // URLs configuráveis via variáveis de ambiente (.env)
  defaultPublicUrl: import.meta.env.VITE_R2_PUBLIC_URL || '',
  defaultUploadEndpoint: import.meta.env.VITE_R2_UPLOAD_ENDPOINT || '',

  /**
   * Envia o arquivo WebP comprimido para o Cloudflare R2
   * @param {File} compressedFile Arquivo .webp já otimizado
   * @param {string} folder Pasta/Prefixo (ex: 'dishes', 'branding')
   * @param {Object} restaurantConfig Configurações do restaurante (opcional)
   * @returns {Promise<string>} URL pública final da imagem
   */
  async uploadToR2(compressedFile, folder = 'dishes', restaurantConfig = null) {
    if (!compressedFile) return null;

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
    const r2PublicDomain = restaurantConfig?.r2_public_domain || this.defaultPublicUrl;
    const r2UploadEndpoint = restaurantConfig?.r2_upload_endpoint || this.defaultUploadEndpoint;

    // 1. Tentar upload via Cloudflare Worker dedicado (caso configurado)
    if (r2UploadEndpoint) {
      try {
        console.log(`[Cloudflare R2] Enviando arquivo ${fileName} para Worker dedicado...`);
        const formData = new FormData();
        formData.append('file', compressedFile, fileName);
        formData.append('key', fileName);

        const res = await fetch(r2UploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const finalUrl = data.url || `${r2PublicDomain.replace(/\/+$/, '')}/${fileName}`;
          console.log('[Cloudflare R2] Upload concluído com sucesso via Worker:', finalUrl);
          return finalUrl;
        }
      } catch (err) {
        console.warn('[Cloudflare R2] Falha no upload via Worker, tentando Edge Function:', err);
      }
    }

    // 2. Tentar upload via Supabase Edge Function (r2-upload)
    if (isSupabaseConfigured) {
      try {
        console.log(`[Cloudflare R2] Enviando para Edge Function r2-upload...`);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('fileName', fileName);

        const { data, error } = await supabase.functions.invoke('r2-upload', {
          body: formData,
        });

        if (!error && data?.url) {
          console.log('[Cloudflare R2] Upload concluído via Edge Function:', data.url);
          return data.url;
        }
      } catch (err) {
        console.warn('[Cloudflare R2] Edge function r2-upload indisponível, usando fallback:', err);
      }
    }

    // 3. Fallback: Supabase Storage padrão (se configurado)
    if (isSupabaseConfigured) {
      try {
        const bucket = folder === 'branding' ? 'restaurant-assets' : 'dishes-images';
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedFile, {
            contentType: 'image/webp',
            cacheControl: '31536000', // Cache longo para WebP otimizado
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          console.log('[Storage Fallback] Salvo no storage do Supabase em WebP:', publicUrl);
          return publicUrl;
        }
      } catch (err) {
        console.warn('[Storage Fallback] Erro no Supabase Storage:', err);
      }
    }

    // 4. Fallback Local / Dev: Data URL em Base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(compressedFile);
    });
  },
};
