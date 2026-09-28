// Voice notes for Mia, with the browser's own MediaRecorder (no library). Chrome, Edge and Firefox record
// WebM/Opus and Safari records MP4/AAC; Gemini accepts both, so the audio goes up as it is.

/** Longest voice note, so a forgotten recording never runs on. */
export const MAX_VOICE_SECONDS = 30;

const PREFERRED = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** The first recording format this browser supports, or undefined to let it choose. */
export function pickAudioType(isSupported: (type: string) => boolean): string | undefined {
  return PREFERRED.find((t) => {
    try {
      return isSupported(t);
    } catch {
      return false;
    }
  });
}

export function canRecordVoice() {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export interface VoiceNote {
  base64: string;
  mimeType: string;
}

export interface Recording {
  /** Stops and hands back the note (null if nothing was recorded). */
  finish: () => Promise<VoiceNote | null>;
  /** Stops and throws the note away. */
  cancel: () => void;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the recording.'));
    reader.readAsDataURL(blob);
  });
}

/** Asks for the microphone and starts recording. Throws if the kid (or the browser) says no. */
export async function startVoiceNote(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioType((t) => MediaRecorder.isTypeSupported(t));
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  const release = () => stream.getTracks().forEach((t) => t.stop());
  recorder.start();

  return {
    async finish() {
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      release();
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      if (blob.size === 0) return null;
      return { base64: await toBase64(blob), mimeType: blob.type };
    },
    cancel() {
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}
