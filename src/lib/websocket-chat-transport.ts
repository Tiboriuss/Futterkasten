"use client"

import { DefaultChatTransport } from 'ai'
import { createWebSocketFetch } from './websocket-fetch'

// Custom Chat Transport that uses WebSocket instead of HTTP
// This bypasses HA Core's compression which breaks SSE streaming

let patchApplied = false
let currentWsEndpoint: string | null = null

export function applyWebSocketFetchPatch(wsEndpoint: string) {
  if (patchApplied && currentWsEndpoint === wsEndpoint) {
    return // Already patched with same endpoint
  }
  
  console.log('[WS Transport] Applying fetch patch for:', wsEndpoint)
  
  const wsFetch = createWebSocketFetch(wsEndpoint)
  const originalFetch = globalThis.fetch.bind(globalThis)
  
  // Create a patched fetch that intercepts chat API calls
  const patchedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
    
    // Only intercept POST requests to the chat API (but not /api/chat/ws)
    if (url.includes('/api/chat') && !url.includes('/api/chat/ws') && init?.method === 'POST') {
      console.log('[WS Transport] Intercepting chat request:', url)
      return wsFetch(input, init)
    }
    
    return originalFetch(input, init)
  }
  
  globalThis.fetch = patchedFetch
  patchApplied = true
  currentWsEndpoint = wsEndpoint
}

export function createWebSocketChatTransport(options: { api: string; wsEndpoint: string }) {
  // Apply the patch before creating transport
  applyWebSocketFetchPatch(options.wsEndpoint)
  
  return new DefaultChatTransport({
    api: options.api,
  })
}
