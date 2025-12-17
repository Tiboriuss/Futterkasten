// WebSocket proxy for AI chat streaming
// Converts SSE from Next.js to WebSocket for HA Ingress compatibility
// HA Ingress compresses HTTP responses (breaking SSE) but WebSocket works natively

const WebSocket = require('ws');
const http = require('http');

const WS_PORT = 3001;
const NEXTJS_URL = 'http://127.0.0.1:3000';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket proxy for AI chat streaming');
});

const wss = new WebSocket.Server({ server });

console.log(`[WS-Proxy] Starting on port ${WS_PORT}`);

wss.on('connection', (ws, req) => {
  console.log('[WS-Proxy] Client connected');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'chat') {
        await proxyChatRequest(ws, message.payload);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('[WS-Proxy] Error:', error.message);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('[WS-Proxy] Client disconnected');
  });
});

async function proxyChatRequest(ws, payload) {
  const { messages } = payload;
  
  try {
    // Make request to Next.js API
    const response = await fetch(`${NEXTJS_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    ws.send(JSON.stringify({ type: 'start' }));

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      if (ws.readyState !== WebSocket.OPEN) {
        console.log('[WS-Proxy] Client disconnected during stream');
        reader.cancel();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim()) {
            try {
              const parsed = JSON.parse(data);
              ws.send(JSON.stringify({ type: 'chunk', data: parsed }));
            } catch {
              // Not JSON, send as raw
              ws.send(JSON.stringify({ type: 'raw', data }));
            }
          }
        }
      }
    }

    ws.send(JSON.stringify({ type: 'done' }));
    
  } catch (error) {
    console.error('[WS-Proxy] Proxy error:', error.message);
    ws.send(JSON.stringify({ type: 'error', error: error.message }));
  }
}

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[WS-Proxy] Listening on port ${WS_PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS-Proxy] Shutting down...');
  wss.close();
  server.close();
});
