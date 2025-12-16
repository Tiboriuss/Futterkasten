#!/usr/bin/env node
/**
 * Proxy server for Home Assistant Ingress
 * Rewrites HTML responses to include the correct base path
 */

const http = require('http');

const NEXT_PORT = 3000;
const PROXY_PORT = 8099;

const server = http.createServer((req, res) => {
  const clientIP = req.socket.remoteAddress;
  const ingressPath = req.headers['x-ingress-path'] || '';
  
  console.log(`[PROXY] ${req.method} ${req.url} from ${clientIP}`);
  console.log(`[PROXY] X-Ingress-Path: ${ingressPath}`);
  
  const options = {
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${NEXT_PORT}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';
    console.log(`[PROXY] Next.js: ${proxyRes.statusCode} ${contentType}`);
    
    // For HTML responses, collect and modify
    if (contentType.includes('text/html') && ingressPath) {
      let body = [];
      proxyRes.on('data', chunk => body.push(chunk));
      proxyRes.on('end', () => {
        let html = Buffer.concat(body).toString('utf8');
        
        // Insert base tag
        html = html.replace(/<head>/i, `<head><base href="${ingressPath}/">`);
        
        // Rewrite URLs
        html = html.replace(/href="\//g, `href="${ingressPath}/`);
        html = html.replace(/src="\//g, `src="${ingressPath}/`);
        html = html.replace(/"(\/_next\/)/g, `"${ingressPath}$1`);
        
        const buffer = Buffer.from(html, 'utf8');
        
        // Copy headers but fix content-length
        const headers = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (key.toLowerCase() !== 'transfer-encoding') {
            headers[key] = value;
          }
        }
        headers['content-length'] = buffer.length;
        
        console.log(`[PROXY] Sending ${buffer.length} bytes HTML`);
        res.writeHead(proxyRes.statusCode, headers);
        res.end(buffer);
      });
    } else {
      // Pass through other responses
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error(`[PROXY] Error: ${err.message}`);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`Ingress proxy listening on port ${PROXY_PORT}`);
});
