import { authentication, AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, AuthenticationSession} from 'vscode';
import { Disposable, EventEmitter, ExtensionContext, commands }from "vscode";
import { ProgressLocation }from 'vscode';

import { window } from "vscode";
import { v4 as uuid } from 'uuid';
import {Uri, UriHandler } from 'vscode';
import {env, Event} from 'vscode';
// import { getUser } from './user_handler';
// import { saveUser } from './user_handler';

//export const AUTH_TYPE = `auth0`;
//const AUTH_NAME = `Auth0`;
// Also Auth domain??
//const SESSIONS_SECRET_KEY = `${AUTH_TYPE}.sessions`;

let instance : MyAuth0AuthProvider;
export const _tokenEmitter = new EventEmitter<string>(); 

export class MyAuth0AuthProvider extends Disposable implements AuthenticationProvider  {
    public static readonly id = 'auth0-auth-provider';
    private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private _disposable = Disposable;
    private _sessions: AuthenticationSession[] = [];
    private _context: ExtensionContext;
    //public 
    public _token: string | undefined;

    constructor(private readonly context: ExtensionContext) {
        super(() => this.dispose());
        this._context = context;
       
        this._register(context, authentication.registerAuthenticationProvider(MyAuth0AuthProvider.id, 'Auth0', this, {supportsMultipleAccounts : false}));
        this._register(context, window.registerUriHandler({
            handleUri: async (uri: Uri) => {
                const token = await handleRedirectUri(uri);
                if (token) {
                    _tokenEmitter.fire(token);
                }
        }}))

        const storedSessions = this.context.globalState.get<AuthenticationSession[]>('auth0-sessions', []);
        if (storedSessions) {
            this._sessions = storedSessions;
        }

        instance = this;
    }

    private _register<T extends Disposable>( context: ExtensionContext, disposable: T): T {
        context.subscriptions.push(disposable);
        return disposable;
    }

    get onDidChangeSessions() { //An Event which fires when the array of sessions has changed, or data within a session has changed.
        return this._sessionChangeEmitter.event;
      }

    async getSessions(scopes?: string[]): Promise<AuthenticationSession[]> {
        if (scopes) {
            return this._sessions.filter(session => scopes.every(scope => session.scopes.includes(scope)));
        }
        return this._sessions;
    }

    async createSession(scopes: string[]): Promise<AuthenticationSession> {

        const token = await commands.executeCommand<Promise<string>>('code-stats.authLogin');

        window.showInformationMessage(`Token received in CreateSession ${token}`);
        
            const session: AuthenticationSession = {
                id: uuid(),
                account: { id: '', label: '' },
                scopes,
                accessToken: token,
            };
            window.showInformationMessage(`Session: ${session}`);
            this._sessions.push(session);
            // Set the current session in global state
            await this.context.globalState.update('currentSession', session);

            return session;
    }

    async updateSessionWithUserInfo(token: string, user: any, session: AuthenticationSession): Promise<AuthenticationSession>{
        const sessionIndex = this._sessions.findIndex(s => s.id === session.id);
        if (sessionIndex !== -1) {

            const updatedSession : AuthenticationSession = {
                id: session.id,
                account: { id: user.id, label: user.name },
                scopes: session.scopes,
                accessToken: token,
            } 
            this._sessions[sessionIndex] = updatedSession;
            try{
                await this.context.globalState.update('currentSession', updatedSession);
                window.showInformationMessage('Session successfully updated.');
                return updatedSession;
            }catch(e) { window.showErrorMessage('Global context could not be updated');}
        } else {
            window.showErrorMessage('Session not found.');
        }
        return session;
    }

    async removeSession(sessionId: string): Promise<void> {
        this._sessions = this._sessions.filter(session => session.id !== sessionId);
        await this.context.globalState.update('currentSession', null);
    }


    
    
    
}

async function handleRedirectUri(uri : Uri) {
    const query = new URLSearchParams(uri.query);
    const auth_code = query.get('code');

    if (auth_code) {
        const token = await exchangeAuthCodeForToken(auth_code);
        //instance._token = token;
        _tokenEmitter.fire(token);
        //return token
    } else {
    window.showErrorMessage('Authorization failed: No code received');
    return '';
    }
}


async function exchangeAuthCodeForToken(code : any) {
try {
    const response = await fetch('http://localhost:3001/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    });
    if (response.ok) {
        const data = await response.json();
        window.showInformationMessage(`Data:  ${data}`);
        // const accessToken = (data as { accessToken: string }).accessToken;
        // window.showInformationMessage(`Data:  ${data}`);
        return data;
    
    } else {
    window.showErrorMessage('Token exchange failed');
    return;
    }
} catch (error) {
    window.showErrorMessage('Error during token exchange');
    return;
}
}

