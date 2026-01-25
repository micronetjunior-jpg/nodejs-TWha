import http from 'http';
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

// ---- Utils ----
function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---- Server ----
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, { status: 'ok', mediasoup: true });
  }

  if (req.method === 'GET' && req.url === '/rtp-capabilities') {
    return json(res, router.rtpCapabilities);
  }

  if (req.method === 'POST' && req.url === '/create-transport') {
    const transport = await router.createWebRtcTransport(
      mediasoupConfig.webRtcTransport
    );

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

// ---- Bootstrap ----
async function start() {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);
  router = await worker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs
  });

  console.log('✅ MediaSoup listo');

  server.listen(PORT, HOST, () => {
    console.log(`🚀 HTTP server on http://${HOST}:${PORT}`);
  });
}

start();