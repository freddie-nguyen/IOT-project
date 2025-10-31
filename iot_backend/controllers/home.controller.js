const Sensor = require('../models/sensors.model');
const Action = require('../models/actions.model');
// Cập nhật import
const { controlDevice } = require('../mqtt/mqttClient');

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
                                      .sort({ time: -1 })
                                      .limit(10)
                                      .select("temperature humidity light time -_id");
        
        const sortedLatestTen = latestTen.sort((a, b) => new Date(a.time) - new Date(b.time));
        res.json(sortedLatestTen);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.toggleDevice = async (req, res) => {
    try {
        const { device, action } = req.body;
        
        // Không còn kiểm tra 'isEsp32Connected'
        // Chúng ta gửi lệnh và chờ phản hồi

        controlDevice(device, action, async (result) => {
            if (result.success) {
                // Chỉ lưu vào DB nếu ESP32 xác nhận thành công
                const newAction = await Action.create({ 
                    device, 
                    action,
                    time: new Date()
                });
                
                res.json({ 
                    success: true,
                    message: 'Action executed and confirmed by ESP32', 
                    data: newAction
                });
            } else {
                // Nếu timeout (không nhận được phản hồi từ esp32/status)
                if (result.timeout) {
                    res.status(408).json({ // 408 Request Timeout
                        success: false,
                        error: 'No response from ESP32. Device state unchanged.',
                        timeout: true
                    });
                } else {
                    // Các lỗi khác
                    res.status(500).json({ 
                        success: false,
                        error: result.error || 'Failed to execute action' 
                    });
                }
            }
        });

    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

exports.getDeviceStatus = async (req, res) => {
    try {
        const devices = ['ac', 'fan', 'led'];
        const status = {};

        // Lấy action cuối cùng cho mỗi thiết bị từ DB
        for (const device of devices) {
            const lastAction = await Action.findOne({ device })
                .sort({ time: -1 })
                .select('action time -_id');
            
            status[device] = lastAction ? lastAction.action === 'on' : false;
        }

        res.json({
            success: true,
            status: status,
            // Đã xóa 'esp32Connected'
            lastUpdated: new Date(),
            message: 'Current device status fetched successfully'
        });

    } catch (err) {
        console.error('getDeviceStatus error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};