
import { GitTracking } from "../Git/local_git_tracking";

export async function testLocalGitTracking() {
    const gitInstance = await GitTracking.getInstance();

    if (!gitInstance) {
        console.log('GitTracking instance is not available');
        return;
    }
}
