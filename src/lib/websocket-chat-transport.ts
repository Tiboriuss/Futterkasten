"use client"

import { createWebSocketFetch } from './websocket-fetch'

// Custom Chat Transport that uses WebSocket instead of HTTP
// This bypasses HA Core's compression which breaks SSE streaming

export class WebSocketChatTransport {
  private api: string
  private wsEndpoint: string
  private wsFetch: ReturnType<typeof createWebSocketFetch>

  constructor(options: { api: string; wsEndpoint: string }) {
    this.api = options.api
    this.wsEndpoint = options.wsEndpoint
    this.wsFetch = createWebSocketFetch(options.wsEndpoint)
  }

  async sendMessages(options: {
    messages: any[]
    abortController?: AbortController
    body?: Record<string, any>
    headers?: Record<string, string>
    credentials?: RequestCredentials
  }): Promise<Response> {
    const { messages, body = {}, headers = {} } = options

    return this.wsFetch(this.api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        messages,
        ...body,
      }),
    })
  }

  // Required by AI SDK transport interface
  async reconnectToStream(): Promise<Response> {
    throw new Error('Reconnect not supported with WebSocket transport')
  }
}
