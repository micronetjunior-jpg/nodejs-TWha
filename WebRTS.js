// server.js
import http from 'http';
import mediasoup from 'mediasoup';

const PORT = 3000;
const HOST = '0.0.0.0';

// ---- MediaSoup config mínima ----
const mediasoupConfig = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 40100,
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      }
    ]
  }
};

let worker;
let router;

// ---- HTTP Server ----
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('MediaSoup server is running 🚀');
});

// ---- Bootstrap ----
async function start() {
  console.log('🚀 Starting MediaSoup server...');

  worker = await mediasoup.createWorker(mediasoupConfig.worker);

  worker.on('died', () => {
    console.error('❌ MediaSoup worker died, exiting...');
    process.exit(1);
  });

  router = await worker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs
  });

  console.log('✅ MediaSoup Worker PID:', worker.pid);
  console.log('✅ MediaSoup Router created');

  server.listen(PORT, HOST, () => {
    console.log(`🌐 HTTP listening on http://${HOST}:${PORT}`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
});