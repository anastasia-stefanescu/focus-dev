import axios from 'axios';

import { logActivity } from '../../database';

// const api_client = axios.create({
//     baseURL : '${base_url}',
//     timeout : 15000
// });

const base_url = 'http://localhost:3001';

export const http_post_request = async (userId : string, coding_time: number) => {
    const req = { body: { userId: userId, codingTime: coding_time, } } as unknown as Request;

    const res = { status: (code: number) => ({ send: (message: string) => console.log(`Response: ${code}, ${message}`) }) } as unknown as Response;
};

export const postActivity = async (endpoint: string, content: any) => {
    try {
        const response = await axios.post(base_url + endpoint, content );
        console.log('Response:', response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data);
        } else {
            console.error('Unknown error:', error);
        }
    }
};

//logs directly to database; is called by server when an external request to the server is made
export const local_postActivity = async (req: Request, res: Response) => {
    const { userId, codingTime } = req.body;
    if (!userId || !codingTime) {
      return res.status(400).send('Missing required fields: userId or codingTime');
    }
    try {
      await logActivity(userId, codingTime);
      res.status(201).send('Activity recorded');
    } catch (error) {
      res.status(500).send('Error recording activity');
    }
  };

