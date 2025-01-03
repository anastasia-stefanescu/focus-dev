import { AxiosError } from "axios";
import axios from 'axios';
import { logActivity } from './database/database';
import { Query } from 'express-serve-static-core';
import { Request, Response } from "express";
import { NextFunction } from "express";


const base_url = 'http://localhost:3001';

interface ActivityRequest {
    userId: string;
    codingTime:number;
}

export const http_post_request = async (userId : string, coding_time: number) => {
    const req = { body: { userId: userId, codingTime: coding_time, } } as unknown as Request;

    const res = { status: (code: number) => ({ send: (message: string) => console.log(`Response: ${code}, ${message}`) }) } as unknown as Response;
};

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

export const server_getActivity = async (req: Request<{}, {}, A)

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
    } else if (resp?.code === 'ECONNABORTED') {
      status = 500;
    } else if (resp?.code === 'ECONNREFUSED') {
      status = 503;
    }
    return status;
  }

