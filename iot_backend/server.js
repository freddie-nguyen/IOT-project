const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  // allow cross origin resource sharing
const dotenv = require('dotenv');
const routes = require('./routes/main.route');
require('./mqtt/mqttClient');


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/iot');

app.use('/api', routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, function() {
    console.log(`Server running on port ${PORT}, I don't know`);
});