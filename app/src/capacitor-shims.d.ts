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
