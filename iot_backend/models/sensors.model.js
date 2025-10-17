const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    id: Number,
    temperature: Number,
    humidity: Number,
    light: Number,
    time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('datasensor', sensorSchema);