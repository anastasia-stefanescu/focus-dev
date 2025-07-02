import { window, ExtensionContext, authentication, AuthenticationSession, commands } from 'vscode';
import { MyAuth0AuthProvider } from './auth_provider';
import { fetchUserData } from './user_handler';

export async function startAuthentication(context: ExtensionContext, authProvider: MyAuth0AuthProvider) {
    try {
        const session = await authentication.getSession(MyAuth0AuthProvider.id, [], { createIfNone: true });
        window.showInformationMessage(`Session creation. Logged in as: ${session.account.label}`);

        if (session) {
            window.showInformationMessage(`Session creation succeeded. Logged in as: ${session.account.label}`);

            // Handle the authenticated user, e.g., create/save a user.
            const user = await fetchUserData(session.accessToken); // Fetch user info.
            window.showInformationMessage(`Welcome, ${user.name}!`);
            if (user) {
                await authProvider.updateSessionWithUserInfo(session.accessToken, user, session);
                window.showInformationMessage(`Globalcontext: ${context.globalState.get('currentSession')}`)
                commands.executeCommand('code-stats.authComplete'); // Trigger the command to show the logged-in view.
            } else { window.showErrorMessage('User is null !!'); }
        }
    } catch (error) {
        window.showErrorMessage(`Authentication failed: ${error}`);
    }
}
