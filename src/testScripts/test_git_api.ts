import { getBranches, getBranch, getBranchLastCommitData, getBranchPullRequestsData, } from '../Git/git_api';
import { CommitData, PRData } from '../Git/git_models';
import { GitTracking } from '../Git/local_git_tracking';

export async function testGitApi() {
    const gitInstance = await GitTracking.getInstance();

    if (!gitInstance) {
        console.log('GitTracking instance is not available');
        return;
    }

    const branches = await getBranches(gitInstance.projectName, gitInstance.gitOwner);
    console.log('Branches:', branches);

    const branch = await getBranch(gitInstance.projectName, gitInstance.gitOwner, 'backup');
    console.log('Branch:', branch);

    const commitData : CommitData | null = await getBranchLastCommitData(gitInstance.projectName, gitInstance.gitOwner, 'backup');
    console.log('Commit data:', commitData?.author, commitData?.date, commitData?.id, commitData?.branch);

    const prs : PRData[] = await getBranchPullRequestsData(gitInstance.projectName, gitInstance.gitOwner, 'backup', 'all');
    console.log('Pull requests:', prs);
}
