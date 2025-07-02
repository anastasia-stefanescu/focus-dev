//Get url of the repo, even if not created by you
import { exec } from 'child_process';
import util from 'util';
import { workspace, authentication, window } from 'vscode';

const execPromise = util.promisify(exec);

async function executeTerminalGitCommand(command: string) : Promise<string> {
    console.log('Fetching repository credentials...');

    const folders = workspace.workspaceFolders;
    let workspaceRoot = '';
    if (folders && folders.length > 0) {
        workspaceRoot = folders[0].uri.fsPath;
        console.log('Workspace root:', workspaceRoot);
    }

    try {
        // Run the git command
        const { stdout, stderr } = await execPromise(command, { cwd: workspaceRoot });

        console.log('Git command executed successfully:', stdout);
        if (stderr)
            throw new Error(`Error: ${stderr}`);

        if (!stdout)
            throw new Error('No output from git command');

        return stdout.trim();
    }
    catch (error) {
        // in case git is not initialized
        console.error('Command execution failed: ', command + 'error: ' + error);
        console.error('Git is probably not initialized in this workspace');
        window.showErrorMessage('Command execution failed: ', command +  'error: ' + error);
        return '';
    }

}

export async function getRepoCredentials() {
    let owner = undefined;
    let repoName = undefined;

    const url: string = await executeTerminalGitCommand('git remote get-url origin');  // Get the URL of the repo
    if (url) {
        const urlParts = url.split('/');
        owner = urlParts[3];  // Username or organization name
        repoName = urlParts[4].replace('.git', '');  // Repository name
    }
    return { owner, repoName};
}

export async function getGitCredentials() {

  const session = await authentication.getSession('github', ['repo'], { createIfNone: false });
  let token = '';
  let accountLabel = '';
  if (session) {
    token = session.accessToken;
    accountLabel = session.account.label;
  }
  console.log('GitHub token:', token);
  console.log('GitHub account label:', accountLabel);
  //window.showInformationMessage(`GitHub token: ${token}`);

  const { owner, repoName } = await getRepoCredentials();
  console.log('GitHub Repo:', owner, repoName);
  //window.showInformationMessage(`GitHub Repo: ${owner}, ${repoName}`);

  return { accountLabel, token, owner, repoName };
}

export async function getGitBranchReflogs(branch: string | undefined) : Promise<string[]> {
    if (!branch)
        branch = '--all';

    const reflogs = await executeTerminalGitCommand(`git reflog ${branch}`);
    console.log('Reflogs:', reflogs);

    const reflogEntries = reflogs.split('\n').map(entry => entry.trim());
    return reflogEntries;
}

//====================
// When user requests statistics
// Call for releases, deployments, PRs, main commits , branch commits, etc
// break down by branch, then master


