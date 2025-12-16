#!/usr/bin/env node
/**
 * Proxy server for Home Assistant Ingress
 * Rewrites HTML responses to include the correct base path
 */

const http = require('http');

const NEXT_PORT = 3000;
const PROXY_PORT = 8099;

const server = http.createServer((req, res) => {
  const ingressPath = req.headers['x-ingress-path'] || '';
  
  const options = {
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${NEXT_PORT}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');
    
    if (isHtml && ingressPath) {
      // Collect HTML response and modify it
      let body = '';
      proxyRes.on('data', chunk => body += chunk);
      proxyRes.on('end', () => {
        // Add <base> tag to head and rewrite asset URLs
        let modified = body;
        
        // Insert base tag after <head>
        if (!modified.includes('<base')) {
          modified = modified.replace(/<head([^>]*)>/i, `<head$1><base href="${ingressPath}/">`);
        }
        
        // Rewrite absolute URLs to relative
        modified = modified.replace(/href="\//g, `href="${ingressPath}/`);
        modified = modified.replace(/src="\//g, `src="${ingressPath}/`);
        modified = modified.replace(/"(\/_next\/)/g, `"${ingressPath}$1`);
        
        // Update content-length
        const newHeaders = { ...proxyRes.headers };
        newHeaders['content-length'] = Buffer.byteLength(modified);
        
        res.writeHead(proxyRes.statusCode, newHeaders);
        res.end(modified);
      });
    } else {
      // Pass through non-HTML responses
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Ingress proxy listening on port ${PROXY_PORT}`);
});
