/**
 * Reconocimiento de voz con Web Speech API.
 * - Chrome para Android y escritorio: soportado (el audio se procesa normalmente en servidores de Google,
 *   así que suele requerir conexión).
 * - Firefox: no soportado. iOS: inestable.
 * La retroalimentación basada en esto es APROXIMADA: el reconocedor tiende a "corregir" hacia
 * palabras probables, así que no mide la pronunciación fonema por fonema.
 */

// Tipos mínimos: la API no está en lib.dom de TypeScript.
interface RecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface RecognitionResultList {
  readonly length: number;
  [index: number]: { readonly length: number; [index: number]: RecognitionAlternative; isFinal: boolean };
}
interface RecognitionEvent extends Event {
  results: RecognitionResultList;
}
interface RecognitionErrorEvent extends Event {
  error: string;
}
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return getCtor() !== null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'No hay permiso para usar el micrófono. Actívalo en la configuración del navegador (ícono del candado junto a la dirección).',
  'service-not-allowed': 'El navegador no permite el reconocimiento de voz aquí.',
  'no-speech': 'No se detectó voz. Habla más cerca del micrófono e inténtalo de nuevo.',
  'audio-capture': 'No se encontró un micrófono.',
  network: 'El reconocimiento de voz necesita conexión a internet en este dispositivo.',
  aborted: 'Grabación cancelada.',
};

export interface ListenHandle {
  result: Promise<{ transcript: string; confidence: number }>;
  stop: () => void;
}

/** Escucha una frase (o hasta `stop()` en modo continuo) y devuelve la transcripción. */
export function listen(opts: { lang?: string; continuous?: boolean } = {}): ListenHandle {
  const Ctor = getCtor();
  if (!Ctor) {
    return { result: Promise.reject(new Error('Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android o PC, o escribe tu respuesta.')), stop: () => undefined };
  }
  const rec = new Ctor();
  rec.lang = opts.lang ?? 'en-US';
  rec.continuous = opts.continuous ?? false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const parts: RecognitionAlternative[] = [];
  const result = new Promise<{ transcript: string; confidence: number }>((resolve, reject) => {
    let failed = false;
    rec.onresult = (e) => {
      parts.length = 0;
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i]?.[0];
        if (alt) parts.push(alt);
      }
    };
    rec.onerror = (e) => {
      failed = true;
      reject(new Error(ERROR_MESSAGES[e.error] ?? `Error de reconocimiento de voz (${e.error}).`));
    };
    rec.onend = () => {
      if (failed) return;
      const transcript = parts.map((p) => p.transcript.trim()).join(' ').trim();
      const confidence = parts.length > 0 ? parts.reduce((s, p) => s + p.confidence, 0) / parts.length : 0;
      resolve({ transcript, confidence });
    };
  });
  try {
    rec.start();
  } catch (err) {
    return { result: Promise.reject(err instanceof Error ? err : new Error('No se pudo iniciar el micrófono.')), stop: () => undefined };
  }
  return { result, stop: () => { rec.stop(); } };
}
