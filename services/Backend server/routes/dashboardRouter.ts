import express from 'express';
import { dashboardController } from '../controllers/dashboardController';

const dashboardRouter = express.Router();

dashboardRouter.post('/activity', dashboardController.sendActivitiesToAWS);
dashboardRouter.post('/mentalState', dashboardController.sendMentalStateDataToAWS);
//automatically returns report

// dashboardRouter.get('/activity', dashboardController.getActivityData);
// dashboardRouter.get('/mentalState', dashboardController.getMentalStateData);

export {dashboardRouter}
