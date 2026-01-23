module.exports = {
  listenIp: 'TU_IP_PUBLICA',

  mediasoup: {
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
        {
          ip: '0.0.0.0',
          announcedIp: 'TU_IP_PUBLICA'
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    }
  }
}
