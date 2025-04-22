// Check whether the total amount of events of any type of the three in [timeframe] exceeds [threshold]
// also check if flow period stops

import { CurrentSessionVariables } from "../EventTracking/event_management";
import { DocumentChangeInfo, ExecutionEventInfo, UserActivityEventInfo } from "../EventTracking/event_models";
import { instance } from "../extension"; // !!

// automatically mark the period as focus
// in another cache!!!

export function getRealTimeFlow() {
    const executionCache = instance.getExecutionCache();
    // might not need this one
    //const userActivityCache = instance.getUserActivityCache();
    const userDocumentCache = instance.getDocumentCache('user');
    const aiDocumentCache = instance.getDocumentCache('AI');
    const externalDocumentCache = instance.getDocumentCache('external');

    // order doesn't matter here?? or does it? getAll or getAllInOrder
    // we need order because we need to see a rate of writing in the last period
    const executionEvents : ExecutionEventInfo[] = executionCache.getAllInOrder<ExecutionEventInfo>();
    //const userActivityEvents : UserActivityEventInfo[] = userActivityCache.getAllInOrder<UserActivityEventInfo>();
    const userDocumentEvents : DocumentChangeInfo[] | undefined = userDocumentCache?.getAllInOrder<DocumentChangeInfo>();
    const aiDocumentEvents : DocumentChangeInfo[] | undefined = aiDocumentCache?.getAllInOrder<DocumentChangeInfo>();
    const externalDocumentEvents : DocumentChangeInfo[] | undefined = externalDocumentCache?.getAllInOrder<DocumentChangeInfo>();


}
