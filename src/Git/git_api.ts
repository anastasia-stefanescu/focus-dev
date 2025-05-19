import {window} from 'vscode';
import { GitTracking } from './local_git_tracking';
import { BranchData, CommitData, PRData, projectData } from './git_models';
// Get commits in descending order
// check for (second) author.login, sha, commit.committer.date
// -> get date of latest commit for branch for comparison


let gitToken: string = '';

async function getGitToken() {
    if (!gitToken) {
        const instance = await GitTracking.getInstance();
        gitToken = instance?.gitToken || '';
    }
}


async function fetchGitApi(url: string) {
    await getGitToken();

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${gitToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        if (!response.ok && response.status === 404) {
            window.showErrorMessage('Object not found. Please check the repository name and owner.');
            return null;
        }

        const allObjects = await response.json();
        return allObjects;
    } catch (error) {
        console.error('Error fetching deployments:', error);
        return undefined;
    }
}
// Get Releases

export async function getUserRepositories(username: string) : Promise<projectData[]> {
    const url = `https://api.github.com/users/${username}/repos`;

    const allRepos = await fetchGitApi(url);

    for (const repo of allRepos) {
        const branches : BranchData[] = await getBranches(repo.name, repo.owner.login);
        for (const branch of branches) {
            const branchName = branch.name;
            const allPullRequests : PRData[] = await getBranchPullRequestsData(repo.name, repo.owner.login, branchName, 'all');
            const allCommits : CommitData[] = await getBranchLastCommitData(repo.name, repo.owner.login, branchName);

            for (const pr of allPullRequests) {
                console.log(`Open PR: ${pr.title}, number: ${pr.number}, branch: ${pr.source}, state: ${pr.state}`);
            }
        }
    }
    return allRepos;
}

export async function getReleases(projectName: string, owner: string) {
    const url = `https://api.github.com/repos/${owner}/${projectName}/releases`;

    const allReleases = await fetchGitApi(url);
    return allReleases;
}

// Get deployments
export async function getDeployments(projectName: string, owner: string) {
    const url = `https://api.github.com/repos/${owner}/${projectName}/deployments`;

    const allDeployments = await fetchGitApi(url);
    return allDeployments;
}

export async function getPullRequests(projectName: string, owner: string, state: 'closed' | 'open' | 'all') {
    let url = `https://api.github.com/repos/${owner}/${projectName}/pulls?state=${state}`;
    const allPRs = await fetchGitApi(url);
    return allPRs;
}

// Get branches
// name, commit.sha, commit.url (also commit date?)
export async function getBranches(projectName: string, owner: string) {
    const url = `https://api.github.com/repos/${owner}/${projectName}/branches`;

    const allBranches = await fetchGitApi(url);
    return allBranches;
}

export async function getBranch(projectName: string, owner: string, branchName: string) {
    const url = `https://api.github.com/repos/${owner}/${projectName}/branches/${branchName}`;

    const allBranches = await fetchGitApi(url);

    if (allBranches === null) {
        console.error('Branch does not exist');
        return null;
    }
    return allBranches;
}

async function getCommitData(projectName: string, owner: string, commit_id: string, branch: string | undefined = undefined) : Promise<CommitData>{
    const url = `https://api.github.com/repos/${owner}/${projectName}/commits/${commit_id}`;

    const commitData = await fetchGitApi(url);
    const commit: CommitData = {
        id: commit_id,
        title: commitData.commit.message,
        branch: branch,
        author: commitData.commit.author.name,
        date: commitData.commit.committer.date
    }

    return commit;
}

export async function getPullRequestCommitData(projectName: string, owner: string, number: number, branchName : string | undefined = undefined) : Promise<CommitData[]> {
    const url = `https://api.github.com/repos/${owner}/${projectName}/pulls/${number}/commits`;

    const allCommits = await fetchGitApi(url);
    const commitsData = [];
    for (const commit of allCommits) {
        const commitData : CommitData = {
            id: commit.sha,
            title: commit.commit.message,
            branch: branchName || '',
            author: commit.commit.author.name,
            date: commit.commit.committer.date
        }
        commitsData.push(commitData);
    }
    return commitsData;
}

export async function getBranchLastCommitData(projectName:string, owner: string, branchName: string) : Promise<CommitData | null> {
    const allBranches = await getBranches(projectName, owner);

    if (!allBranches) {
        console.error('No branches found');
        return null;
    }

    const branch = allBranches.filter((branch: any) => branch.name === branchName)[0];
    const commit_id = branch.commit.sha;
    const commitData : CommitData = await getCommitData(projectName, owner, commit_id, branchName);

    return commitData;
}

export async function getBranchCommits(project)

export async function getBranchPullRequestsData(projectName: string, owner: string, branchName: string | undefined, state: 'closed' | 'open' | 'all') : Promise<PRData[]> {
    let allPRs = await getPullRequests(projectName, owner, state);

    if (branchName)
        allPRs = allPRs.filter((PR: any) => PR.head.ref === branchName);

    const PRsData : PRData[] = [];
    for (const PR of allPRs) {
        const number = PR.number;
        const commits : CommitData[] = await getPullRequestCommitData(projectName, owner, number, branchName);

        const PRdata : PRData = {
            id : PR.id,
            title: PR.title,
            number: number,
            state: PR.state,
            source: PR.head.ref,
            destination: PR.base.ref,
            author: PR.user.login,
            createdAt: PR.created_at,
            updatedAt: PR.updated_at,
            closedAt: PR.closed_at,
            commits: commits
        };
        PRsData.push(PRdata);
    }
    return PRsData;
}



