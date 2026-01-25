import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { initMediasoup, router } from "./mediasoup.js";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const PORT = 3000;

// ─────────────────────────────
// WebSocket con Python
// ─────────────────────────────
let pythonWS = null;

const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  pythonWS = ws;
  console.log("🐍 Python conectado");

  ws.on("close", () => {
    pythonWS = null;
    console.log("🐍 Python desconectado");
  });
});

// ─────────────────────────────
// MediaSoup state
// ─────────────────────────────
let transport;
let producer;

// ─────────────────────────────
// Crear llamada
// ─────────────────────────────
app.post("/call/start", async (_, res) => {
  transport = await router.createPlainTransport({
    listenIp: {
      ip: "0.0.0.0",
      announcedIp: process.env.PUBLIC_IP
    },
    rtcpMux: true,
    comedia: true
  });

  producer = await transport.produce({
    kind: "audio",
    rtpParameters: {
      codecs: [
        {
          mimeType: "audio/opus",
          payloadType: 100,
          clockRate: 48000,
          channels: 2
        }
      ],
      encodings: [{ ssrc: 11111111 }]
    }
  });

  console.log("📞 Llamada lista");
  console.log("🎯 RTP PORT:", transport.tuple.localPort);

  // Avisar a Python que ya puede hablar
  pythonWS?.send(JSON.stringify({
    type: "CALL_READY",
    rtp: {
      ip: transport.tuple.localIp,
      port: transport.tuple.localPort
    }
  }));

  res.json({
    status: "ready",
    rtpPort: transport.tuple.localPort
  });
});

// ─────────────────────────────
// Audio OPUS desde Python
// ─────────────────────────────
wss.on("connection", ws => {
  ws.on("message", msg => {
    if (Buffer.isBuffer(msg)) {
      // Aquí normalmente NO haces nada:
      // MediaSoup recibe el RTP directamente
      // Este canal es solo control / debug
    }
  });
});

// ─────────────────────────────
// Init
// ─────────────────────────────
(async () => {
  await initMediasoup();
  server.listen(PORT, () =>
    console.log(`🚀 Server en http://localhost:${PORT}`)
  );
})();