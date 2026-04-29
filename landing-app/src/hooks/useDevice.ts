import { useMemo } from 'react'

export function useDevice() {
  return useMemo(() => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isMobile = isIOS || isAndroid
    return { isMobile, isIOS, isAndroid, isDesktop: !isMobile }
  }, [])
}
