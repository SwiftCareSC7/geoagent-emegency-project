import express from 'express';
import { getTrafficAtLocation } from './traffic.controller.js';

const router = express.Router();


router.get('/location', getTrafficAtLocation);

export default router;
