import express from 'express';
import cassandra from 'cassandra-driver';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import { postActivity, server_postActivity } from './server_actions';
 
import { Request, Response } from "express";

const app = express();
const port = 3002;

// Middleware
app.use(bodyParser.json());
app.use(cors());

export function getServerRunning() {

  app.get('/', (req: Request, res:Response) => {
    res.send('Hello, TypeScript with Node.js!');
  });

  // API Endpoints
  app.post('/activity', server_postActivity);

  app.get('/dashboard', async (req:Request, res:Response) => {
    //const query = 'SELECT * FROM activities';
    try {
      const result = await fetchActivities();
      res.json(result.rows);
    } catch (error) {
      res.status(500).send('Error fetching data');
    }
  });


  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    // window.showInformationMessage(`Server running`);
    //postActivity();
  });
}
