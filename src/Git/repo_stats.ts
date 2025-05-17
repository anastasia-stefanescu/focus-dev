//Get url of the repo, even if not created by you
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function getRepoCredentials() {
    try {
        // Run the git command
        const { stdout, stderr } = await execPromise('git remote get-url origin', { cwd: process.cwd() });

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

//====================
// When user requests statistics
// Call for releases, deployments, PRs, main commits , branch commits, etc
// break down by branch, then master


