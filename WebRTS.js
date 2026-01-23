// server.js
import http from 'http';
import { Server } from 'socket.io';
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
    listenIps: [
      { ip: '0.0.0.0', announcedIp: null } // luego pondremos IP pública
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  }
};

let worker;
let router;

// ---- HTTP + WS ----
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

async function start() {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);

  worker.on('died', () => {
    console.error('❌ MediaSoup worker died');
    process.exit(1);
  });

  router = await worker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs
  });

  console.log('✅ MediaSoup ready');

  io.on('connection', socket => {
    console.log('🔌 Client connected:', socket.id);

    // 1️⃣ Enviar capacidades RTP
    socket.on('getRtpCapabilities', (_, cb) => {
      cb(router.rtpCapabilities);
    });

    // 2️⃣ Crear WebRTC Transport
    socket.on('createTransport', async (_, cb) => {
      const transport = await router.createWebRtcTransport(
        mediasoupConfig.webRtcTransport
      );

      cb({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    });
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server listening on ${HOST}:${PORT}`);
  });
}

start();