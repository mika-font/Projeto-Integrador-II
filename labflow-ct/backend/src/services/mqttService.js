const mqtt = require('mqtt');
const { verifyCardAccess, saveDeviceEvent } = require('./accessService');
const { checkFirmware } = require('./firmwareService');
require('dotenv').config();

let client;

function publish(topic, payload) {
  if (client?.connected) client.publish(topic, JSON.stringify(payload), { qos: 1 });
}

function startMqtt() {
  client = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 3000
  });

  client.on('connect', () => {
    console.log('[MQTT] conectado');
    client.subscribe('labflow/+/access/request', { qos: 1 });
    client.subscribe('labflow/+/event', { qos: 1 });
    client.subscribe('labflow/+/firmware/check', { qos: 1 });
    client.subscribe('labflow/+/status', { qos: 1 });
  });

  client.on('message', async (topic, message) => {
    try {
      const [, deviceId, type, action] = topic.split('/');
      const payload = JSON.parse(message.toString());
      const tokenAuth = payload.tokenAuth;

      if (type === 'access' && action === 'request') {
        const result = await verifyCardAccess({ tokenAuth, uid: payload.uid, evento: payload.evento || 'RFID_EXTERNO' });
        publish(`labflow/${deviceId}/access/response`, result);
      }

      if (type === 'event') {
        const result = await saveDeviceEvent({ tokenAuth, evento: payload.evento, detalhe: payload.detalhe });
        publish(`labflow/${deviceId}/event/ack`, result);
      }

      if (type === 'firmware' && action === 'check') {
        const result = await checkFirmware({ tokenAuth, firmwareAtual: payload.firmwareAtual });
        publish(`labflow/${deviceId}/firmware/response`, result);
      }

      if (type === 'status') {
        await saveDeviceEvent({ tokenAuth, evento: 'STATUS', detalhe: payload.status || 'ONLINE' });
      }
    } catch (err) {
      console.error('[MQTT] erro ao processar mensagem:', err.message);
    }
  });
}

module.exports = { startMqtt, publish };
