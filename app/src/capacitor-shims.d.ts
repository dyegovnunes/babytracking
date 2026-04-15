// Injected pelo Vite via `define` em vite.config.ts — lê a versão do package.json
// em tempo de build pra SettingsPage mostrar a versão atualizada sem hardcode.
declare const __APP_VERSION__: string

// Type stubs for Capacitor native plugins that may not be installed on web-only builds (Vercel)
declare module '@capacitor/browser' {
  export const Browser: {
    open(options: { url: string }): Promise<void>
    close(): Promise<void>
    addListener(event: string, callback: (data?: any) => void): Promise<{ remove: () => void }>
  }
}

declare module '@capacitor/app' {
  export const App: {
    addListener(event: string, callback: (data: { url: string }) => void): Promise<{ remove: () => void }>
  }
}

declare module '@capacitor/share' {
  export const Share: {
    share(options: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<{ activityType?: string }>
  }
}

declare module '@capacitor/filesystem' {
  export enum Directory {
    Documents = 'DOCUMENTS',
    Data = 'DATA',
    Library = 'LIBRARY',
    Cache = 'CACHE',
    External = 'EXTERNAL',
    ExternalStorage = 'EXTERNAL_STORAGE',
  }
  export const Filesystem: {
    writeFile(options: { path: string; data: string; directory: Directory; recursive?: boolean }): Promise<{ uri: string }>
    readFile(options: { path: string; directory: Directory }): Promise<{ data: string }>
    deleteFile(options: { path: string; directory: Directory }): Promise<void>
  }
}

declare module '@capacitor/push-notifications' {
  export interface Token { value: string }
  export interface ActionPerformed { notification: { data: Record<string, any> } }
  export const PushNotifications: {
    checkPermissions(): Promise<{ receive: string }>
    requestPermissions(): Promise<{ receive: string }>
    register(): Promise<void>
    addListener(event: string, callback: (data: any) => void): Promise<{ remove: () => void }>
  }
}
