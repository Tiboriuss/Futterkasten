#!/usr/bin/env node
/**
 * Proxy server for Home Assistant Ingress using http-proxy
 */

const http = require('http');
const httpProxy = require('http-proxy');

const NEXT_PORT = 3000;
const PROXY_PORT = 8099;

const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${NEXT_PORT}`,
  selfHandleResponse: true
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  const ingressPath = req.headers['x-ingress-path'] || '';
  const contentType = proxyRes.headers['content-type'] || '';
  
  console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  
  if (contentType.includes('text/html') && ingressPath) {
    let body = [];
    proxyRes.on('data', chunk => body.push(chunk));
    proxyRes.on('end', () => {
      let html = Buffer.concat(body).toString('utf8');
      
      // Insert base tag and rewrite URLs
      html = html.replace(/<head>/i, `<head><base href="${ingressPath}/">`);
      html = html.replace(/href="\//g, `href="${ingressPath}/`);
      html = html.replace(/src="\//g, `src="${ingressPath}/`);
      html = html.replace(/"(\/_next\/)/g, `"${ingressPath}$1`);
      
      const buffer = Buffer.from(html, 'utf8');
      
      // Set headers
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'content-length': buffer.length,
        'transfer-encoding': undefined
      });
      res.end(buffer);
    });
  } else {
    // Pass through non-HTML
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }
});

proxy.on('error', (err, req, res) => {
  console.error(`[PROXY] Error: ${err.message}`);
  res.writeHead(502);
  res.end('Bad Gateway');
});

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

// WebSocket support
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PROXY_PORT, () => {
  console.log(`Ingress proxy listening on port ${PROXY_PORT}`);
});
