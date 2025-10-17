const mqtt = require('mqtt');
const Sensor = require('../models/sensors.model');
const Action = require("../models/actions.model");

const MQTT_SERVER = 'mqtt://10.23.200.4';
const MQTT_PORT = 1883;

const options = {
    port: MQTT_PORT,
    username: 'user1',
    password: '123',
    reconnectPeriod: 2000
}

const client = mqtt.connect(MQTT_SERVER, options);

client.on('connect', () => {
    console.log('MQTT connected to broker');

    client.subscribe('esp32/sensors', (err) => {
        if (!err)
            console.log('Subscribed to esp32/sensors');
    });
});

client.on('message', async (topic, message) => {
    try {
        const msg = JSON.parse(message.toString());

        const last = await Sensor.findOne().sort({ id: -1 }).limit(1);
        const newId = last ? last.id + 1 : 1;
        
        if (topic === 'esp32/sensors') {
            const sensor = new Sensor({
                id: newId,
                temperature: msg.temp,
                humidity: msg.hum,
                light: msg.lux,
                time: new Date(),
            });

            await sensor.save();
            // console.log(`Save sensor ${newId}`, msg);
        }
    } catch (err) {
        console.error('Error parsing MQTT message', err);
    }
});

async function controlDevice(device, state) {
  try {
    const payload = {};
    payload[device] = action === 'on' ? 1 : 0;

    // Gửi tín hiệu tới ESP32
    client.publish('esp32/control', JSON.stringify(payload));
    console.log('📤 Sent control to ESP32:', payload);

    // Lưu hành động vào MongoDB
    const newAction = new Action({
      device,
      action,
      time: new Date(),
    });

    await newAction.save();
    console.log(`💾 Logged action: ${device} ${action}`);

    return { success: true, data: newAction };
  } catch (err) {
    console.error('❌ controlDevice error:', err);
    return { success: false, error: err.message };
  }
}

async function syncDeviceStates() {
  try {
    const devices = ['led', 'fan', 'ac'];
    const states = {};

    for (const device of devices) {
      const lastAction = await Action.findOne({ device }).sort({ time: -1 });
      const state = lastAction?.action === 'on' ? 1 : 0;
      states[device] = state;
    }

    // Gửi toàn bộ trạng thái lên ESP32
    client.publish('esp32/control', JSON.stringify(states));
    console.log('Synced device states to ESP32:', states);
  } catch (err) {
    console.error('syncDeviceStates error:', err);
  }
}

module.exports = { client, controlDevice, syncDeviceStates };
