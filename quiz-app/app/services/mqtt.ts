import mqtt from 'mqtt';
import { io } from 'socket.io-client';

// Configuration
const MQTT_URL = 'ws://localhost:8000/mqtt';
const WEBSOCKET_URL = 'http://localhost:5000';

// Initialize MQTT client with unique client ID
const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: `quiz-client-${Math.random().toString(16).substring(2, 10)}`,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 4000
});

// Initialize Socket.IO client
const socket = io(WEBSOCKET_URL, {
  autoConnect: false,
  reconnection: true
});

// MQTT event handlers
mqttClient.on('connect', () => {
  console.log('Frontend connected to MQTT broker');
});

mqttClient.on('error', (error) => {
  console.error('Frontend MQTT error:', error);
});

mqttClient.on('close', () => {
  console.warn('Frontend MQTT connection closed');
});

// Socket.IO event handlers
socket.on('connect', () => {
  console.log('Frontend connected to Socket.IO server');
});

socket.on('connect_error', (error) => {
  console.error('Frontend Socket.IO connection error:', error);
});

// Export the clients
export { mqttClient, socket };