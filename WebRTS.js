import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { initMediasoup, router } from "./mediasoup.js";

let ipPublica = "";

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

app.get("/info", (req, res) => {
  res.json({
    publicIp: process.env.PUBLIC_IP,
    rtp: {
      codec: "opus",
      clockRate: 48000
    }
  });
});

// ─────────────────────────────
// Crear llamada (RTP)
// ─────────────────────────────
app.post("/call/start", async (req, res) => {
  try {
    console.log("📞 Iniciando llamada");
    
    ipPublica = process.env.PUBLIC_IP
    console.log(ipPublica);
  
    // 1️⃣ Crear transport RTP
    transport = await router.createPlainTransport({
      listenIp: {
        ip: "0.0.0.0",
        announcedIp: process.env.PUBLIC_IP// ← dominio o IP pública
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
            payloadType: 111,
            clockRate: 48000,
            channels: 2
          }
        ],
        encodings: [{ ssrc: 22222222 }]
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

function fetchPublicIp() 
{
  return new Promise((resolve, reject) => 
  {
    http.get(
      { host: "api.ipify.org", port: 80, path: "/" },
      resp => {
        let data = "";

        resp.on("data", chunk => data += chunk);
        resp.on("end", () => resolve(data.trim()));
      }
    ).on("error", reject);
  });
}

// ─────────────────────────────
// Init server + mediasoup
// ─────────────────────────────
(async () => 
{
  PUBLIC_IP = await fetchPublicIp();
  process.env.PUBLIC_IP = PUBLIC_IP; // ← disponible en el proceso
  console.log("🌐 Public IP:", PUBLIC_IP);
  
  await initMediasoup();
  
  server.listen(PORT, () => 
  {
    console.log(`🚀 Node RTP Server en http://0.0.0.0:${PORT}`);
  });
})();
