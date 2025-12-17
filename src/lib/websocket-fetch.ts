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
      
      console.log('[WS Fetch] Connecting to:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      const encoder = new TextEncoder()
      let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
      let resolved = false

      // Create a ReadableStream that will receive WebSocket data
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
          console.log('[WS Fetch] Stream controller initialized')
        },
        cancel() {
          console.log('[WS Fetch] Stream cancelled')
          ws.close()
        }
      })

      ws.onopen = () => {
        console.log('[WS Fetch] WebSocket connected')
        // Send the chat request over WebSocket
        const body = init?.body ? JSON.parse(init.body as string) : {}
        ws.send(JSON.stringify({
          type: 'chat',
          payload: body
        }))
        
        // Resolve immediately with the stream - don't wait for 'start' message
        if (!resolved) {
          resolved = true
          const response = new Response(stream, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            }
          })
          console.log('[WS Fetch] Response created with stream')
          resolve(response)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('[WS Fetch] Received:', message.type)
          
          if (message.type === 'start') {
            // Stream already started, just log
            console.log('[WS Fetch] Server acknowledged start')
          } else if (message.type === 'chunk' && streamController) {
            // Convert chunk to SSE format and push to stream
            const sseData = `data: ${JSON.stringify(message.data)}\n\n`
            streamController.enqueue(encoder.encode(sseData))
          } else if (message.type === 'raw' && streamController) {
            // Raw SSE data
            const sseData = `data: ${message.data}\n\n`
            streamController.enqueue(encoder.encode(sseData))
          } else if (message.type === 'done') {
            console.log('[WS Fetch] Stream done')
            if (streamController) {
              try {
                streamController.close()
              } catch (e) {
                console.log('[WS Fetch] Controller already closed')
              }
            }
            ws.close()
          } else if (message.type === 'error') {
            console.error('[WS Fetch] Server error:', message.error)
            const error = new Error(message.error || 'WebSocket chat error')
            if (streamController) {
              try {
                streamController.error(error)
              } catch (e) {
                // Already errored
              }
            }
            ws.close()
            if (!resolved) {
              resolved = true
              reject(error)
            }
          }
        } catch (error) {
          console.error('[WS Fetch] Failed to parse message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WS Fetch] WebSocket error:', error)
        if (!resolved) {
          resolved = true
          reject(new Error('WebSocket connection failed'))
        }
      }

      ws.onclose = () => {
        console.log('[WS Fetch] WebSocket closed')
        // Ensure stream is closed
        if (streamController) {
          try {
            streamController.close()
          } catch {
            // Already closed
          }
        }
      }

      // Timeout after 120 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          console.log('[WS Fetch] Timeout - closing connection')
          ws.close()
          if (!resolved) {
            resolved = true
            reject(new Error('WebSocket request timeout'))
          }
        }
      }, 120000)
    })
  }
}
