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
    const userDocumentCache = instance.getDocumentCache('user');
    const aiDocumentCache = instance.getDocumentCache('AI');
    const externalDocumentCache = instance.getDocumentCache('external');

    // order doesn't matter here?? or does it? getAll or getAllInOrder
    // we need order because we need to see a rate of writing in the last period
    // we would like to get the distribution?
    //const executionEvents : ExecutionEventInfo[] = executionCache.getAllInOrder<ExecutionEventInfo>();
    //const userActivityEvents : UserActivityEventInfo[] = userActivityCache.getAllInOrder<UserActivityEventInfo>();
    const userDocumentEvents : DocumentChangeInfo[] | undefined = userDocumentCache?.getAllInOrder<DocumentChangeInfo>();
    const aiDocumentEvents : DocumentChangeInfo[] | undefined = aiDocumentCache?.getAllInOrder<DocumentChangeInfo>();
    const externalDocumentEvents : DocumentChangeInfo[] | undefined = externalDocumentCache?.getAllInOrder<DocumentChangeInfo>();

    // putem avea practic 10 evenimente mai mari => facem sumele evenimentelor
    const sum_user = get_sum_of_events(userDocumentEvents);
    const sum_ai = get_sum_of_events(aiDocumentEvents);
    const sum_external = get_sum_of_events(externalDocumentEvents);

    // ne intereseaza: lineCount, characterCount, keystrokes: number = 0;
    if (sum_user && sum_user.lineCount > 

}

function get_sum_of_events(events: DocumentChangeInfo[] | undefined) {
    if (!events)
        return;
    const sum_of_user_doc_events: DocumentChangeInfo = new DocumentChangeInfo();
    for (const elem of events)
        sum_of_user_doc_events.concatenateData(elem);
    return sum_of_user_doc_events;
}
