// import { AxiosError } from "axios";
// import axios from 'axios';
// import { logActivity, fetchActivities } from '../database/database';
// import { v4 as uuidv4 } from 'uuid';

// const base_url = 'http://localhost:3001';

// // interface ActivityRequest {
// //     activityDuration: number,
// //     startTime:number, 
// //     activityType:string
// // }

// export const http_post_request = async (userId, coding_time) => {
//     const req = { body: { userId: userId, codingTime: coding_time, } };

//     const res = { status: (code) => ({ send: (message) => console.log(`Response: ${code}, ${message}`) }) };
// };

// //logs directly to database; is called by server when an external request to the server is made
// export const server_postActivity = async (req, res, next) => {
//     console.log('Inside services server post activity!!')
//     const { activityDuration, startTime,activityType } = req.body;
//     console.log(activityDuration, startTime, activityType);
//     if (!activityDuration || !startTime || !activityType) {
//       res.status(400).send('Missing required field(s)');
//       return;
//     }
//     try {
//       await logActivity(activityDuration, startTime,activityType);
//       res.status(201).send('Activity recorded');
//     } catch (error) {
//       res.status(500).send('Error recording activity');
//     }
//   };

//   export const test_endpoint = async (req, res, next) => {
//     console.log('Inside services server test endpoint !!')
    
//   };

//   // export const server_getActivities = async (req: Request, res: Response, next: NextFunction ): Promise<void> => {
//   //   try {
//   //     const activities = await fetchActivities();
  
//   //     if (activities === null) {
//   //       res.status(404).send('No activities found');
//   //       return;
//   //     }

//   //     res.status(200).json(activities);
//   //   } catch (error) {
//   //     console.error('Error retrieving activities:', error);
//   //     res.status(500).send('Error retrieving activities');
//   //   }
//   // };
