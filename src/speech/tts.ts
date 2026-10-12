/**
 * Voz sintética con Web Speech API (speechSynthesis).
 * La calidad y las voces disponibles dependen del teléfono. En Android, las voces
 * sin conexión requieren haberlas descargado en Ajustes → Texto a voz (a verificar en tu equipo).
 */
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
  return exact.find((v) => v.localService) ?? exact[0] ?? voices.find((v) => v.lang.toLowerCase().startsWith('en'));
}

export function speak(text: string, opts: { rate?: number; lang?: string } = {}): Promise<void> {
  if (!ttsSupported()) return Promise.reject(new Error('Tu navegador no tiene voz sintética.'));
  const lang = opts.lang ?? 'en-US';
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = Math.min(1.5, Math.max(0.5, opts.rate ?? 0.9));
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.onend = () => {
      resolve();
    };
    u.onerror = (e) => {
      // "interrupted"/"canceled" ocurren al detener o repetir: no son errores para el usuario.
      if (e.error === 'interrupted' || e.error === 'canceled') resolve();
      else reject(new Error(`No se pudo reproducir el audio (${e.error}).`));
    };
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
