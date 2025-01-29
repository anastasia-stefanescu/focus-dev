import { logActivity, fetchActivities } from './database.js';

export const activityController = {
    async addActivity(req, res){
        //send another request to db service
        const {activityDuration, startTime, activityType} = req.body;
        await logActivity(activityDuration, startTime, activityType);
    },

    async getActivities(req, res) {
        const {begin, end} = req.body;
        // transform to date object
        const activities = await fetchActivities(begin, end);
        res.status(200).json(activities);
    }
}