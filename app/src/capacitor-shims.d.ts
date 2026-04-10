// Type stubs for Capacitor native plugins that may not be installed on web-only builds (Vercel)
declare module '@capacitor/browser' {
  export const Browser: {
    open(options: { url: string }): Promise<void>
    close(): Promise<void>
  }
}

declare module '@capacitor/app' {
  export const App: {
    addListener(event: string, callback: (data: { url: string }) => void): Promise<{ remove: () => void }>
  }
}
