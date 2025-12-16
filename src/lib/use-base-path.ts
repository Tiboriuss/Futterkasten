"use client"

import { useState, useEffect } from "react"

/**
 * Detects the base path for Home Assistant Ingress
 * Returns the ingress path prefix if running under HA Ingress, empty string otherwise
 */
export function useBasePath(): string {
  const [basePath, setBasePath] = useState("")
  
  useEffect(() => {
    const path = window.location.pathname
    // Check if we're running under HA Ingress
    // Pattern: /api/hassio_ingress/{token}/...
    const match = path.match(/^(\/api\/hassio_ingress\/[^/]+)/)
    if (match) {
      setBasePath(match[1])
    }
  }, [])
  
  return basePath
}

/**
 * Creates a full path with the ingress prefix
 */
export function useIngressPath(path: string): string {
  const basePath = useBasePath()
  return `${basePath}${path}`
}
