const express = require('express');
const router = express('Router');
const homeController = require('../controllers/home.controller');
const sensorsController = require('../controllers/sensors.controller');
const actionsController = require('../controllers/actions.controller');

// home route
router.get('/home/latest', homeController.getLatestSensor);
router.get('/home/tenlatest', homeController.getTenLatestSensor);
router.post('/home/toggle', homeController.toggleDevice);
router.get('/home/devicestatus', homeController.getDeviceStatus);

// sensors route
router.get('/sensors', sensorsController.getHistory);

// actions history route
router.get('/actions', actionsController.getHistory);

module.exports = router;