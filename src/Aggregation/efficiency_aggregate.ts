import { sqlInstance, debug_efficiency_aggregate } from "../extension";
import { SuccessIndicator, SuccessType } from "../EventTracking";

function _debug_logs(message: string) {
    if (debug_efficiency_aggregate) {
        console.log(message);
    }
}

const successTypes = ['release', 'deployment', 'PR close', 'main push', 'push', 'commit']

export async function getEventsBetweenSuccessIndicators(start: Date, end: Date, projectName: string | undefined = undefined,
    branch: string | undefined = undefined)
: Promise<Event[]>
{

    // if we don't have a project name, we return all events from all projects, or should we enable this feature only per project?
    // we could do some general stats for all projects, but not a graph?

    const events: Event[] = await sqlInstance.executeSelect('successIndicator', start.getTime().toString(), end.getTime().toString(), projectName, branch);

    _debug_logs(`Events from ${start.toISOString()} to ${end.toISOString()} for project ${projectName} and branch ${branch}`);
    _debug_logs(`Events: ${JSON.stringify(events)}`);

    return events;
}

export async function getSuccessIndicators(start: Date, end: Date, projectName: string | undefined = undefined,
    branch: string | undefined = undefined)
: Promise<{ [key in SuccessType]?: SuccessIndicator[] }>
{
    const successIndicatorsByType: {[key in SuccessType]? : SuccessIndicator[]} = {};

    const successIndicators :any[] = await sqlInstance.executeSelect('successIndicator', start.getTime().toString(), end.getTime().toString(), projectName, branch);

    _debug_logs(`Success indicators from ${start.toISOString()} to ${end.toISOString()} for project ${projectName} and branch ${branch}`);
    _debug_logs(`Success indicators: ${JSON.stringify(successIndicators)}`);

    for (const successType of successTypes) {
        const indicators = successIndicators.filter(indicator => indicator.type === successType);
        _debug_logs(`Type ${successType}: ${JSON.stringify(indicators)}`);
        // Transform to SuccessIndicator Type
        successIndicatorsByType[successType] = indicators;
    }

    return successIndicatorsByType;
}
