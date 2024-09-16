import express from 'express';
import bodyParser from 'body-parser';
import api from '../Controller/api.controller.js';

const router = express.Router();
router.use(bodyParser.json());

router.post('/setModbus', api.setModbus);

router.get('/getModbus', api.getModbus);

router.get('/getSlaves', api.getSlaves);

router.post('/signIn', api.signIn);

router.post('/connectTest', api.connectTest);

router.get('/getChartData', api.getChartData);

export default router;