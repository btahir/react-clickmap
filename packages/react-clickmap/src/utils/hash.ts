export function hashString(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function shouldSampleSession(sessionId: string, sampleRate: number): boolean {
  if (sampleRate <= 0) {
    return false;
  }

  if (sampleRate >= 1) {
    return true;
  }

  const hash = hashString(sessionId);
  return hash / 0xffffffff <= sampleRate;
}
