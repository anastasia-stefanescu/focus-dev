import { AxiosError } from "axios";
import axios from 'axios';
import { logActivity, fetchActivities } from '../database/database';
import { Query } from 'express-serve-static-core';
import { Request, Response } from "express";
import { NextFunction } from "express";
import { v4 as uuidv4 } from 'uuid';

const base_url = 'http://localhost:3001';

interface ActivityRequest {
    activityDuration: number,
    startTime:number, 
    activityType:string
}

export const http_post_request = async (userId : string, coding_time: number) => {
    const req = { body: { userId: userId, codingTime: coding_time, } } as unknown as Request;

    const res = { status: (code: number) => ({ send: (message: string) => console.log(`Response: ${code}, ${message}`) }) } as unknown as Response;
};

//logs directly to database; is called by server when an external request to the server is made
export const server_postActivity = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    console.log('Inside services server post activity!!')
    const { activityDuration, startTime,activityType } = req.body;
    console.log(activityDuration, startTime, activityType);
    if (!activityDuration || !startTime || !activityType) {
      res.status(400).send('Missing required field(s)');
      return;
    }
    try {
      await logActivity(activityDuration, startTime,activityType);
      res.status(201).send('Activity recorded');
    } catch (error) {
      res.status(500).send('Error recording activity');
    }
  };

  export const test_endpoint = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    console.log('Inside services server test endpoint !!')
    
  };

  // export const server_getActivities = async (req: Request, res: Response, next: NextFunction ): Promise<void> => {
  //   try {
  //     const activities = await fetchActivities();
  
  //     if (activities === null) {
  //       res.status(404).send('No activities found');
  //       return;
  //     }

  //     res.status(200).json(activities);
  //   } catch (error) {
  //     console.error('Error retrieving activities:', error);
  //     res.status(500).send('Error retrieving activities');
  //   }
  // };

  export function isResponseOk(resp: any) {
    let status = getResponseStatus(resp);
    if (status && resp && status < 300) {
      return true;
    }
    return false;
  }
  

  function getResponseStatus(resp: any) {
    let status = null;
    if (resp?.status) {
      status = resp.status;
    } else if (resp?.response && resp.response.status) {
      status = resp.response.status;
    }
    // } else if (resp?.code === 'ECONNABORTED') {
    //   status = 500;
    // } else if (resp?.code === 'ECONNREFUSED') {
    //   status = 503;
    // }
    return status;
  }

