import express from 'express';
import cassandra from 'cassandra-driver';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import { activityRouter } from './routes/activityRouter';
import { dashboardRouter } from './routes/dashboardRouter';
import { inferenceRouter } from './routes/inferenceRouter';
import { test_endpoint  } from './server_actions';
 
import { Request, Response } from "express";

const port = 3002;

const app = express();
app.set('port', port);

// Middleware
app.use(express.json());
app.use(cors());

app.get('/', (req: Request, res:Response) => {
    res.send('Hello, TypeScript with Node.js!');
});

//app.post('/dashboard', test_endpoint)

//Routing
app.use('/activity', activityRouter);
app.use('/dashboard', dashboardRouter);
app.use('/inference', inferenceRouter);

export default app;



