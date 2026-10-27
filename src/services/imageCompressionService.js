import imageCompression from 'browser-image-compression';

/**
 * Serviço de Compressão de Imagens no Navegador
 * - Reduz a largura/altura máxima para 800px
 * - Converte automaticamente para .webp
 * - Comprime a qualidade para 75%–80% (0.8)
 * - Processa em segundo plano via Web Worker sem travar a interface
 * - Transforma fotos pesadas (ex: 6 MB) em arquivos leves (~60-80 KB)
 */
export const imageCompressionService = {
  defaultOptions: {
    maxSizeMB: 0.15, // Meta máxima de ~150 KB (tipicamente gera entre 50 KB e 80 KB)
    maxWidthOrHeight: 800, // Limite máximo de 800px de largura/altura
    useWebWorker: true, // Processamento assíncrono em Web Worker
    fileType: 'image/webp', // Conversão automática para formato moderno WebP
    initialQuality: 0.8, // Qualidade entre 75% e 80%
  },

  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  /**
   * Comprime um arquivo de imagem recebido do <input type="file">
   * @param {File} file Arquivo original selecionado pelo usuário
   * @param {Object} customOptions Opções customizadas (opcional)
   * @returns {Promise<{
   *   file: File,
   *   originalSize: number,
   *   compressedSize: number,
   *   originalFormatted: string,
   *   compressedFormatted: string,
   *   savedPercentage: number,
   *   previewUrl: string
   * }>}
   */
  async compressImage(file, customOptions = {}) {
    if (!file) return null;

    // Se já não for imagem (ex: svg ou pdf), retorna o arquivo original
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        originalFormatted: this.formatBytes(file.size),
        compressedFormatted: this.formatBytes(file.size),
        savedPercentage: 0,
        previewUrl: URL.createObjectURL(file),
      };
    }

    const options = {
      ...this.defaultOptions,
      ...customOptions,
    };

    const startTime = performance.now();
    const originalSize = file.size;

    try {
      console.log(`[Otimizador R2] Iniciando compressão de "${file.name}" (${this.formatBytes(originalSize)})...`);

      // Executa a compressão no navegador
      const compressedBlob = await imageCompression(file, options);

      // Garante que o arquivo de saída possua a extensão e mime .webp
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const webpFileName = `${baseName}.webp`;
      const compressedFile = new File([compressedBlob], webpFileName, {
        type: 'image/webp',
        lastModified: Date.now(),
      });

      const compressedSize = compressedFile.size;
      const durationMs = Math.round(performance.now() - startTime);
      const savedPercentage = originalSize > 0 
        ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
        : 0;

      console.log(
        `[Otimizador R2] Concluído em ${durationMs}ms: ` +
        `${this.formatBytes(originalSize)} ➔ ${this.formatBytes(compressedSize)} ` +
        `(-${savedPercentage}% economia) | Formato: .webp (máx 800px)`
      );

      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        originalFormatted: this.formatBytes(originalSize),
        compressedFormatted: this.formatBytes(compressedSize),
        savedPercentage,
        durationMs,
        previewUrl: URL.createObjectURL(compressedFile),
      };
    } catch (error) {
      console.warn('[Otimizador R2] Falha na compressão, usando arquivo original:', error);
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        originalFormatted: this.formatBytes(originalSize),
        compressedFormatted: this.formatBytes(originalSize),
        savedPercentage: 0,
        previewUrl: URL.createObjectURL(file),
      };
    }
  },
};
