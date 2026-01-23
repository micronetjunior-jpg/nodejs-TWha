const mediasoup = require('mediasoup');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');

(async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  const worker = await mediasoup.createWorker(config.mediasoup.worker);
  const router = await worker.createRouter(config.mediasoup.router);

  io.on('connection', socket => {
    console.log('Cliente conectado');

    socket.on('getRtpCapabilities', (_, cb) => {
      cb(router.rtpCapabilities);
    });
  });

  server.listen(5000, () =>
    console.log('MediaSoup corriendo en puerto 3000')
  );
  server.listen(9000, () =>
    print("Server Ok")
    );
})();