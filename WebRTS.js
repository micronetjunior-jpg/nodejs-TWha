import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { initMediasoup, router } from "./mediasoup.js";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const PORT = 3000;

// ─────────────────────────────
// WebSocket con Python (control)
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
// MediaSoup state (1 llamada)
// ─────────────────────────────
let transport = null;
let producer = null;

// ─────────────────────────────
// Crear llamada (RTP)
// ─────────────────────────────
app.post("/call/start", async (_, res) => {
  try {
    console.log("📞 Iniciando llamada");

    // 1️⃣ Crear transport RTP
    transport = await router.createPlainTransport({
      listenIp: {
        ip: "0.0.0.0",
        announcedIp: "nodejs-production-83139.up.railway.app" // ← dominio o IP pública
      },
      rtcpMux: true,
      comedia: true
    });

    // 2️⃣ Crear producer OPUS
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

    console.log("🎯 RTP listo");
    console.log("📡 IP:", transport.tuple.localIp);
    console.log("📡 PORT:", transport.tuple.localPort);

    // 3️⃣ Avisar a Python que ya puede enviar audio
    pythonWS?.send(JSON.stringify({
      type: "RTP_READY",
      rtp: {
        ip: transport.tuple.localIp,
        port: transport.tuple.localPort
      }
    }));

    res.json({
      status: "ok",
      rtpPort: transport.tuple.localPort
    });

  } catch (err) {
    console.error("❌ Error creando llamada:", err);
    res.status(500).json({ error: "call_start_failed" });
  }
});

// ─────────────────────────────
// Init server + mediasoup
// ─────────────────────────────
(async () => {
  await initMediasoup();

  server.listen(PORT, () => {
    console.log(`🚀 Node RTP Server en http://0.0.0.0:${PORT}`);
  });
})();