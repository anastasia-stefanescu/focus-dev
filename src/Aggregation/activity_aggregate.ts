import axios from 'axios';
import { BucketEvent, group_events_by_time_unit } from './time_aggregate';
import { DocumentChangeInfo, ExecutionEventInfo, UserActivityEventInfo } from '../EventTracking';
import { NO_MS_IN_DAY, NO_MS_IN_HOUR } from '../Constants';
import { getHDBSCANEvents, getHDBSCANResults } from '../Clustering/hdbscan';
import { debug_activity_aggregate } from '../extension';
import { FocusDataByIntervalAndType } from './focus_aggregate';

export type ActivityType = 'Coding' | 'Code Review' | 'Testing' | 'Refactoring' | 'Undefined';

function _debug_logs(message: string) {
    if (debug_activity_aggregate) {
        console.log(message);
    }
}

const actions_of_classes = {
    "Coding": ['typing', 'autocomplete', 'refactorize', 'copy/paste', 'file actions'],
    "Code Review": ['idle time', 'cursor', 'file actions', 'typing'], // less typing, "idle time" is more important
    "Testing": ['execution', 'debugging', 'testing'],
    "Refactoring" : ['refactorize', 'file actions', 'typing'], // less typing, "file actions" is more important
    // something in between coding and reviewing
}

type IntervalBucketEvents = {
    [key: string]: BucketEvent[];
};

interface CodingData {
    noCharacterAdds: number;
    noReplacements: number;
    totalTime: number;
}

interface CodeReviewData {
    noFileActions: number;
    noCursorActions: number;
    noOtherActions: number;
    totalTime: number;
}

interface TestingData {
    noExecutionEvents: number;
    noDebuggingEvents: number;
    noTestingEvents: number;
    totalTime: number;
}

// cluster also events of the same type, but with larger time gaps?
export async function computeIntervalsActivityData(time_unit: 'hour' | 'day', projectName: string | undefined, focusIntervalData: FocusDataByIntervalAndType) {
    // change back to 'document' when done testing
    const docEvents: IntervalBucketEvents = await group_events_by_time_unit(time_unit, 'execution', projectName);
    const userActivityEvents: IntervalBucketEvents = await group_events_by_time_unit(time_unit, 'userActivity', projectName);
    const executionEvents: IntervalBucketEvents = await group_events_by_time_unit(time_unit, 'execution', projectName);

    const noMinutes = time_unit === 'hour' ? 60 : 60 * 24;


    for (const interval in Object.keys(docEvents)) {
        // these clusters return data in minutes??
        // are they also sorted???
        const codingClusters = await getHDBSCANResults(docEvents[interval], 0.5);
        const userActivityClusters = await getHDBSCANResults(userActivityEvents[interval], 0.2);
        const executionClusters = await getHDBSCANResults(executionEvents[interval], 0.1);

        _debug_logs(`Coding clusters for interval ${interval}: ${JSON.stringify(codingClusters)}`);
        _debug_logs(`User activity clusters for interval ${interval}: ${JSON.stringify(userActivityClusters)}`);
        _debug_logs(`Execution clusters for interval ${interval}: ${JSON.stringify(executionClusters)}`);

        // 0- inactive, 1 - idle, 2 - review, 3 - refactoring, 4 - coding, 5 - testing
        const allMinutes = Array.from({ length: noMinutes }, (_, i) => 0);

        // we want to get idle times for review detection
        const focusData = focusIntervalData[interval] || {}; // is this okay?
        _debug_logs(`Focus data for interval ${interval}: ${JSON.stringify(focusData)}`);
        const idlePeriods = focusData['idle' as keyof typeof focusData]?.periods || [];
        for (const period of idlePeriods) {
            const start = Math.floor(period[0] / 60); // convert to minutes
            const end = Math.floor(period[1] / 60);
            for (let i = start; i <= end; i++) {
                allMinutes[i] = 1; // mark as idle
            }
        }

        // we mark the obtained clusters in the allMinutes array, beginning with coding, execution,
        //for (const cluster)


        // depending on the time unit, combine the data,  or not, etc

    }
    // const intervalCodeData : CodingData = extractCodingData(Object.values(docEvents).flat());
    // const intervalCodeReviewData : CodeReviewData = extractCodeReviewData(Object.values(userActivityEvents).flat());
    // const intervalTestingData : TestingData = extractTestingData(Object.values(executionEvents).flat());

    // get idle time!!

    // get clusters of intervals!!

    //analyseData(time_unit, intervalCodeData, intervalCodeReviewData, intervalTestingData);
}


export function analyseData(time_unit : 'hour' | 'day', intervalCodeData: CodingData, intervalCodeReviewData: CodeReviewData, intervalTestingData: TestingData) {

    const totalTime = time_unit === 'hour' ? NO_MS_IN_HOUR : NO_MS_IN_DAY
    const codingTimePercentage = (intervalCodeData.totalTime / totalTime) * 100;
    const codeReviewTimePercentage = (intervalCodeReviewData.totalTime / totalTime) * 100;
    const testingTimePercentage = (intervalTestingData.totalTime / totalTime) * 100;

    const totalActions = intervalCodeData.noCharacterAdds + intervalCodeData.noReplacements +
        intervalCodeReviewData.noFileActions + intervalCodeReviewData.noCursorActions + intervalCodeReviewData.noOtherActions +
        intervalTestingData.noExecutionEvents + intervalTestingData.noDebuggingEvents + intervalTestingData.noTestingEvents;

    const codingActionsPercentage = (intervalCodeData.noCharacterAdds + intervalCodeData.noReplacements)/ totalActions * 100;

}

// typing => docchange events (of any type) no of keystrokes => actually, the full interval
// get no copy/pastes, file actions, etc from user activity events

// get idle time by sustracting from the interval total time, time spent active - or just substract
// the total events
// get cursor actions
// also execution events, debugging, testing, etc
// many replacements

export function extractCodingData(bucketEvents: BucketEvent[]) : CodingData {
    const codingData: CodingData = {
        noCharacterAdds: 0,
        noReplacements: 0,
        totalTime: 0 // in seconds
    };
    for (const bucketEvent of bucketEvents) {
        if (bucketEvent.event instanceof DocumentChangeInfo) {
            // here we are considering even the ai code as written code?, that means the user is in the process of coding
            codingData.noCharacterAdds += ((bucketEvent.event?.singleAdds ?? 0) + (bucketEvent.event?.singleAdds ?? 0)) * bucketEvent.percentage;
            codingData.noReplacements += (bucketEvent.event?.replacements ?? 0) * bucketEvent.percentage;
            codingData.totalTime = (Number(bucketEvent.event?.end) - Number(bucketEvent.event?.start)) * bucketEvent.percentage;
        }
    }
    return codingData;
}

export function extractCodeReviewData(bucketEvents: BucketEvent[]) : CodeReviewData {
    const codeReviewData: CodeReviewData = {
        noFileActions: 0,
        noCursorActions: 0,
        noOtherActions: 0,
        totalTime: 0 // in seconds
    };
    for (const bucketEvent of bucketEvents) {
        if (bucketEvent.event instanceof UserActivityEventInfo) {
            codeReviewData.noFileActions += (bucketEvent.event?.file_actions ?? 0) * bucketEvent.percentage;
            codeReviewData.noCursorActions += (bucketEvent.event?.cursor_changes ?? 0) * bucketEvent.percentage;
            codeReviewData.noOtherActions += (bucketEvent.event?.others ?? 0) * bucketEvent.percentage;
            codeReviewData.totalTime += (Number(bucketEvent.event?.end) - Number(bucketEvent.event?.start)) * bucketEvent.percentage;
        }
    }
    return codeReviewData;
}

export function extractTestingData(bucketEvents: BucketEvent[]) : TestingData {
    const testingData: TestingData = {
        noExecutionEvents: 0,
        noDebuggingEvents: 0,
        noTestingEvents: 0,
        totalTime: 0 // in seconds
    };
    for (const bucketEvent of bucketEvents) {
        if (bucketEvent.event instanceof ExecutionEventInfo) {
            switch (bucketEvent.event?.eventType) {
                case 'run':
                    testingData.noExecutionEvents += bucketEvent.percentage;
                    break;
                case 'debug':
                    testingData.noDebuggingEvents += bucketEvent.percentage;
                    break;
                case 'test':
                    testingData.noTestingEvents += bucketEvent.percentage;
                    break;
            }
            testingData.totalTime += (Number(bucketEvent.event?.end) - Number(bucketEvent.event?.start)) * bucketEvent.percentage;
        }
    }
    return testingData;
}

// export async function classifyWithSVM(features: number[]): Promise<void> {
//     console.log('Classifying with SVM...');
//     try {
//         const convertedFeatures = features.map(feature => Number(feature));
//         console.log('Converted features:', convertedFeatures);
//         console.log('Type of converted features:', typeof convertedFeatures[0]);

//         const response = await axios.post('http://localhost:5000/predict', {
//             features: convertedFeatures
//         });
//         console.log('Response from SVM server:', response
//         );

//         console.log('Predicted class:', response.data.prediction);
//     } catch (error) {
//         console.error('Error classifying:', error);
//     }
// }
