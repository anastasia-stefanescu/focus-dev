import { logActivity, fetchActivities } from './database.js';

export const activityController = {
    async addActivity(req, res){
        console.log('Inside add activity controller!!');
        //send another request to db service
        const {activitySession, activityDuration, startTime, activityType} = req.body;
        const date = new Date(startTime);
        await logActivity(activitySession, activityDuration, date, activityType);
    },

    async getActivities(req, res) {
        const {begin, end} = req.body;
        // transform to date object
        const activities = await fetchActivities(begin, end);
        res.status(200).json(activities);
    }
}