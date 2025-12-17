// WebSocket-based fetch replacement for AI SDK
// This creates a fetch-like interface that uses WebSocket under the hood
// to bypass HA Core's HTTP compression which breaks SSE streaming

export function createWebSocketFetch(wsEndpoint: string) {
  return async function websocketFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Only intercept POST requests to the chat API
    const url = typeof input === 'string' ? input : input.toString()
    if (!url.includes('/api/chat') || init?.method !== 'POST') {
      // Fall back to regular fetch for non-chat requests
      return fetch(input, init)
    }

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${wsEndpoint}`
      
      const ws = new WebSocket(wsUrl)
      const chunks: Uint8Array[] = []
      const encoder = new TextEncoder()
      let streamController: ReadableStreamDefaultController<Uint8Array> | null = null

      // Create a ReadableStream that will receive WebSocket data
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
        },
        cancel() {
          ws.close()
        }
      })

      ws.onopen = () => {
        // Send the chat request over WebSocket
        const body = init?.body ? JSON.parse(init.body as string) : {}
        ws.send(JSON.stringify({
          type: 'chat',
          payload: body
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'start') {
            // Create fake Response with streaming body
            const response = new Response(stream, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              }
            })
            resolve(response)
          } else if (message.type === 'chunk' && streamController) {
            // Convert chunk to SSE format and push to stream
            const sseData = `data: ${JSON.stringify(message.data)}\n\n`
            streamController.enqueue(encoder.encode(sseData))
          } else if (message.type === 'raw' && streamController) {
            // Raw SSE data
            const sseData = `data: ${message.data}\n\n`
            streamController.enqueue(encoder.encode(sseData))
          } else if (message.type === 'done') {
            streamController?.close()
            ws.close()
          } else if (message.type === 'error') {
            const error = new Error(message.error || 'WebSocket chat error')
            streamController?.error(error)
            ws.close()
            reject(error)
          }
        } catch (error) {
          console.error('[WS Fetch] Failed to parse message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WS Fetch] WebSocket error:', error)
        reject(new Error('WebSocket connection failed'))
      }

      ws.onclose = () => {
        // Ensure stream is closed
        if (streamController) {
          try {
            streamController.close()
          } catch {
            // Already closed
          }
        }
      }

      // Timeout after 60 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close()
          reject(new Error('WebSocket request timeout'))
        }
      }, 60000)
    })
  }
}
