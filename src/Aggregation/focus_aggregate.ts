import { BucketEvent, group_events_by_time_unit } from "./time_aggregate";
import { getHDBSCANResults, HDBSCANEvent } from "../Clustering/hdbscan";
import { NO_MS_IN_HOUR, NO_MS_IN_DAY, NO_SECONDS_IN_DAY, NO_SECONDS_IN_HOUR} from "../Constants";
import { sqlInstance, debug_focus_aggregate} from "../extension";
import { time } from "console";
import { map } from "lodash";


// Looking for:
// idle => window is in focus, little to no activity
// (passive => only user activities allowed) -> this might be code review so not taking into account for focus
// active => document changes

// Options: week, day -> TIMEZONES FOR HOURS!!!!???

const FOCUS_RATE_TRESHOLD : number = 0.5; // > 0.5 - 0.7 keystrokes / sec
const ACTIVE_RATE_TRESHOLD : number = 0.2; // > 0.2 - 0.5 keystrokes / sec
const VARIANCE_TRESHOLD : number = 0.5;

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export type FocusLevel = 'active' | 'focus' | 'idle';
const focusLevels: FocusLevel[] = ['active', 'focus', 'idle'];

export function computeFocusStatistics(time_unit: 'hour' | 'day', projectName: string | undefined) {}

export const mapFocusToNumber = {
    'active': 2,
    'focus': 3,
    'idle': 1
}

export type FocusDataByIntervalAndType = { [key: string]: { [key in FocusLevel] ?: FocusLevelData } };
export interface FocusLevelData {
    id: number;
    periods: [number, number][];
    percentage: number;
    totalTime: number;
}

function _debug_logs(message: string) {
    if (debug_focus_aggregate) {
        console.log(message);
    }
}

export async function totalFocusTimeForWeek() {

}


// used by the daily focus chart
export function dataPointsForDayFocus( intervalsData: FocusDataByIntervalAndType ) : any {
    // we break down the big interval of a day in smaller ones of an hour so as not to overuse the hdbscan algorithm?

    let totalValueMapping : any = {};
    for (const interval in Object.keys(intervalsData)) { // for each time unit
        const intervalData = intervalsData[interval];
        const valueMapping: any = {};
        for (const key in focusLevels) {  // for each focus level
            const focusPeriods : [number, number][] = intervalData[key as FocusLevel]?.periods || [];

            // replace this with just datapoints

            let nextStart;
            for (let i = 0; i < focusPeriods.length; i++) {
                const middle = Math.floor((focusPeriods[i][0] + focusPeriods[i][1]) / 2);
                valueMapping[middle] = 0.5; // focusPeriod value!!!!!!

                // update here that it is start of day in minutes + 1440!!!
                nextStart = i + 1 < focusPeriods.length ? focusPeriods[i + 1][0] : 1440; // Default to end of day if no next segment
                const middleOfSpace = Math.floor((focusPeriods[i][1] + nextStart) / 2);
                valueMapping[middleOfSpace] = 0;
            }

        }
        totalValueMapping = {...totalValueMapping, ...valueMapping}; // merge the value mapping for each interval
    }
    return totalValueMapping;
}

export async function computeIntervalsFocusData(crtTime: number, time_unit: 'hour' | 'day', projectName: string | undefined = undefined)
    : Promise<FocusDataByIntervalAndType>
{
    const now = crtTime;
    const docEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName, now);
    const userActivityEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'userActivity', projectName, now);
    const executionEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName, now);
    // does this work, how to common intervals concatenate?? -> they should have the same keys for interval starts
    const allbucketEvents: { [key: string]: BucketEvent[] } = {...docEvents, ...userActivityEvents, ...executionEvents};

    const intervalSeconds = time_unit === 'hour' ? NO_SECONDS_IN_HOUR : NO_SECONDS_IN_DAY;

    // intervals are unix seconds strings
    const intervals = Object.keys(allbucketEvents).sort();
    const noIntervals = intervals.length;
    const intervalsData: { [key: string]: { [key in FocusLevel]?: FocusLevelData } } = {};
    for (let i = 0; i<noIntervals; i++) {
        const interval = intervals[i];
        const events : BucketEvent[] = allbucketEvents[interval];

        const intervalFocusLevelsData: { [key in FocusLevel]?: FocusLevelData } = {};

        for (const focusLevel of focusLevels) {
            let focusPeriods: [number, number][]; // can we create a type for this?
            if (focusLevel in ['active', 'focus']) {
                const rate_threshold = focusLevel === 'focus' ? FOCUS_RATE_TRESHOLD : ACTIVE_RATE_TRESHOLD;
                const focusClusters = await getHDBSCANResults(events, rate_threshold);
                focusPeriods = focusClusters.map((cluster: HDBSCANEvent) => [cluster.start_time, cluster.end_time]);
            } else {
                const nextInterval = i + 1 < noIntervals ? intervals[i + 1] : now.toString();
                const windowFocusEvents = await sqlInstance.executeSelect('windowFocus', interval,  nextInterval, projectName);
                _debug_logs(`Window focus for ${interval} - ${nextInterval}: ${JSON.stringify(windowFocusEvents)}`);
                focusPeriods = windowFocusEvents.map((event: any) => [Number(event.start), Number(event.end)]);
            }

            const intervalTotalFocusTime = focusPeriods.reduce((sum: number, period: [number, number]) =>
                sum + (period[1] - period[0]), 0);

            const intervalFocusPercentage = intervalTotalFocusTime / intervalSeconds;

            const intervalFocusLevelData: FocusLevelData = {
                id: focusLevel === 'active' ? 2 : focusLevel === 'focus' ? 3 : 1,
                periods: focusPeriods,
                percentage: intervalFocusPercentage,
                totalTime: intervalTotalFocusTime
            };
            intervalFocusLevelsData[focusLevel] = intervalFocusLevelData;
        }
        intervalsData[interval] = intervalFocusLevelsData;
    }

    return intervalsData;

}


// export function iterateThroughEvents(bucketEvents: BucketEvent[], time_unit: 'hour' | 'day', projectName: string | undefined) {
//     // de intrebat chatgpt daca e ok
//     let startDate = Number(bucketEvents[0].event?.start);

//     const length = bucketEvents.length;
//     const focusPeriods : [number, number][] = [];
//     const activePeriods : [number, number][] = [];
//     let currentFocusLevel : FocusLevel;


//     let currentFocusPeriod : BucketEvent[] = [];
//     let index = 0

//     while (Number(bucketEvents[index].event?.end) < startDate + FIFTEEN_MINUTES_IN_MS && index < length) {
//         const event = bucketEvents[index];
//         currentFocusPeriod.push(event);
//         index++;
//     }

//     currentFocusLevel = computeFocusLevelForEvents(currentFocusPeriod, time_unit, projectName);

//     for (const event of bucketEvents.slice(index)) {

//         const newFocusLevel = computeFocusLevelForEvents(currentFocusPeriod.concat([event]), time_unit, projectName);

//         if (newFocusLevel !== currentFocusLevel) {
//             // we have a new period with a differentfocus level
//             const periodLength = currentFocusPeriod.length;
//             const endDate = Number(currentFocusPeriod[periodLength].event?.end);

//             if (currentFocusLevel === 'active')
//                 activePeriods.push([startDate, endDate]);
//             else if (currentFocusLevel === 'focus')
//                 focusPeriods.push([startDate, endDate]);

//             currentFocusLevel = newFocusLevel;
//             currentFocusPeriod = [event];
//             startDate = Number(event.event?.start);
//         }
//         else {
//             currentFocusPeriod.push(event);
//         }
//     }
//     return {focusPeriods:focusPeriods, activePeriods:activePeriods};
// }



// how do we map this data in the chart? We need for each hour/day, right?
// export function computeFocusLevelForEvents(bucketEvents: BucketEvent[], time_unit: 'hour' | 'day', projectName: string | undefined) : FocusLevel{
//     const rates : number[] = [];
//     // in case of AI document changes / external document changes, the rate is calculated by singleAdds/multiAdds/keystrokes, de vazut
//     for(const bucketEvent of bucketEvents) {
//         const event = bucketEvent.event
//         const percentage = bucketEvent.percentage;

//         if (event) {
//             const rate = percentage * event.computeRateOfEvent();
//             rates.push(rate);
//         }
//     }

//     const mean_rate = mean(rates);

//     if(mean_rate > FOCUS_RATE_TRESHOLD)
//         return 'focus';
//     if(mean_rate > ACTIVE_RATE_TRESHOLD)
//         return 'active';
//     return 'idle';
// }


function mean(rates: number[]) : number {
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

// function standardDeviation(rates: number[]): number {
//     const avg = mean(rates);
//     const variance = rates.reduce((sum, rate) => sum + (rate - avg) ** 2, 0) / rates.length;
//     return Math.sqrt(variance);
// }

// function coefficientOfVariation(rates: number[]): number {
//     const m = mean(rates);
//     return m !== 0 ? standardDeviation(rates) / m : 0;
// }
