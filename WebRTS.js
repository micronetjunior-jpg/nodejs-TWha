import http from 'http';
import mediasoup from 'mediasoup';

const PORT = 3000;
const HOST = '0.0.0.0';

let worker;
let router;
let plainTransport;
let producer;

// ---- MediaSoup config ----
const config = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 40100
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 1
      }
    ]
  }
};

// ---- Helper ----
function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---- HTTP Server ----
const server = http.createServer(async (req, res) => {

  // 1️⃣ Crear RTP entrada
  if (req.method === 'POST' && req.url === '/create-tts-transport') {

    plainTransport = await router.createPlainTransport({
      listenIp: '0.0.0.0',
      rtcpMux: true,
      comedia: true   // MediaSoup aprende IP/puerto remoto solo
    });

    producer = await plainTransport.produce({
      kind: 'audio',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'audio/opus',
            payloadType: 111,
            clockRate: 48000,
            channels: 1
          }
        ],
        encodings: [{ ssrc: 22222222 }]
      }
    });

    return json(res, {
      transportId: plainTransport.id,
      rtpIp: plainTransport.tuple.localIp,
      rtpPort: plainTransport.tuple.localPort,
      codec: 'opus'
    });
  }

  // Health
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, { status: 'ok' });
  }

  res.writeHead(404);
  res.end();
});

// ---- Bootstrap ----
async function start() {
  worker = await mediasoup.createWorker(config.worker);

  router = await worker.createRouter({
    mediaCodecs: config.router.mediaCodecs
  });

  console.log('✅ MediaSoup listo');

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Server on http://${HOST}:${PORT}`);
  });
}

start();