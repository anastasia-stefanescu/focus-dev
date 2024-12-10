
import { Request } from "express";
// auth login - used in : extension.ts (to create new session) (to be completed)
// get session from vscode authentication ( create if None!!)
// if session exists now, 
 // - get latest update time; 
 // - if it was never update or updated more than 3000 ago,
     // authProvider removes session (by account id)
     // create a new one (create if None)

function generateAccessToken(){

}

export function handleAuthentication(state: any) {
    const accessToken = generateAccessToken(); 
    const redirectUri = `${state.redirect_uri}?access_token=${accessToken}&state=${state}`;
    return redirectUri;
}


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

// RELOAD
// update flowmode status, initialize websockets, musicTime (!haha) - might skip
// await getUser again (reinitialize user + prefs)
//update session summary from server (get the instance and update it)
// execute vscode command refresh plugin





