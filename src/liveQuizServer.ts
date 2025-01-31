import mqtt from 'mqtt';
import { Server } from 'socket.io';

const MQTT_BROKER_URL = 'ws://localhost:8000/mqtt';

let io: Server;

const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `quiz-server-${Math.random().toString(16).substring(2, 10)}`,
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('Backend connected to MQTT broker');
});

mqttClient.on('message', (topic, message) => {
  console.log('Received message on topic:', topic);
  console.log('Message:', message.toString());
  
  try {
    if (io) {
      const match = topic.match(/quizzes\/(.+)\/comments/);
      if (match) {
        const quizId = match[1];
        const room = `quiz_${quizId}`;
        const messageData = JSON.parse(message.toString());
        console.log('Broadcasting to room:', room, messageData);
        io.to(room).emit('commentUpdate', messageData);
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

mqttClient.on('error', (error) => {
  console.error('MQTT error:', error);
});

export function initializeMQTT(socketIo: Server) {
  io = socketIo;
  console.log('Socket.IO instance initialized for MQTT integration');
}

export { mqttClient };