import express from 'express';
import cassandra from 'cassandra-driver';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, REDIRECT_URI } from "./Constants";
import { fetchActivities } from "./Database/database";
import {  server_handleAuthentication, server_postActivity } from "./Http/api_wrapper";  
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

app.get('/authorize', server_handleAuthentication);

app.get('/login', (req: Request, res: Response) => {
  const authUrl = `https://${AUTH0_DOMAIN}/authorize?` +
    `client_id=${AUTH0_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=openid profile email`;
  res.redirect(authUrl);
});

app.post('/callback', async (req: Request, res: Response) => {
  const code = req.body.code; // Auth0 sends the authorization code to your extension
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
    });

    const accessToken = response.data.access_token;
    const idToken = response.data.id_token; // Optional, depending on your Auth0 settings

    res.json({ accessToken, idToken });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).send('Token exchange failed');
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);

  //postActivity();
});

