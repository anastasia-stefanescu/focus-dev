import express from 'express';
import cassandra from 'cassandra-driver';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, REDIRECT_URI } from "./Constants";
import { fetchActivities } from "./Database/database";
import { server_postActivity } from "./Http/api_wrapper";  
import { Request, Response } from "express";
//import { getRedirectUri } from './Authentication/auth_actions_handler';
import {window} from 'vscode';

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

interface Auth0TokenResponse {
  access_token: string; 
  token_type: string;
  expires_in: number;
}

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

  // app.get('/authorize',  async (req: Request, res: Response) => {
  //   const { state } = req.query as {state : string};
  //   const redirectUri = getRedirectUri(state);
  //   res.redirect(redirectUri);
  // });

  app.get('/login', (req: Request, res: Response) => {
    const authUrl = `http://${AUTH0_DOMAIN}/authorize?` +
      `client_id=${AUTH0_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=openid profile email`;
    res.redirect(authUrl);
  });

  app.post('/callback', async (req: Request, res: Response) => {
    const code = req.body.code; // Auth0 sends the authorization code to your extension
    window.showInformationMessage(`Callback 1: Code received from uri handler: ${code}`);
    if (!code) {
      res.status(400).send('Authorization code is required');
      return;
    }
    try {
      // use https or http??
      const response = await axios.post<Auth0TokenResponse>(`https://${AUTH0_DOMAIN}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

      const accessToken = response.data.access_token;
      //const idToken = response.data.id_token; // Optional, depending on your Auth0 settings
      window.showInformationMessage(`Callback 2: token from oauth/token received: ${accessToken}`);
      res.json(accessToken);
    } catch (error) {
      console.error('Error exchanging token:', error);
      res.status(500).send('Token exchange failed');
    }
  });


  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    window.showInformationMessage(`Server running`);
    //postActivity();
  });
}
