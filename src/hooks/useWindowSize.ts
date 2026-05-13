import { useState, useEffect } from 'react'

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide'

export function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const size: ScreenSize =
    width < 640  ? 'mobile'  :
    width < 1024 ? 'tablet'  :
    width < 1440 ? 'desktop' : 'wide'

  const isMobile  = size === 'mobile'
  const isTablet  = size === 'tablet'
  const isDesktop = size === 'desktop' || size === 'wide'
  const isWide    = size === 'wide'

  return { width, size, isMobile, isTablet, isDesktop, isWide }
}
