import { registerSW } from 'virtual:pwa-register'

export function registerPWA() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    return
  }

  return registerSW({
    immediate: true,
    onRegisterError(error: unknown) {
      console.error('Failed to register Ranki service worker.', error)
    },
  })
}
