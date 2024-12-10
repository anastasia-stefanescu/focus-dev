// const { authentication, AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, AuthenticationSession}from 'vscode';
// const { Disposable, EventEmitter, ExtensionContext }from "vscode";
// const { ProgressLocation }from 'vscode';

// const { window } from "vscode";
// const { v4 as uuid } from 'uuid';
// const {Uri, UriHandler } from 'vscode';
// const {env, Event } from 'vscode';

// export const AUTH_TYPE = `auth0`;
// const AUTH_NAME = `Auth0`;
// // Also Auth domain??
// const SESSIONS_SECRET_KEY = `${AUTH_TYPE}.sessions`;

// let instance : MyAuthProvider;

// export class MyAuthProvider implements AuthenticationProvider, Disposable{
//     private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
//     private _disposable: Disposable;
//     private _pendingStates: string[] = [];
//     private _codeExchangePromises = new Map<string, {promise: Promise<string>; cancel: EventEmitter<void>}> ();
//     private _uriHandler = new UriEventHandler();

//     constructor(private readonly context: ExtensionContext) {
//         this._disposable = Disposable.from(
//             authentication.registerAuthenticationProvider(AUTH_TYPE, AUTH_NAME, this, { supportsMultipleAccounts: false }),
//             window.registerUriHandler(this._uriHandler)
//           ) 
//           instance = this;
//     } 
//     get onDidChangeSessions() {
//         return this._sessionChangeEmitter.event;
//       }

//     public async getSessions(scopes?: string[]): Promise<readonly AuthenticationSession[]> {
//       const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
//       if (allSessions) {
//         return JSON.parse(allSessions) as AuthenticationSession[];
//       }
//       return [];
//     }

//     public async createSession(scopes: string[]): Promise<AuthenticationSession> {
//         try{
//           const token = await this.login(scopes);
//           return this.updateSession(token);
          
//         } catch (e){
//             window.showErrorMessage('Could not get token, sign in failed');
//             throw e;
//         }
//         // await token received from login() + verify it's ok
//         // update session directly with the token
//       }

//     // why we integrate creating the session in updating it? 
//     // updating is used when: 
//     public async updateSession(jwt_token: string, user: any = null): Promise<AuthenticationSession> {
//         let session : AuthenticationSession =  {
//           id: uuid(),
//           accessToken: jwt_token,
//           account: {
//             label: '',
//             id: ''
//           },
//           scopes: []
//         }

//         try{
//           const update = !!user; // bool of user - user exists => update = true
//           //if user doesn't exist, we actually create a session
//           if (!user) { // if user doesn't exist
//             user = await getUser(jwt_token);
//             // await complete authentication !!!!
//           }

//           const session : AuthenticationProvider=  {
//             id: uuid(),
//             accessToken: jwt_token,
//             account: {
//               label: user.name,
//               id: user.email
//             },
//             scopes: []
//           }
        
//           const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
//           let sessions = allSessions ? JSON.parse(allSessions) as AuthenticationSession[] : [];
//           sessions = sessions.filter(s => s.id !== session.id);
//           sessions.push(session);
//           await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions));
          
//           if (!update) 
//             this._sessionChangeEmitter.fire({ added: [], removed: [], changed: [session] });
//           else
//             this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });

//         } catch (e){
//           window.showErrorMessage('Could not get user, sign in failed');
//           throw e;
//         }
//         return session;
  
//         }



//     }

//     public async removeSession(sessionId: string): Promise<void> {
//       const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
//       if (allSessions) {
//         let sessions = JSON.parse(allSessions) as AuthenticationSession[];
//         const sessionIdx = sessions.findIndex(s => s.id === sessionId);
//         const session = sessions[sessionIdx];
//         sessions.splice(sessionIdx, 1);
  
//         await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions));
  
//         if (session) {
//           this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
//         }      
//       }
//     }

//     public async dispose() { // Despise the registered services
//         this._disposable.dispose();
//     }


//     //The login method does the following things:
//     // - Create a unique state ID and store it. The state ID gets verified after the sign-in;
//     // - Verify if the default permission scopes are added (openid, profile, and email);
//     // - Create the authorize URL with its required query string parameters; The redirect_uri is very constant.
//     // - Open the authorize URL in your browser;
//     // - Wait for the token to come back, which gets handled in the handleUri method.

//     private async login(scopes: string[] = []) { // TODO : See how the url is built !!!!!!!!! 

//         return await window.withProgress<string>({
//             location: ProgressLocation.Notification,
//             title: "Signing in to Auth0...",
//             cancellable: true
//           }, async (_, token) => {

//             const stateId = uuid();
//             this._pendingStates.push(stateId);
//             const scopeString = scopes.join(' ');

//             // in extensie avem si urmatoarele:
//             // params.append('plugin_uuid', getPluginUuid());
//             // params.append('plugin_id', `${getPluginId()}`);
//             // params.append('plugin_version', getVersion());
//             // params.append('auth_callback_state', getAuthCallbackState(true));
//             const searchParams = new URLSearchParams([
//                 ['response_type', "token"],
//                 //['client_id', CLIENT_ID], // acesta nu este folosit in extensie
//                 ['redirect_uri', this.redirectUri],
//                 ['state', stateId],
//                 ['scope', scopeString],
//                 ['prompt', "login"]
//               ]);
//               const uri = Uri.parse(`https://${AUTH0_DOMAIN}/authorize?${searchParams.toString()}`);
//               await env.openExternal(uri);

//               let codeExchangePromise = this._codeExchangePromises.get(scopeString);
//               if (!codeExchangePromise) {
//                 codeExchangePromise = promiseFromEvent(this._uriHandler.event, this.handleUri(scopes));
//                 this._codeExchangePromises.set(scopeString, codeExchangePromise);
//               }

//               try {
//                 return await Promise.race([
//                   codeExchangePromise.promise,
//                   new Promise<string>((_, reject) => setTimeout(() => reject('Cancelled'), 120000)), //2 min timeout
//                   //constANT: WEBSOCKET LOGIN CHECK - Websocket is used in case the login fails
//                   promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => { reject('User Cancelled'); }).promise
//                 ]);
//               } finally {
//                 this._pendingStates = this._pendingStates.filter(n => n !== stateId);
//                 codeExchangePromise?.cancel.fire();
//                 this._codeExchangePromises.delete(scopeString);
//               }
//           });

//     }


//     // Redirect back to vscode after sign infrom Auth0
//     private handleUri: (scopes: readonly string[]) => PromiseAdapter<Uri, string> = (scopes) => async (uri, resolve, reject) => {
//       const query = new URLSearchParams(uri.fragment);
//       const access_token = query.get('access_token');
//       const state = query.get('state');

//       if (!access_token) {
//         reject(new Error('No token'));
//         return;
//       }
//       if (!state) {
//         reject(new Error('No state'));
//         return;
//       }

//       // Check if it is a valid auth request started by the extension
//       if (!this._pendingStates.some(n => n === state)) {
//         reject(new Error('State not found'));
//         return;
//       }

//       resolve(access_token);
//     }


//     private async getUserInfo(token: string) {
//       const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });
//       return await response.json();
//     }
    
// }

// export function getAuthInstance(): MyAuthProvider {
//   if (!instance) {
//     throw new Error('AuthenticationProvider not initialized');
//   }
//   return instance;
// }

// class UriEventHandler extends EventEmitter<Uri> implements UriHandler {
// 	public handleUri(uri: Uri) {
// 		this.fire(uri);
// 	}
// }

// export interface PromiseAdapter<T, U> {
// 	(
// 		value: T,
// 		resolve:
// 			(value: U | PromiseLike<U>) => void,
// 		reject:
// 			(reason: any) => void
// 	): any;
// }

// const passthrough = (value: any, resolve: (value?: any) => void) => resolve(value);

// /**
//  * Return a promise that resolves with the next emitted event, or with some future event as decided by an adapter.
//  * If specified, the adapter is a function that will be called with `(event, resolve, reject)`. It will be called once per event until it resolves or rejects.
//  * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
//  *
//  * @param event the event
//  * @param adapter controls resolution of the returned promise
//  * @returns a promise that resolves or rejects as specified by the adapter
//  */

// export function promiseFromEvent<T, U>(event: Event<T>, adapter: PromiseAdapter<T, U> = passthrough): { promise: Promise<U>; cancel: EventEmitter<void> } {
// 	let subscription: Disposable;
// 	let cancel = new EventEmitter<void>();
  
// 	return {
// 		promise: new Promise<U>((resolve, reject) => {
// 			cancel.event(_ => reject('Cancelled'));
// 			subscription = event((value: T) => {
// 				try {
// 					Promise.resolve(adapter(value, resolve, reject))
// 						.catch(reject);
// 				} catch (error) {
// 					reject(error);
// 				}
// 			});
// 		}).then(
// 			(result: U) => {
// 				subscription.dispose();
// 				return result;
// 			},
// 			error => {
// 				subscription.dispose();
// 				throw error;
// 			}
// 		),
// 		cancel
// 	};
// }


