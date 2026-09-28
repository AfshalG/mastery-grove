import { describe, expect, it } from 'vitest';
import { pickAudioType } from './voiceNote';

describe('pickAudioType', () => {
  it('prefers WebM/Opus, then whatever the browser can record', () => {
    expect(pickAudioType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickAudioType((t) => t === 'audio/mp4')).toBe('audio/mp4'); // Safari
    expect(pickAudioType(() => false)).toBeUndefined();
  });

  it('treats a browser that throws on the check as not supporting that type', () => {
    expect(
      pickAudioType((t) => {
        if (t.startsWith('audio/webm')) throw new Error('not implemented');
        return t === 'audio/ogg;codecs=opus';
      })
    ).toBe('audio/ogg;codecs=opus');
  });
});
