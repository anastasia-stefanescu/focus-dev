import {lambda} from '../index.js';
import { fetchActivities } from './database.js';

export const dashboardController = {
    async sendActivitiesToAWS(req, res){

        console.log("REACHED!!!! ")

        //first call database
        // const {begin, end} = req.body;
        // const dataFromDb = await fetchActivities(begin, end); // returns json?

        const params = {
            FunctionName: 'Interact_with_CodeStats_Backend_and_Quicksight',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(csvData),
        };

        try{
            const result = await lambda.invoke(params).promise();

            console.log(result);
            //const embedUrl = result.embedUrl as string;
            res.status(200).json(result.Payload?.toString() || '');  //.send(JSON.parse(result.Payload?.toString() || ''));
        } catch(error) {
            console.log('Error sending to or receiving from aws lambda', error);
            res.status(500).send('Error with aws')
        }
        
    },

    async sendMentalStateDataToAWS(req, res) {
        //first call database
        const {begin, end} = req.body;
        const dataFromDb = await fetchActivities(begin, end); // returns json?
        
        const params = {
            FunctionName: 'your-lambda-function-name',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(dataFromDb),
        };

        try{
            const result = await lambda.invoke(params).promise();
            res.send(JSON.parse(result.Payload?.toString() || ''));
        } catch(error) {
            console.log('Error sending to or receiving from aws lambda', error);
            res.status(500).send('Error with aws')
    }
    }
}