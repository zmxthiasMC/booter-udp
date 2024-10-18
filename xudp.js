const dgram = require('dgram');
const client = dgram.createSocket('udp4');

// Leer argumentos desde la línea de comandos
const args = process.argv.slice(2);
const serverAddress = args[0] || '127.0.0.1'; // IP del servidor
const serverPort = parseInt(args[1], 10) || 19132; // Puerto del servidor
const numBots = parseInt(args[2], 10) || 500; // Número de bots
const pps = parseInt(args[3], 10) || 1000; // Paquetes por segundo por bot
const duration = parseInt(args[4], 10) || 60; // Duración en segundos

function getRandomIp(){
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function sendPacket(botId, packetId){
    const spoofedIp = getRandomIp();
    const message = Buffer.from(`Bot ${botId} - Paquete de prueba ${packetId} desde ${spoofedIp}`);
    client.send(message, 0, message.length, serverPort, serverAddress, (err) => {
        if (err){
            console.error(`Bot ${botId}: Error al enviar paquete ${packetId} - ${err.message}`);
        } else {
            console.log(`Bot ${botId}: Enviando paquete ${packetId} desde ${spoofedIp} a ${serverAddress}:${serverPort}`);
        }
    });
}

// Enviar múltiples paquetes desde múltiples bots
for (let botId = 0; botId < numBots; botId++){
    let packetId = 0;
    const interval = setInterval(() => {
        sendPacket(botId, packetId++);
    }, 1000 / pps);

    // Detener el envío de paquetes después de la duración especificada
    setTimeout(() => {
        clearInterval(interval);
        if (botId === numBots - 1){
            client.close();
            console.log("Prueba de estrés completada.");
        }
    }, duration * 1000);
}
