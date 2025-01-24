import express from 'express';
import { inferenceController } from '../controllers/inferenceController';

const inferenceRouter = express.Router();

inferenceRouter.post('/', inferenceController.evaluateText);

// inferenceRouter.get('/', inferenceController.getActivities);

export {inferenceRouter}