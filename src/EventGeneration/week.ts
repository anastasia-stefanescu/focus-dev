import { floor, random } from 'lodash';
import { Event, WindowFocus, ExecutionEventInfo, UserActivityEventInfo, SuccessIndicator, DocumentChangeInfo, EventType, Source, ExecutionType, SuccessType, UserActivityType } from '../EventTracking/event_models';
import { sendEventsToAWSDB } from '../API/api_wrapper';

// Helper functions
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[getRandomInt(0, arr.length - 1)];

const eventSources: Source[] = ["user", "AI", "external", undefined];
const executionTypes: ExecutionType[] = ['debug', 'run'];
const successTypes: SuccessType[] = ['release', 'deployment', 'PR close', 'main push', 'push'];
const userActivityTypes: UserActivityType[] = ['file', 'git', 'window', 'cursor', 'others', undefined];
const eventTypes: EventType[] = ['windowFocus', 'execution', 'userActivity', 'successIndicator', 'document'];

const mapEventTypeToTable = {
    'windowFocus': 'window_focus',
    'execution': 'execution_events',
    'userActivity': 'user_activity_events',
    'successIndicator': 'success_indicators',
    'document': 'document_change_events'
}

const numEventsByType = {
    'windowFocus': 300,
    'execution': 50,
    'userActivity': 1200,
    'successIndicator': 20,
    'document': 1000
}
const eventDistancesByType = {
    'windowFocus': [600, 1200, 6000, 18000, 60000],
    'execution': [180, 600, 1200, 2400, 12000, 240000],
    'userActivity': [60, 180, 300, 600, 2400, 12000],
    'successIndicator': [3600], // 1 hour
    'document': [60, 120, 180, 300, 600, 2400, 12000]
}

// Function to generate a single Event
const generateEvent = (startTimestamp: number, eventType: EventType, projectName: string, projectPath: string, branchName: string,
    fileName:string = '', filePath:string = ''): Event => {
    //const randomEventType = getRandomElement<EventType>(['document', 'userActivity', 'execution', 'successIndicator', 'windowFocus']);

    const eventJson: any = {};
    eventJson.start = startTimestamp.toString();
    eventJson.end = (startTimestamp + getRandomInt(1, 7) * 60).toString(); // Event duration between 1 and 300 seconds
    //event.projectName = `Project_${getRandomInt(1, 100)}`;
    //event.projectDirectory = `/path/to/project${getRandomInt(1, 10)}`;
    eventJson.branch = branchName;

    switch (eventType) {
        case 'windowFocus':
            return {
                ...eventJson,
            };
        case 'execution':
            return {
                ...eventJson,
                eventType: getRandomElement(executionTypes),
                sessionId: `session_${getRandomInt(1, 1000)}`
            };
        case 'userActivity':
            return {
                ...eventJson,
                file_actions: getRandomInt(0, 3),
                git_actions: getRandomInt(0, 1),
                window_focus_changes: getRandomInt(0, 2),
                cursor_changes: getRandomInt(0, 10),
                total_actions: 0, // Will be calculated later
                others: getRandomInt(0, 3)
            };
        case 'successIndicator':
            return {
                ...eventJson,
                status: 'success',
                type: getRandomSuccessType(),
            };
        case 'document':
            return getRandomDocumentChange(eventJson, fileName, filePath);
    }
};

function getRandomSuccessType(): SuccessType {
    const randomChange = Math.random();
    let successType: SuccessType;
    if (randomChange < 0.4)
        successType = 'commit';
    else if (randomChange < 0.7)
        successType = 'push';
    else if (randomChange < 0.8)
        successType = 'PR close';
    else if (randomChange < 0.9)
        successType = 'main push';
    else
        successType = 'deployment';
    return successType;
}

function getRandomDocumentChange(eventJson: any, fileName: string, filePath: string): DocumentChangeInfo {
    const randomChange = Math.random();
    let source: Source;
    let lineCount: number;
    let addedPercentage = Math.random();
    if (randomChange < 0.7) {
        source = 'user';
        lineCount = getRandomInt(1, 15);
    }
    else if (randomChange < 0.9) {
        source = 'AI';
        lineCount = getRandomInt(5, 50);
    }
    else {
        source = 'external';
        lineCount = getRandomInt(10, 100);
    }

    const linesAdded = floor(addedPercentage * lineCount);
    const linesDeleted = floor((1 - addedPercentage) * lineCount);
    const charactersAdded = linesAdded * getRandomInt(20, 100);
    const charactersDeleted = linesDeleted * getRandomInt(20, 100);
    const fullEvent = {
        ...eventJson,
        fileName: fileName,
        filePath: filePath,
        lineCount: lineCount,
        characterCount: lineCount * getRandomInt(20, 100),
        linesAdded: linesAdded,
        linesDeleted: linesDeleted,
        charactersAdded: charactersAdded,
        charactersDeleted: charactersDeleted,
        singleDeletes: source === 'user' ? charactersDeleted : 0,
        multiDeletes: getRandomInt(0, 3), // the user can do multiple deletes also
        singleAdds: source === 'user' ? charactersAdded : 0,
        multiAdds: getRandomInt(0, 5),
        autoIndents: getRandomInt(0, 3),
        replacements: getRandomInt(0, 5),
        keystrokes: 0,
        changeType: getRandomElement(['add', 'delete', 'edit']),
        source: source
    };
    fullEvent.keystrokes = fullEvent.singleAdds + fullEvent.singleDeletes + fullEvent.multiAdds + fullEvent.multiDeletes;
    const docChange = DocumentChangeInfo.buildEventFromJson(fullEvent);
    return docChange;
}

// Generate events over a 7-day period (604800 seconds)
export async function generateEvents(projectName: string, projectDirectory: string, branchNames:string[], fileNames: string[], filePaths: string[]): Promise<Event[]> {
    const allEvents: Event[] = [];
    let currentTimestamp : number = new Date(2025, 5, 12).getTime() + getRandomInt(0, 3600 * 8); // Random start within the first 8 hours of the week

    for (let i = 0; i < branchNames.length; i++) {
        const branchName = branchNames[i];

        for (const eventType of eventTypes) {
            const events: Event[] = [];
            const fileName = getRandomElement(fileNames);

            for (let i = 0; i < numEventsByType[eventType]; i++) {
                const event = generateEvent(currentTimestamp, eventType, projectName, projectDirectory, branchName, fileName, '');
                events.push(event);
                // Generate random next timestamp between 30 seconds and 10 minutes

                currentTimestamp = parseInt(event.end) + getRandomElement(eventDistancesByType[eventType]) + getRandomInt(-1, 1) * 60;
            }
            // send to db
            console.log('Events for branch:', branchName, 'and event type:', eventType);
            console.log(events);

            const dbTable = mapEventTypeToTable[eventType];
            const response = await sendEventsToAWSDB(dbTable, events);

            allEvents.push(...events);
        }
    }

    return allEvents;
};
