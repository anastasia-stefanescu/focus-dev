import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';

import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_DOMAIN, REDIRECT_URI } from "./Constants";
import { Request, Response } from "express";
//import { getRedirectUri } from './Authentication/auth_actions_handler';
import {window} from 'vscode';

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

interface Auth0TokenResponse {
  access_token: string; 
  token_type: string;
  expires_in: number;
}

export function getServerRunning() {

  app.get('/', (req: Request, res:Response) => {
    res.send('Hello, TypeScript with Node.js!');
  });

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
