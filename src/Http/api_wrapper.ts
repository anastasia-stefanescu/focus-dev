import { AxiosError } from "axios";

import axios from 'axios';
import { logActivity } from '../Database/database';
import { handleAuthentication } from '../Authentication/auth_actions_handler';
import { Query } from 'express-serve-static-core';
import { Request, Response } from "express";
import { NextFunction } from "express";
// const api_client = axios.create({
//     baseURL : '${base_url}',
//     timeout : 15000
// });

const base_url = 'http://localhost:3001';

interface ActivityRequest {
    userId: string;
    codingTime:number;
}

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
            let e = error as AxiosError;
            console.error('Axios error:', e.response?.data);
        } else {
            console.error('Unknown error:', error);
        }
    }
};

export const server_handleAuthentication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { state } = req.query as {state : string};
    const redirectUri = handleAuthentication(state);
    res.redirect(redirectUri);
}

//logs directly to database; is called by server when an external request to the server is made
export const server_postActivity = async (req: Request<{}, {}, ActivityRequest>, res: Response, next: NextFunction):Promise<void> => {
    const { userId, codingTime } = req.body as ActivityRequest;
    if (!userId || !codingTime) {
      res.status(400).send('Missing required fields: userId or codingTime');
      return;
    }
    try {
      await logActivity(userId, codingTime);
      res.status(201).send('Activity recorded');
    } catch (error) {
      res.status(500).send('Error recording activity');
    }
  };

