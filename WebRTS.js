import http from 'http';
import { WebSocketServer } from 'ws';
import mediasoup from 'mediasoup';

const PORT = 3000;
const HOST = '0.0.0.0';

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
  },
  webRtcTransport: {
    listenIps: [{ ip: '0.0.0.0', announcedIp: "http://centerbeam.proxy.rlwy.net:35993" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  }
};

let worker;
let router;
let transports = new Map(); // transport.id -> transport
let producers = new Map();  // producer.id -> producer

// ---- Utils ----
function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---- HTTP Server ----
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, { status: 'ok', mediasoup: true });
  }

  if (req.method === 'GET' && req.url === '/rtp-capabilities') {
    return json(res, router.rtpCapabilities);
  }

  if (req.method === 'POST' && req.url === '/create-transport') {
    const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
    transports.set(transport.id, transport);

    return json(res, {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  }

  res.writeHead(404);
  res.end();
});

// ---- WebSocket Server ----
const wss = new WebSocketServer({ server, path: '/audio' });

wss.on('connection', ws => {
  console.log('🌐 Cliente WebSocket conectado');

  ws.on('message', async (message) => {
    try {
      // Aquí recibimos audio PCM desde Python
      // message = Buffer de float32 interleaved
      // Para pruebas: podemos loguear tamaño
      console.log('Recibido chunk de audio, bytes:', message.length);

      // Si quisieras producir audio en un transport:
      // const transport = [...transports.values()][0]; // ejemplo: tomar el primero
      // const producer = await transport.produce({ kind: 'audio', rtpParameters: ... });

    } catch (err) {
      console.error('Error procesando audio:', err);
    }
  });

  ws.on('close', () => {
    console.log('❌ Cliente WebSocket desconectado');
  });
});

// ---- Bootstrap ----
async function start() {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);
  router = await worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });

  console.log('✅ MediaSoup listo');

  server.listen(PORT, HOST, () => {
    console.log(`🚀 HTTP server + WebSocket on http://${HOST}:${PORT}`);
  });
}

start();