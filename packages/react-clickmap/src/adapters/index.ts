import type { ClickmapAdapter } from '../types';

export function createAdapter(adapter: ClickmapAdapter): ClickmapAdapter {
  return adapter;
}

export { fetchAdapter } from './fetch-adapter';
export { localStorageAdapter } from './local-storage-adapter';
export { memoryAdapter } from './memory-adapter';
