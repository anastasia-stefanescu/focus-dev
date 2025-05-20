import { getPullRequests, getBranchPullRequestsData, getBranches, PRData } from "./git_api";

// when we are asked for statistics, we have to do the statistics for the whole time

// we have to get all the repos to which the user is contributor

// we might have commits that are both in main and another branch; keep a {set} of all commits so we don't have duplicates

async function getAllReposData() {
    //const allRepos = await
}

async function getAllRepoSuccessIndicators(projectName: string, owner: string) {

    const allBranches = await getBranches(projectName, owner);

    for (const branch of allBranches) {
        const branchName = branch.name;
        const openPullRequests = await getBranchPullRequestsData(projectName, owner, branchName);
        const closedPullRequests : PRData[] = await getBranchPullRequestsData(projectName, owner, branchName);

        for (const pr of closedPullRequests) {
            console.log(`Open PR: ${pr.title}, number: ${pr.number}, branch: ${pr.source}, state: ${pr.state}`);

            const no_commits = pr.commits.length;
            for (let i = 0; i< no_commits; i++) {


            }
        }
    }
}
