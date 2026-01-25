import http from 'http';
import { WebSocketServer } from 'ws';
import mediasoup from 'mediasoup';
import prism from 'prism-media';

const PORT = 3000;
const HOST = '0.0.0.0';

const mediasoupConfig = {
  worker: { rtcMinPort: 40000, rtcMaxPort: 40100 },
  router: { mediaCodecs: [{ kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }] },
  webRtcTransport: { 
    listenIps: [{ ip: '0.0.0.0', announcedIp: 'http://centerbeam.proxy.rlwy.net:35993' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  }
};

let worker, router, transports = new Map();

function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---- HTTP API ----
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, { status: 'ok', mediasoup: true });
  if (req.method === 'GET' && req.url === '/rtp-capabilities') return json(res, router.rtpCapabilities);

  if (req.method === 'POST' && req.url === '/create-transport') {
    const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
    transports.set(transport.id, transport);

    return json(res, {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      websocket: `ws://${HOST}:${PORT}/audio`
    });
  }

  res.writeHead(404);
  res.end();
});

// ---- WebSocket ----
const wss = new WebSocketServer({ server, path: '/audio' });

wss.on('connection', ws => {
  console.log('🌐 Cliente WebSocket conectado');

  // Encoder Opus usando opusscript (compatible en Railway)
  const opusEncoder = new prism.opus.Encoder({
    rate: 48000,
    channels: 2,
    frameSize: 960,
    encoder: 'opusscript'
  });

  opusEncoder.on('data', chunk => {
    // Aquí se produciría en MediaSoup
    console.log('Chunk Opus listo, bytes:', chunk.length);
    // transport.produce({ kind: 'audio', rtpParameters: {...}, ... });
  });

  ws.on('message', message => {
    opusEncoder.write(message);  // PCM -> Opus
  });

  ws.on('close', () => console.log('❌ Cliente WebSocket desconectado'));
});

// ---- Bootstrap ----
async function start() {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);
  router = await worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });
  console.log('✅ MediaSoup listo');

  server.listen(PORT, HOST, () => console.log(`🚀 HTTP + WS server en http://${HOST}:${PORT}`));
}

start();