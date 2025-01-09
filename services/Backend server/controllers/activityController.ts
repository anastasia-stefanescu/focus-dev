import { Request, Response } from 'express';
import { logActivity, fetchActivities } from '../../database/database';

export const activityController = {
    async addActivity(req: Request, res: Response){
        //send another request to db service
        const {action_duration, action_type, start_time} = req.body;
        await logActivity(action_duration, start_time, action_type);
    },

    async getActivities(req:Request, res:Response) {
        const {begin, end} = req.body;
        // transform to date object
        const activities = await fetchActivities(begin, end);
    }
}