/**
 * Synthesizes a brief paper-card "flip" sound via the Web Audio API — no audio file ships, no
 * HTTP request, no copyright sourcing. The composite is:
 *
 * <ul>
 *   <li><b>Filtered noise sweep</b> — white noise → bandpass filter sweeping 2.5kHz → 700Hz
 *       over ~160ms. That falling whoosh is the air-resistance sound of a stiff piece of paper
 *       rotating; it's the "swipe" half of the flip.</li>
 *   <li><b>Tap click at the end</b> — a quick 180Hz sine pulse ~140ms in. Stands in for the
 *       cardboard-on-table tap when the flip settles.</li>
 * </ul>
 *
 * <p>The AudioContext is created lazily on first call — Safari requires it to originate in a
 * user gesture, which the card-flip onClick satisfies. We keep a single shared context across
 * calls; closing/reopening costs more than reusing.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function playCardFlipSound(): void {
  const audio = getContext();
  if (!audio) return;
  // iOS keeps the context suspended until a user gesture resumes it. Our caller is inside
  // an onClick handler so this resume completes synchronously enough.
  if (audio.state === "suspended") {
    void audio.resume();
  }

  const now = audio.currentTime;

  // Generate a short noise buffer once per call (small enough that allocation cost is
  // negligible vs. caching headache). 4096 samples ≈ 93ms at 44.1kHz.
  const sampleRate = audio.sampleRate;
  const bufferLength = Math.floor(sampleRate * 0.2);
  const noiseBuffer = audio.createBuffer(1, bufferLength, sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferLength; i++) {
    channel[i] = Math.random() * 2 - 1;
  }
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuffer;

  // Bandpass sweep down — high "swish" descending to mid "whoosh" mirrors a real card's flight.
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.8;
  filter.frequency.setValueAtTime(2500, now);
  filter.frequency.exponentialRampToValueAtTime(700, now + 0.16);

  const noiseGain = audio.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audio.destination);
  noise.start(now);
  noise.stop(now + 0.2);

  // Tap click — the "lands on the table" beat. Very brief sine at 180Hz.
  const tap = audio.createOscillator();
  tap.type = "sine";
  tap.frequency.value = 180;
  const tapGain = audio.createGain();
  tapGain.gain.setValueAtTime(0, now + 0.13);
  tapGain.gain.linearRampToValueAtTime(0.04, now + 0.14);
  tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  tap.connect(tapGain);
  tapGain.connect(audio.destination);
  tap.start(now + 0.13);
  tap.stop(now + 0.23);
}
