export interface Config<T> {
  get<K extends keyof T>(key: K): T[K];
}
