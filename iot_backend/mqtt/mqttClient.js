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
};

const client = mqtt.connect(MQTT_SERVER, options);

// Lưu trữ các callback pending chờ xác nhận từ ESP32
const pendingCallbacks = new Map();

client.on('connect', () => {
  console.log('MQTT connected to broker');
  client.subscribe('esp32/sensors');
  client.subscribe('esp32/status'); // Để nhận trạng thái thiết bị từ ESP32
});

client.on('message', async (topic, message) => {
  try {
    const msg = message.toString();
    console.log(`📨 Received MQTT message on topic ${topic}:`, msg);

    // ✅ Nhận dữ liệu cảm biến
    if (topic === 'esp32/sensors') {
      const data = JSON.parse(msg);
      // Bỏ logic 'id' tự tăng, để MongoDB tự xử lý _id
      const sensor = new Sensor({
        temperature: data.temp,
        humidity: data.hum,
        light: data.lux,
        time: new Date(), // Sẽ tốt hơn nếu ESP32 gửi timestamp
      });
      await sensor.save();
      return;
    }

    // ✅ Nhận phản hồi trạng thái từ ESP32 qua topic esp32/status
    if (topic === 'esp32/status') {
      try {
        const statusData = JSON.parse(msg);
        console.log('✅ Received device status from ESP32:', statusData);
        
        const device = statusData.device; // "led", "ac", "fan"
        const status = statusData.status; // "ON" hoặc "OFF"
        const timestamp = statusData.time;
        
        const callbackKey = `device_${device}`;
        
        // Gọi callback nếu tìm thấy
        if (pendingCallbacks.has(callbackKey)) {
          const callback = pendingCallbacks.get(callbackKey);
          callback({ 
            success: true, 
            device: device,
            status: status,
            timestamp: timestamp,
            message: `Device ${device} turned ${status}`
          });
          pendingCallbacks.delete(callbackKey);
          console.log(`✅ Confirmed ${device} status: ${status}`);
        } else {
          console.log(`ℹ️ Status update for ${device} but no pending callback`);
        }
        
      } catch (parseError) {
        // Bỏ qua các tin nhắn status không phải JSON (như "online")
        console.log('Non-JSON status message received:', msg);
      }
      return;
    }

  } catch (err) {
    console.error('Error parsing MQTT message', err);
  }
});

// ✅ Hàm control device với callback chờ confirmation từ esp32/status
async function controlDevice(device, action, callback, timeout = 2000) {
  try {
    // Tạo payload theo định dạng ESP32 mong đợi
    const payload = {};
    payload[device] = action === 'on' ? 1 : 0;

    // Tạo key cho pending callback
    const callbackKey = `device_${device}`;

    // Lưu callback với timeout 2 giây
    pendingCallbacks.set(callbackKey, callback);
    
    // Set timeout để cleanup nếu không nhận được confirmation
    const timeoutId = setTimeout(() => {
      if (pendingCallbacks.has(callbackKey)) {
        console.log(`❌ Timeout (2s) waiting for ESP32 status confirmation for ${device}`);
        callback({ 
          success: false, 
          error: 'Timeout: No response from ESP32 within 2 seconds',
          timeout: true 
        });
        pendingCallbacks.delete(callbackKey);
      }
    }, timeout);

    // Gửi command đến ESP32 qua topic esp32/control
    client.publish('esp32/control', JSON.stringify(payload));
    console.log('📤 Sent control command to ESP32:', payload);

  } catch (err) {
    console.error('❌ controlDevice error:', err);
    callback({ success: false, error: err.message });
  }
}

// Export
module.exports = { client, controlDevice };