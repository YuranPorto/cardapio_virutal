/**
 * Serviço de Notificação Sonora utilizando a Web Audio API nativa do navegador.
 * Cria tons harmônicos de sino/alerta dinamicamente via sintetizador (Oscillator + Gain),
 * sem necessidade de download de arquivos MP3 externos ou uso de cache de mídia.
 */

const SOUND_PREF_KEY = 'cardapio_sound_alert_enabled';

class NotificationSoundService {
  constructor() {
    this.audioCtx = null;
  }

  /**
   * Inicializa ou recupera o AudioContext do navegador.
   * Lida com compatibilidade entre navegadores e políticas de autoplay.
   */
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Verifica se os alertas sonoros estão habilitados nas preferências do usuário.
   */
  isSoundEnabled() {
    const pref = localStorage.getItem(SOUND_PREF_KEY);
    return pref === null ? true : pref === 'true';
  }

  /**
   * Salva a preferência de som do usuário.
   */
  setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  }

  /**
   * Reproduz um acorde harmônico agradável e chamativo de "Novo Pedido" (estilo sino de cozinha).
   * Usa múltiplos osciladores para gerar riqueza tímbrica com decaimento suave (sem estalos).
   */
  playNewOrderAlert() {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Sequência melódica de 3 notas ascendentes: Dó5 (523Hz) -> Mi5 (659Hz) -> Sol5 (784Hz) -> Dó6 (1046Hz)
      const notes = [
        { freq: 523.25, time: 0.00, duration: 0.35, gain: 0.35 },
        { freq: 659.25, time: 0.12, duration: 0.35, gain: 0.40 },
        { freq: 783.99, time: 0.24, duration: 0.45, gain: 0.45 },
        { freq: 1046.50, time: 0.38, duration: 0.70, gain: 0.50 },
      ];

      notes.forEach(({ freq, time, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Senoide pura para clareza com harmônico suave
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Curva de ganho com ataque rápido e decaimento exponencial suave (efeito sino)
        const startTime = now + time;
        const endTime = startTime + duration;

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });

      // Segundo toque de confirmação após 0.7s (duplo ding característico de apps de delivery)
      const secondPulseTime = now + 0.75;
      const pulseNotes = [
        { freq: 880.00, time: 0.00, duration: 0.40, gain: 0.35 }, // Lá5
        { freq: 1174.66, time: 0.12, duration: 0.80, gain: 0.55 }, // Ré6
      ];

      pulseNotes.forEach(({ freq, time, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle'; // Leve brilho a mais no sino final
        osc.frequency.setValueAtTime(freq, secondPulseTime + time);

        const startTime = secondPulseTime + time;
        const endTime = startTime + duration;

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch (err) {
      console.warn('Não foi possível reproduzir som via Web Audio API:', err);
    }
  }

  /**
   * Som de teste rápido (1 bip de confirmação).
   */
  testAlert() {
    this.playNewOrderAlert();
  }
}

export const notificationSoundService = new NotificationSoundService();
