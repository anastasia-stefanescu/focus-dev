import express from 'express';
import { activityController } from '../controllers/activityController';

const activityRouter = express.Router();

activityRouter.post('/', activityController.addActivity);
activityRouter.get('/', activityController.getActivities);

export {activityRouter}