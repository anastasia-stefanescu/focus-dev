
import { Request } from "express";
import { ExtensionContext, window } from "vscode";
import { reload } from "../extension";
import { MyAuth0AuthProvider } from "./auth_provider";
import * as https from 'https';
import { AUTH0_DOMAIN } from "../Constants";
import axios from "axios";

let currentUser : UserData | null = null;

interface UserData {
    sub?: string;
    id?: string;
    name?: string;
    username?: string;
    
  }

export async function fetchUserData(accessToken: string) {
    const url = `https://${AUTH0_DOMAIN}/userinfo`;
    const response = await axios.get<UserData>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = response.data;
  console.log('USER DATA FETCHED:', data);
  return {
    id: data.sub || data.id,
    name: data.name || data.username,
  };
}













// auth login - used in : extension.ts (to create new session) (to be completed)
// get session from vscode authentication ( create if None!!)
// if session exists now,
 // - get latest update time;
 // - if it was never update or updated more than 3000 ago,
     // authProvider removes session (by account id)
     // create a new one (create if None)

async function setInSystemFile(key: string, value: any) {
    //await

}

function getFromSystemFile(key:string) {
    return '';
}

// export async function getUser(token_override: any = '') {
//   if (!currentUser)
//   {
//     try{
//   const resp = await appGet('/api/v1/user', {}, token_override);
//   if (isResponseOk(resp) && resp.data) {
//     currentUser = resp.data;
//     return currentUser;
//   }
// } catch(e){}
// }
//   return null;
// }


// create user (anonymous)
  // use flag to do this only once at a time (after one is finished creating, a new one can also be created)
  // get jwt from file, if jwt is not null (in what cases might it be true???)
  // - get plugin uuid from file (this is a bit more complicated)
  // - get callback state of authentication ?
  // - get username from os, timezone, hostname
  // - POST USER TO API with timezone, username, plugin id, hostname, callback state
  // - if response is ok and it has data
        // - set the plugin jwt in file as resp.data.plugin_jwt (who procures this jwt?? Authentication??)
        // if response.data.registered is null => set name in file as null
        // set callback state null ('')



// get user from cache (verify there isn't already one) ??

// app get to fetch user from cache ??

// get user
// get from server (also with overriding token!)
// also verify the response is ok and it contains data

// complete authentication
// set authCallback state - something in the file
// if user is registered - set current user;
    // NEW USER ?  - if we also have new jwt token or user has a plugin jwt - override in file
    //set name of user and when it was updated in file, set logging in - false
    // ENSURE SESSION IS UPDATED: if we have an authProvider, update the session
    // RELOAD!!!

    // export async function saveUser(user: any, override_jwt: any = '', authProvider: MyAuth0AuthProvider) {
    //     //setAuthCallbackState(null); !!!!!!!

    //     if (user?.registered === 1) {
    //       currentUser = user;
    //       // new user
    //       if (override_jwt) {
    //         setInSystemFile('jwt', override_jwt);
    //       } else if (user.plugin_jwt) {
    //         setInSystemFile('jwt', user.plugin_jwt);
    //       }
    //       setInSystemFile('name', user.email);
    //       setInSystemFile('updatedAt', new Date().getTime());

    //       setInSystemFile('logging_in', false);
    //       // ensure the session is updated
    //       if (authProvider) {
    //         authProvider.updateSession(getFromSystemFile('jwt'), user);
    //       }
    //       // update the login status
    //       window.showInformationMessage('Successfully logged on to Code Time');

    //       await reload(); // from extension.ts
    //     }
    //   }

// RELOAD
// update flowmode status, initialize websockets, musicTime (!haha) - might skip
// await getUser again (reinitialize user + prefs)
//update session summary from server (get the instance and update it)
// execute vscode command refresh plugin
