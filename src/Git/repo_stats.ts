//Get url of the repo, even if not created by you
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { workspace, authentication, window } from 'vscode';

const execPromise = util.promisify(exec);

export async function getRepoCredentials() {
    console.log('Fetching repository credentials...');

    const folders = workspace.workspaceFolders;
    let workspaceRoot = '';
    if (folders && folders.length > 0) {
        workspaceRoot = folders[0].uri.fsPath;
        console.log('Workspace root:', workspaceRoot);
    }

    try {
        // Run the git command
        const { stdout, stderr } = await execPromise('git remote get-url origin', { cwd: workspaceRoot });

        console.log('Git command executed successfully:', stdout);
        if (stderr) {
            throw new Error(`Error: ${stderr}`);
        }

        if (!stdout) {
            throw new Error('No output from git command');
        }

        // Parse the output to extract repo info
        const url = stdout.trim();  // Get the URL of the repo
        const urlParts = url.split('/');
        const owner = urlParts[3];  // Username or organization name
        const repoName = urlParts[4].replace('.git', '');  // Repository name

        return { owner, repoName };
    } catch (error) {
        throw new Error(`Error executing git command: ${error}`);
    }
}

export async function getGitCredentials() {
  const session = await authentication.getSession('github', ['repo'], { createIfNone: true });
  const token = session.accessToken;
  window.showInformationMessage(`GitHub token: ${token}`);

  const { owner, repoName } = await getRepoCredentials();
  window.showInformationMessage(`GitHub Repo: ${owner}, ${repoName}`);

  return { token, owner, repoName };
}

//====================
// When user requests statistics
// Call for releases, deployments, PRs, main commits , branch commits, etc
// break down by branch, then master


