import { sqlInstance, debug_efficiency_aggregate } from "../extension";
import { SuccessIndicator, SuccessType } from "../EventTracking";

function _debug_logs(message: string) {
    if (debug_efficiency_aggregate) {
        console.log(message);
    }
}

export async function getSuccessIndicators(start: Date, end: Date, projectName: string | undefined = undefined,
    branch: string | undefined = undefined): Promise<any[]>
{
    const successIndicators :any[] = await sqlInstance.executeSelect('successIndicator', start.getTime().toString(), end.getTime().toString(), projectName, branch);

    _debug_logs(`Success indicators from ${start.toISOString()} to ${end.toISOString()} for project ${projectName} and branch ${branch}`);
    _debug_logs(`Success indicators: ${JSON.stringify(successIndicators)}`);

    const releases : SuccessIndicator[] = successIndicators.filter(indicator => indicator.type === 'release');
    const deployments : SuccessIndicator[] = successIndicators.filter(indicator => indicator.type === 'deployment');
    const pushes: SuccessIndicator[] = successIndicators.filter(indicator => indicator.type === 'push');
    const commits: SuccessIndicator[] = successIndicators.filter(indicator => indicator.type === 'commit');

    return [];
}
