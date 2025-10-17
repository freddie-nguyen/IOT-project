const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
    id: Number,
    device: String, // led, fan, ac
    action: String, // on/off
    time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('historyaction', actionSchema);