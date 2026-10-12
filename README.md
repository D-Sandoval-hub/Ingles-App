# Inglés 30 días — Fase 1 (MVP)

PWA para aprender inglés desde el celular (Android + Chrome), **sin conexión y sin costo**:
no hay servidor ni API de pago; los datos viven en el teléfono (IndexedDB).

## Qué incluye (Fase 1)
- **Test diagnóstico** (~40 min) y **re-evaluaciones** (días 7, 14, 21, 30; luego cada 14):
  vocabulario sí/no con pseudopalabras, gramática, lectura, listening (voz sintética), dictado,
  lectura en voz alta (reconocimiento de voz, aproximado), expresión oral y escritura (autoevaluación con rúbrica).
- **Plan diario** con la estructura pedida: día completo (~4,25 h activas + 3,5 h de input),
  día liviano cada 7 días, **día mínimo** de 2 h, reparto adaptativo (±20 % hacia la habilidad atrasada),
  re-evaluaciones que quedan pendientes si se pierden, y contenido que avanza por días estudiados (no por calendario).
- **Repetición espaciada FSRS** (`ts-fsrs`) con las 1.000 palabras más frecuentes de la NGSL 1.2, traducción, ejemplo y audio.
- **Panel**: racha, horas activas e input por separado, palabras dominadas, puntaje por habilidad, errores recurrentes,
  alertas de días bajo el mínimo y de sobrecarga.
- **Práctica libre** de 5/10/15 min, bloques con temporizador 50/10 (Wake Lock), registro de input,
  detector de errores típicos de hispanohablantes, prompts para usar un chat de IA gratuito como tutor,
  respaldo/restauración en JSON.

## Requisitos
- Node.js **22.12+** (probado con 22.22.0), npm 10.

## Comandos
```bash
npm ci                 # instalar dependencias exactas
npm run dev            # desarrollo: http://localhost:5173
npm run typecheck      # TypeScript estricto
npm run lint           # ESLint (typescript-eslint strictTypeChecked + reglas de React)
npm test               # Vitest (lógica, contenido, base de datos local)
npm run build          # build de producción en dist/
npm run e2e            # Playwright (emula un Pixel 7; usa `npm run preview`, requiere build previo)
npm run check          # todo lo anterior en orden
```
En otro equipo, para Playwright: `PW_CHROMIUM_PATH= npx playwright install chromium` y luego `PW_CHROMIUM_PATH= npm run e2e`.

Regenerar contenido: `node scripts/build-vocab.mjs` (vocabulario) y `node scripts/gen-icons.mjs` (íconos).

## Probarlo en el celular
La app debe servirse por HTTPS para instalarse. Opción gratuita: **GitHub Pages** (repositorio público;
para repos privados GitHub Pages requiere plan de pago). El workflow `.github/workflows/deploy.yml`
publica en cada push a `main` (activar Settings → Pages → Source: GitHub Actions).
Luego, en Chrome Android: menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.

## Seguridad y privacidad
- Sin secretos ni API keys (no hay backend). CSP estricta en producción (`script-src 'self'`).
- Entradas validadas: respaldo importado con Zod (tamaño y forma), números de formularios acotados.
- El reconocimiento de voz de Chrome envía el audio a servidores de Google.
- Los datos están en el teléfono sin cifrar: cualquiera con el teléfono desbloqueado puede verlos.
- Si se borran los datos del navegador se pierden: **descarga un respaldo cada semana**.

## Licencias de contenido
- NGSL 1.2 © Browne, Culligan & Phillips — CC BY-SA 4.0 (`content-src/ngsl_1.2_stats.csv`).
- Traducciones, ejemplos e ítems de evaluación: escritos para esta app, **pendientes de verificación**.
