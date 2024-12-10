const express = require('express');
const cassandra = require('cassandra-driver');
const bodyParser = require('body-parser');
const cors = require('cors');

import { logActivity, fetchActivities } from "./database";
import { http_post_request, postActivity, local_postActivity } from "./src/Http/api_wrapper";  
import { post } from "axios";
import { Request, Response } from "express";

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'], // Replace with your Cassandra nodes
  localDataCenter: 'datacenter1', // Adjust for your setup
  keyspace: 'code_stats', // Replace with your keyspace
});

app.get('/', (req: Request, res:Response) => {
  res.send('Hello, TypeScript with Node.js!');
});

// API Endpoints

app.post('/activity', local_postActivity);

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

  postActivity();
});

