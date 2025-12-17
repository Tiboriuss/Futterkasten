"use client"

import { DefaultChatTransport } from 'ai'
import { createWebSocketFetch } from './websocket-fetch'

// Custom Chat Transport that uses WebSocket instead of HTTP
// This bypasses HA Core's compression which breaks SSE streaming

export function createWebSocketChatTransport(options: { api: string; wsEndpoint: string }) {
  const wsFetch = createWebSocketFetch(options.wsEndpoint)
  
  // Override global fetch for chat requests
  const originalFetch = globalThis.fetch
  
  // Create a patched fetch that intercepts chat API calls
  const patchedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    
    // Only intercept POST requests to the chat API
    if (url.includes('/api/chat') && init?.method === 'POST') {
      return wsFetch(input, init)
    }
    
    return originalFetch(input, init)
  }
  
  // Temporarily patch fetch
  globalThis.fetch = patchedFetch
  
  const transport = new DefaultChatTransport({
    api: options.api,
  })
  
  // Restore original fetch after transport is created
  // Note: The transport will use the patched fetch for its requests
  
  return transport
}
