import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/@tweenjs')) return 'vendor-tween';
          return undefined;
        },
      },
    },
  },
  plugins: [
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use('/api/log-debug', (req, res, next) => {
          if (req.method === 'POST') {
            console.log('Received debug log request');
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const debugDir = path.resolve(process.cwd(), 'debug');
                if (!fs.existsSync(debugDir)) {
                  fs.mkdirSync(debugDir);
                }
                const filename = `debug_swipes_${data.sessionId}.json`;
                const filePath = path.join(debugDir, filename);
                
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                
                res.statusCode = 200;
                res.end('Logged');
              } catch (e) {
                console.error('Error writing log:', e);
                res.statusCode = 500;
                res.end('Error');
              }
            });
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 8003,
  },
});