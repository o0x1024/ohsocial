/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface OhSocialAPI {
  getAppInfo: () => Promise<{ name: string; version: string }>
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ohsocial: OhSocialAPI
  }
}

export {}
