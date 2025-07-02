
import { getData } from "./get_and_group_events";
import { Event, DocumentChangeInfo} from "../EventTracking/event_models";
import { dataPointsForDayFocus, computeIntervalsFocusData, FocusLevelData, FocusLevel, FocusDataByIntervalAndType } from "./focus_aggregate";
import { ActivityType } from "./activity_aggregate";
interface EfficiencyStats {

}

interface LineStats {
    user: number;
    ai: number;
    external: number;
}
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

// interface DataForFrontend {
//     lineStats: {
//         user: number;
//         ai: number;
//         external: number;
//     };
//     intervalsData: { [timeUnit: string]: DataForInterval };
//     //successIndicators: { { key: SuccessType } : EfficiencyStats};
//     totalEfficiencyStats: {
//         averageTime: number; // in seconds
//         averageLines: number;
//         focusStats: FocusStats;
//         activityStats: ActivityStats;
//     }
// }

interface DataForDay {
    interval: 'day';
    lineStats: LineStats;
    focusStats: FocusStats;
    focusValues: {};
    activityIntervals: ActivityInterval[]; // array of activity intervals for the day
}

interface DataForWeek {
    interval: 'week';
    lineStats: LineStats;
    focusStats: FocusStats;
    focusDurationsForDay: WeeklyFocusStats; // array of focus durations for each day
    activityDurationsForDay: WeeklyActivityStats; // array of activity durations for each day
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

// mark as async
export function getDataForFrontend(projectName: string, time_unit: 'day' | 'week', startDate: Date): DataForDay | DataForWeek {
    const dayLineStats = {
        user: 323,
        ai: 74,
        external: 33
    };
    const weekLineStats = {
        user: 1389,
        ai: 427,
        external: 126
    };

    const segments = [
        { start: 5, end: 10, value: 0.9 }, // Narrow segment
        { start: 15, end: 30, value: 1.29 }, // Wider segment
        { start: 50, end: 100, value: 2.5 }, // Longer segment
        { start: 150, end: 180, value: 0.44 }, // Medium segment
        { start: 200, end: 250, value: 0.3 }, // Medium segment
        { start: 300, end: 400, value: 0.1 }, // Longer segment
        { start: 500, end: 600, value: 0.14 }, // Longer segment
        { start: 800, end: 900, value: 0.7 }, // Medium segment
        { start: 950, end: 1050, value: 0.4 }, // Longer segment
        { start: 1100, end: 1150, value: 0.67 }, // Narrow segment
        { start: 1200, end: 1300, value: 1.3 }, // Long segment
        { start: 1350, end: 1400, value: 0.9 }, // Narrow segment
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

    const focusStats : FocusStats = {
        total: 396,
        focus: 135,
        active: 204
    };

    const weeklyFocusStats : FocusStats = {
        total: 1000,
        focus: 370,
        active: 390
    };

    const activitiesOfDay : ActivityInterval[] = [
        { label: 'Coding', start: 10, end: 80 },
        { label: 'Code Review', start: 90, end: 120 },
        { label: 'Coding', start: 190, end: 280 },
        { label: 'Refactoring', start: 400, end: 630 },
        { label: 'Code Review', start: 800, end: 950 },
        { label: 'Testing', start: 1000, end: 1200 },
        { label: 'Coding', start: 1300, end: 1400 },
        { label: 'Refactoring', start: 1410, end: 1430 },
        { label: 'Testing', start: 1435, end: 1440 },
    ];

    const allActivitiesOfDay : ActivityInterval[] = [];

    for (let i = 0; i < activitiesOfDay.length; i++) {
        allActivitiesOfDay.push(activitiesOfDay[i]);

        const currentEnd = activitiesOfDay[i].end;

        let nextStart = 1440; // Default to end of day if no next activity
        if (i + 1 < activitiesOfDay.length) {
            nextStart = activitiesOfDay[i + 1].start;
        }

        if (nextStart > currentEnd) {
            const activityInterval : ActivityInterval = {
                label: activitiesOfDay[i].label,
                start: currentEnd,
                end: nextStart
            }
            allActivitiesOfDay.push(activityInterval);
        }
    }

    const dailyFocusStats: WeeklyFocusStats = {
        focus: [0.3, 0.4, 0.7, 0.3, 0.1, 0.2, 0.3],
        active: [0.5, 0.2, 0.1, 0.2, 0.2, 0.4, 0.2],
        idle: [0.1, 0.5, 0.1, 0.1, 0.7, 0.1, 0.1],
        inactive: [0.1, 0.1, 0.1, 0.4, 0.6, 0.3, 0.4],
    }

    const dailyActivityStats: WeeklyActivityStats = {
        Coding: [10, 20, 30, 40, 50, 60, 70],
        CodeReview: [5, 10, 15, 20, 25, 30, 35],
        Testing: [2, 4, 6, 8, 10, 12, 14],
        Refactoring: [1, 2, 3, 4, 5, 6, 7]
    };



    if (time_unit === 'day') {
        const dataForDay: DataForDay = {
            interval: 'day',
            lineStats:  dayLineStats, //await getLinesBySource(startDate.getTime(), 24 * 60 * 60 * 1000, projectName),
            focusStats: focusStats,
            focusValues: valueMapping,
            activityIntervals: allActivitiesOfDay
        };
        // compute focus stats and activity intervals
        return dataForDay;
    } else {
        const dataForWeek: DataForWeek = {
            interval: 'week',
            lineStats: weekLineStats, // await getLinesBySource(startDate.getTime(), 7 * 24 * 60 * 60 * 1000, projectName),
            focusStats: weeklyFocusStats,
            focusDurationsForDay: dailyFocusStats,
            activityDurationsForDay: dailyActivityStats
        };
        // compute focus stats and activity durations for each day
        return dataForWeek;
    }
}
