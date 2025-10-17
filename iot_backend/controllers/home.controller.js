const Sensor = require('../models/sensors.model');
const Action = require('../models/actions.model');

const { client } = require('../mqtt/mqttClient');

exports.getLatestSensor = async (req, res) => {
    try {
        const latest = await Sensor.findOne().sort({ time: -1 });
        res.json(latest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTenLatestSensor = async (req, res) => {
    try {
        const latestTen = await Sensor.find()
                                .sort({ time: -1 })    // sắp xếp giảm dần theo time (mới nhất trước)
                                .limit(10)             // chỉ lấy 10 bản ghi
                                .select("temperature humidity light time -_id");  // chọn trường cần trả về, bỏ _id
        
        const sortedLatestTen = latestTen.sort((a, b) => new Date(a.time) - new Date(b.time));
                
        res.json(sortedLatestTen);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.toggleDevice = async (req, res) => {
    try {
        const { device, action } = req.body;
        // new
        const payload = {};
        payload[device] = action === "on" ? 1 : 0;   // chuyển thành JSON giống ESP32 mong đợi
        client.publish("esp32/control", JSON.stringify(payload));
        //
        const newAction = await Action.create({ device, action });
        res.json({ message: 'Action executed', data: newAction});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDeviceStatus = async (req, res) => {
  try {
    const devices = ['ac', 'fan', 'led'];
    const status = {};

    // Duyệt qua từng thiết bị, lấy hành động mới nhất
    for (const device of devices) {
      const lastAction = await Action.findOne({ device })
        .sort({ time: -1 })
        .select('action time -_id');

      // Nếu chưa có log thì mặc định là "off"
      status[device] = lastAction ? lastAction.action === 'on' : false;
    }

    res.json({
      success: true,
      status,
      message: 'Current device status fetched successfully'
    });
  } catch (err) {
    console.error('getDeviceStatus error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};