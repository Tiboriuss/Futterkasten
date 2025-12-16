"use client"

import { useState, useEffect } from "react"

/**
 * Detects the base path for Home Assistant Ingress
 * Returns the ingress path prefix if running under HA Ingress, empty string otherwise
 */
export function useBasePath(): string {
  const [basePath, setBasePath] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      // Check if we're running under HA Ingress
      // Pattern: /api/hassio_ingress/{token}/...
      const match = path.match(/^(\/api\/hassio_ingress\/[^/]+)/)
      return match ? match[1] : ""
    }
    return ""
  })
  
  useEffect(() => {
    // Keep the effect for updates if needed, though usually path prefix is static per session
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      const match = path.match(/^(\/api\/hassio_ingress\/[^/]+)/)
      const newPath = match ? match[1] : ""
      if (newPath !== basePath) {
        setBasePath(newPath)
      }
    }
  }, [basePath])
  
  return basePath
}

/**
 * Creates a full path with the ingress prefix
 */
export function useIngressPath(path: string): string {
  const basePath = useBasePath()
  return `${basePath}${path}`
}
