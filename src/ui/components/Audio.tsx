import { useState } from 'react';
import { speak, stopSpeaking, ttsSupported } from '../../speech/tts';
import { listen, sttSupported, type ListenHandle } from '../../speech/stt';
import { IconMic, IconSpeaker } from './Icons';

export function SpeakButton({ text, rate = 0.9, label = 'Escuchar', small = true }: { text: string; rate?: number; label?: string; small?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  if (!ttsSupported()) return <span className="small">Audio no disponible en este navegador.</span>;
  return (
    <span>
      <button
        type="button"
        className={`btn ${small ? 'small' : ''}`}
        onClick={() => {
          setError(null);
          speak(text, { rate }).catch((e: unknown) => {
            setError(e instanceof Error ? e.message : 'No se pudo reproducir el audio.');
          });
        }}
        aria-label={`${label}: ${text}`}
      >
        <IconSpeaker /> {label}
      </button>
      {error && <span className="small" role="alert"> {error}</span>}
    </span>
  );
}

export function SpeedControl({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  return (
    <div className="row">
      <span className="small">Velocidad:</span>
      {[0.7, 0.85, 1, 1.15].map((r) => (
        <button key={r} type="button" className={`btn small ${Math.abs(rate - r) < 0.01 ? 'primary' : ''}`} onClick={() => { onChange(r); }}>
          {r === 1 ? 'normal' : `${r}×`}
        </button>
      ))}
    </div>
  );
}

export { stopSpeaking };

/** Botón de micrófono: graba una frase y entrega la transcripción. */
export function MicButton({ onResult, continuous = false, label = 'Hablar' }: { onResult: (transcript: string, confidence: number) => void; continuous?: boolean; label?: string }) {
  const [handle, setHandle] = useState<ListenHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!sttSupported()) {
    return <p className="small">Reconocimiento de voz no disponible en este navegador (usa Chrome en Android o PC). Puedes escribir tu respuesta.</p>;
  }
  const start = () => {
    setError(null);
    const h = listen({ continuous });
    setHandle(h);
    h.result
      .then((r) => {
        onResult(r.transcript, r.confidence);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error del micrófono.');
      })
      .finally(() => {
        setHandle(null);
      });
  };
  return (
    <div className="stack">
      {handle ? (
        <button type="button" className="btn primary" onClick={() => { handle.stop(); }}>
          <IconMic /> Escuchando… toca para terminar
        </button>
      ) : (
        <button type="button" className="btn" onClick={start}>
          <IconMic /> {label}
        </button>
      )}
      {error && <div className="alert bad small" role="alert">{error}</div>}
    </div>
  );
}
