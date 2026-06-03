import type { ConfigStorageAdapter } from "./configStore";

export interface ElectronStoreLike {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

export function createElectronStoreAdapter(store: ElectronStoreLike): ConfigStorageAdapter {
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    delete: (key) => store.delete(key)
  };
}
