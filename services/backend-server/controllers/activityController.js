import { logActivity, fetchActivities } from './database.js';

export const activityController = {
    async addActivity(req, res){
        //send another request to db service
        const {action_duration, action_type, start_time} = req.body;
        await logActivity(action_duration, start_time, action_type);
    },

    async getActivities(req, res) {
        const {begin, end} = req.body;
        // transform to date object
        const activities = await fetchActivities(begin, end);
    }
}