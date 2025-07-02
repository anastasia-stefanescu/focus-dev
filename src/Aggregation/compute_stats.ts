
import { getData } from "./get_and_group_events";
import { Event, DocumentChangeInfo} from "../EventTracking/event_models";
import { dataPointsForDayFocus, computeIntervalsFocusData, FocusLevelData, FocusLevel, FocusDataByIntervalAndType } from "./focus_aggregate";
import { ActivityType } from "./activity_aggregate";

interface ReportStats {
    editorTime: string;
    activeCoding: string;
    focusedCoding: string;
    linesWritten: number;
    linesAI: number;
    linesImported: number;
}

interface efficiencyMetrics {
    editorTime2: string;
    activeCoding2: string;
    focusedCoding2: string;
    coding: string;
    testing: string;
    refactoring: string;
    linesWritten2: number;
    linesAI2: number;
    linesImported2: number;
};
interface FocusStats {
    total: number;
    focus: number;
    active: number;
};

interface WeeklyFocusStats {
    idle: number[];
    focus: number[];
    active: number[];
    inactive: number[];
}

interface ActivityInterval {
    label: ActivityType;
    start: number;
    end: number;
}

interface WeeklyActivityStats {
    Coding: number[];
    CodeReview: number[];
    Testing: number[];
    Refactoring: number[];
}

interface DataForDay {
    reportStats: ReportStats;
    focusValues: {};
    activityIntervals: ActivityInterval[]; // array of activity intervals for the day
    efficiencyMetrics?: efficiencyMetrics; // optional efficiency metrics for the day
}

interface DataForWeek {
    reportStats: ReportStats;
    focusDurationsForDay: WeeklyFocusStats; // array of focus durations for each day
    activityDurationsForDay: WeeklyActivityStats; // array of activity durations for each day
    efficiencyMetrics?: efficiencyMetrics; // optional efficiency metrics for the week
}

export async function computeDailyStats(start: Date, projectName: string | undefined = undefined) {
    const startMS = start.getTime(); // in milliseconds
    const dayMS =24 * 60 * 60 * 1000 ; // msseconds in a day

    const lineStats = await getLinesBySource(startMS, dayMS, projectName);
    // for time spent, get focus analysis

    const intervalsData: FocusDataByIntervalAndType = await computeIntervalsFocusData(startMS, 'hour', projectName);

    // for focus stats, get focus analysis
    const focusValues = dataPointsForDayFocus(intervalsData);

    // for activity stats, get activity analysis
    //const

    // for efficiency stats, get successIndicators (locals - from aws), remote - from git api call

    // if timeUnit === 'day' {

    // }

    // const dataForInterval: DataForFrontend = {
    //     lineStats: lineStats,
    //     focusStats: {
    //         total: 0, // to be computed
    //         focus: 0, // to be computed
    //         active: 0 // to be computed
    //     },
    //     focusIntervals: {
    //         'focus': [],
    //         'active': [],
    //         'idle': []
    //     },
    //     activityIntervals: {
    //         'coding': [],
    //         'codeReview': [],
    //         'testing': [],
    //         'refactoring': []
    //     },
    //     successIndicators: [], // to be computed
    //     efficiencyStats: {}, // to be computed
    // };
}

async function getLinesBySource(startMS: number, timeUnitMS: number, projectName: string | undefined = undefined): Promise<{ user: number; ai: number; external: number }> {
    // for lines written, get document change events
    const documentChanges: Event[] = await getData('document', startMS.toString(), (startMS + timeUnitMS).toString(), projectName) as DocumentChangeInfo[];
    console.log(documentChanges);

    let linesByUser = 0;
    let linesByAI = 0;
    let linesByExternal = 0;
    for (const change of documentChanges) {
        const docChange = change as DocumentChangeInfo;
        switch (docChange.source) {
            case 'user':
                linesByUser += docChange.linesAdded - docChange.linesDeleted;
                break;
            case 'AI':
                linesByAI += docChange.linesAdded - docChange.linesDeleted;
                break;
            case 'external':
                linesByExternal += docChange.linesAdded - docChange.linesDeleted;
                break;
        }
    }

    return {
        user: linesByUser,
        ai: linesByAI,
        external: linesByExternal
    };
}

// const cache: Record<string, DataForDay | DataForWeek> = {};

// function getRandomInRange(min: number, max: number): number {
//     return Math.random() * (max - min) + min;
// }

// function getRandomInt(min: number, max: number): number {
//     return Math.floor(getRandomInRange(min, max + 1));
// }

// function generateFocusSegments(): { start: number; end: number; value: number }[] {
//     const segments = [];
//     let current = getRandomInt(480, 540); // start between 8am - 9am
//     while (current < 1080) { // until 6pm
//         const length = getRandomInt(10, 90);
//         const value = parseFloat(getRandomInRange(0.2, 2.5).toFixed(2));
//         const end = Math.min(current + length, 1080);
//         segments.push({ start: current, end, value });
//         current = end + getRandomInt(5, 30);
//     }
//     return segments;
// }

// function generateActivityIntervals(): ActivityInterval[] {
//     const labels = ['Coding', 'Code Review', 'Refactoring', 'Testing'];
//     const intervals: ActivityInterval[] = [];
//     let current = getRandomInt(480, 540);
//     while (current < 1080) {
//         const label = labels[getRandomInt(0, labels.length - 1)];
//         const length = getRandomInt(15, 120);
//         const end = Math.min(current + length, 1080);
//         intervals.push({ label, start: current, end });
//         current = end + getRandomInt(5, 20);
//     }
//     return intervals;
// }

// function padWithUndefined(intervals: ActivityInterval[]): ActivityInterval[] {
//     const result: ActivityInterval[] = [];
//     for (let i = 0; i < intervals.length; i++) {
//         result.push(intervals[i]);
//         const gapStart = intervals[i].end;
//         const gapEnd = i + 1 < intervals.length ? intervals[i + 1].start : 1080;
//         if (gapEnd > gapStart) {
//             result.push({ label: 'Undefined', start: gapStart, end: gapEnd });
//         }
//     }
//     return result;
// }

// function randomStats(): ReportStats {
//     return {
//         editorTime: `${getRandomInt(4, 8)} h ${getRandomInt(0, 59)} min`,
//         activeCoding: `${getRandomInt(2, 6)} h ${getRandomInt(0, 59)} min`,
//         focusedCoding: `${getRandomInt(1, 5)} h ${getRandomInt(0, 59)} min`,
//         linesWritten: getRandomInt(300, 1000),
//         linesAI: getRandomInt(100, 500),
//         linesImported: getRandomInt(50, 300)
//     };
// }

// function randomEfficiencyMetrics() {
//     return {
//         editorTime2: `${getRandomInt(4, 7)}h ${getRandomInt(0, 59)}m`,
//         activeCoding2: `${getRandomInt(2, 5)}h ${getRandomInt(0, 59)}m`,
//         focusedCoding2: `${getRandomInt(1, 3)}h ${getRandomInt(0, 59)}m`,
//         coding: `${getRandomInt(1, 3)}h ${getRandomInt(0, 59)}m`,
//         testing: `${getRandomInt(0, 1)}h ${getRandomInt(0, 59)}m`,
//         refactoring: `${getRandomInt(0, 2)}h ${getRandomInt(0, 59)}m`,
//         linesWritten2: getRandomInt(300, 1000),
//         linesAI2: getRandomInt(100, 500),
//         linesImported2: getRandomInt(50, 300)
//     };
// }

// function randomWeeklyFocus(): WeeklyFocusStats {
//     const keys: (keyof WeeklyFocusStats)[] = ['focus', 'active', 'idle', 'inactive'];
//     return keys.reduce((acc, key) => {
//         acc[key] = Array.from({ length: 7 }, () => parseFloat(getRandomInRange(0, 1).toFixed(2)));
//         return acc;
//     }, {} as WeeklyFocusStats);
// }

// function randomWeeklyActivity(): WeeklyActivityStats {
//     return ['Coding', 'CodeReview', 'Testing', 'Refactoring'].reduce((acc, key) => {
//         acc[key as keyof WeeklyActivityStats] = Array.from({ length: 7 }, () => getRandomInt(0, 60));
//         return acc;
//     }, {} as WeeklyActivityStats);
// }

// export async function getDataForFrontend(
//     projectName: string,
//     time_unit: 'day' | 'week',
//     startDate: Date
// ): Promise<DataForDay | DataForWeek> {
//     const cacheKey = `${projectName}_${time_unit}_${startDate.toISOString()}`;
//     if (cache[cacheKey]) return cache[cacheKey];

//     if (time_unit === 'day') {
//         const segments = generateFocusSegments();
//         const valueMapping: Record<number, number> = {};

//         for (let i = 0; i < segments.length; i++) {
//             const mid = Math.floor((segments[i].start + segments[i].end) / 2);
//             valueMapping[mid] = segments[i].value;

//             const nextStart = i + 1 < segments.length ? segments[i + 1].start : 1440;
//             const middleGap = Math.floor((segments[i].end + nextStart) / 2);
//             valueMapping[middleGap] = 0;
//         }

//         const rawActivities = generateActivityIntervals();
//         const allActivitiesOfDay = padWithUndefined(rawActivities);

//         const data: DataForDay = {
//             reportStats: randomStats(),
//             focusValues: valueMapping,
//             activityIntervals: allActivitiesOfDay,
//             efficiencyMetrics: randomEfficiencyMetrics()
//         };

//         cache[cacheKey] = data;
//         return data;
//     } else {
//         const data: DataForWeek = {
//             reportStats: randomStats(),
//             focusDurationsForDay: randomWeeklyFocus(),
//             activityDurationsForDay: randomWeeklyActivity(),
//             efficiencyMetrics: randomEfficiencyMetrics()
//         };

//         cache[cacheKey] = data;
//         return data;
//     }
// }


// mark as async
export function getDataForFrontend(projectName: string, time_unit: 'day' | 'week', startDate: Date): DataForDay | DataForWeek {

    const segments = [
        { start: 512, end: 533, value: 2.5 }, // Longer segment
        { start: 500, end: 593, value: 0.14 }, // Longer segment
        { start: 625, end: 663, value: 0.7 }, // Medium segment
        { start: 670, end: 700, value: 0.2 }, // Short segment
        { start: 756, end: 823, value: 0.4 }, // Longer segment
        { start: 843, end: 888, value: 0.55}

        // Add more segments here...
    ];

    const valueMapping : any = {};
    let nextStart: number;
    for (let i = 0; i < segments.length; i++) {
        const middle = Math.floor((segments[i].start + segments[i].end) / 2);
        valueMapping[middle] = segments[i].value;

        nextStart = i + 1 < segments.length ? segments[i + 1].start : 1440; // Default to end of day if no next segment
        const middleOfSpace = Math.floor((segments[i].end + nextStart) / 2);
        valueMapping[middleOfSpace] = 0;
    }

    const dailyMetrics : ReportStats = {
        editorTime: '6 h 36 min',
        activeCoding: '3 h 24 min',
        focusedCoding: '2 h 15 min',
        linesWritten: 375,
        linesAI: 174,
        linesImported: 189
    };

    const weeklyMetrics : ReportStats = {
        editorTime: '32 h 12 min',
        activeCoding: '18 h 48 min',
        focusedCoding: '14 h 30 min',
        linesWritten: 1875,
        linesAI: 874,
        linesImported: 945
    };

    const efficiencyMetrics = {
        editorTime2: '5h 30m',
        activeCoding2: '3h 10m',
        focusedCoding2: '2h 45m',
        coding: '1h 47m',
        testing: '1h 20m',
        refactoring: '0h 23m',
        linesWritten2: 420,
        linesAI2: 180,
        linesImported2: 75
    };

    const activitiesOfDay : ActivityInterval[] = [
        { label: 'Coding', start: 457, end: 523 },
        { label: 'Code Review', start: 546, end: 589 },
        { label: 'Coding', start: 680, end: 712},
        { label: 'Refactoring', start: 735, end: 773 },
        { label: 'Code Review', start: 810, end: 832 },
        { label: 'Testing', start: 879, end: 921 },
        { label: 'Coding', start: 932, end: 999 },
    ];

    const allActivitiesOfDay : ActivityInterval[] = [];

    if (activitiesOfDay[0].start > 0) {
        allActivitiesOfDay.push({
            label: 'Undefined',
            start: 0,
            end: activitiesOfDay[0].start - 1
        });
    }
    for (let i = 0; i < activitiesOfDay.length; i++) {
        allActivitiesOfDay.push(activitiesOfDay[i]);

        const currentEnd = activitiesOfDay[i].end;

        let nextStart = 1440; // Default to end of day if no next activity
        if (i + 1 < activitiesOfDay.length) {
            nextStart = activitiesOfDay[i + 1].start;
        }

        if (nextStart > currentEnd) {
            allActivitiesOfDay.push({
                label: 'Undefined',
                start: currentEnd,
                end: nextStart
            });
        }
    }

    const dailyFocusStats: WeeklyFocusStats = {
        focus: [0.3, 0.4, 0.7, 0.3, 0.1, 0, 0],
        active: [0.5, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2],
        idle: [0.1, 0.3, 0.1, 0.1, 0.5, 0.1, 0.1],
        inactive: [0.1, 0.1, 0.1, 0.4, 0.2, 0.8, 0.7],
    }

    const dailyActivityStats: WeeklyActivityStats = {
        Coding: [3, 2, 7, 9, 3, 0, 1],
        CodeReview: [2, 1, 8, 3, 5, 0, 1],
        Testing: [1, 3, 2, 5, 4, 0, 0],
        Refactoring: [2, 4, 1, 3, 2, 0, 0]
    };



    if (time_unit === 'day') {
        const dataForDay: DataForDay = {
            reportStats:  dailyMetrics, //await getLinesBySource(startDate.getTime(), 24 * 60 * 60 * 1000, projectName),
            focusValues: valueMapping,
            activityIntervals: allActivitiesOfDay,
            efficiencyMetrics: efficiencyMetrics
        };
        // compute focus stats and activity intervals
        return dataForDay;
    } else {
        const dataForWeek: DataForWeek = {
            reportStats: weeklyMetrics, // await getLinesBySource(startDate.getTime(), 7 * 24 * 60 * 60 * 1000, projectName),
            focusDurationsForDay: dailyFocusStats,
            activityDurationsForDay: dailyActivityStats,
            efficiencyMetrics: efficiencyMetrics
        };
        // compute focus stats and activity durations for each day
        return dataForWeek;
    }
}
