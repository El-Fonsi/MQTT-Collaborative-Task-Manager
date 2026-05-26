import mqtt from 'mqtt';

const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:1883';
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME || '';
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD || '';

let client: mqtt.MqttClient | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let globalListeners: Array<(topic: string, payload: Buffer) => void> = [];

export function onMessage(fn: (topic: string, payload: Buffer) => void) {
  globalListeners.push(fn);
  return () => {
    globalListeners = globalListeners.filter((l) => l !== fn);
  };
}

export function connectMqtt(): Promise<mqtt.MqttClient> {
  return new Promise((resolve, reject) => {
    if (client?.connected) {
      resolve(client);
      return;
    }

    const id = `client_${Math.random().toString(16).slice(2, 10)}`;

    client = mqtt.connect(MQTT_URL, {
      username: MQTT_USERNAME || undefined,
      password: MQTT_PASSWORD || undefined,
      clientId: id,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    client.on('connect', () => {
      console.log('[MQTT] Connected');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      resolve(client!);
    });

    client.on('error', (err) => {
      console.error('[MQTT] Error:', err);
      reject(err);
    });

    client.on('close', () => {
      console.log('[MQTT] Disconnected');
      scheduleReconnect();
    });

    client.on('offline', () => {
      console.log('[MQTT] Offline');
      scheduleReconnect();
    });

    client.on('message', (topic, payload) => {
      for (const fn of globalListeners) {
        try { fn(topic, payload); } catch {}
      }
    });
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    try {
      await connectMqtt();
    } catch {
      scheduleReconnect();
    }
  }, 5000);
}

export function getClient(): mqtt.MqttClient | null {
  return client;
}

export function disconnectMqtt() {
  if (client) {
    client.end(true);
    client = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}
