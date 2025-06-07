import { BucketEvent, group_events_by_time_unit } from "./time_aggregate";
import { post_to_services } from "../API/api_wrapper";
import { NO_MS_IN_HOUR, NO_MS_IN_DAY, NO_SECONDS_IN_DAY, NO_SECONDS_IN_HOUR} from "../Constants";
import { sqlInstance, debug_focus_aggregate} from "../extension";
import { time } from "console";


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

interface HDBSCANEvent {
    'start_time': number;
    'end_time': number;
    'rate': number;
    'no_events': number;
}

interface FocusLevelData {
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

export async function markFocusByMinute(time_unit: 'hour' | 'day', projectName: string | undefined = undefined) {
    const now = new Date();
    const intervalsData: {[key:string]:{[key in FocusLevel]?: FocusLevelData}} = await computeIntervalsFocusData(now, time_unit, projectName);

    const minutesList :number[] = [];
    const noMinutes = time_unit === 'hour' ? 60 : (24 * 60); // 24 hours in a day
    const noMS = time_unit === 'hour' ? NO_MS_IN_HOUR * 1000 : NO_MS_IN_DAY * 1000;
    const minuteStart = new Date(now.getTime() - noMS);

    for (let i = 0; i < noMinutes; i++) {
        minutesList.push(0);
    }

    for (const interval in Object.keys(intervalsData)) {
        const intervalData = intervalsData[interval];
        for (const key in focusLevels) {
            const focusPeriods : [number, number][] = intervalData[key as FocusLevel]?.periods || [];
            const noPeriods = focusPeriods.length;
            for (let i = 0; i< noPeriods; i++) {
                const start = focusPeriods[i][0];
                const end = focusPeriods[i][1];
                const noMinutesInPeriod = Math.ceil((end - start) / (60 * 1000)); // in minutes

                for (let j = 0; j < noMinutesInPeriod; j++) {
                    const minuteIndex = Math.floor((start + j * 60 * 1000));

                    if (minuteIndex >= 0 && minuteIndex < noMinutes) {
                        minutesList[minuteIndex] = intervalData[key as FocusLevel]?.id || 0;
                    }
                }
            }
        }
    }




}

export async function computeIntervalsFocusData(crtTime: Date, time_unit: 'hour' | 'day', projectName: string | undefined = undefined)
    : Promise<{ [key: string]: { [key in FocusLevel]?: FocusLevelData } }>
{
    const now = crtTime;
    const docEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName, now);
    const userActivityEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'userActivity', projectName, now);
    const executionEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName, now);
    // does this work, how to common intervals concatenate??
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
                const nextInterval = i + 1 < noIntervals ? intervals[i + 1] : now.getTime().toString();
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

export async function getHDBSCANResults(bucketEvents: BucketEvent[], rate_threshold: number = 0.5) {
    //const hdbscanEvents = getHDBSCANEvents(bucketEvents);
    const hdbscanEvents: HDBSCANEvent[] = [
        { 'start_time': 51, 'end_time': 68, 'rate': 1.834347898661638, 'no_events': 3 },
        { 'start_time': 71, 'end_time': 88, 'rate': 5.96850157946487 , 'no_events': 2 },
        { 'start_time': 82, 'end_time': 93, 'rate': 0.5808361216819946 , 'no_events': 1 },
        { 'start_time': 87, 'end_time': 96, 'rate': 6.011150117432088 , 'no_events': 8 },
        { 'start_time': 23, 'end_time': 30, 'rate': 0.20584494295802447, 'no_events': 6 },
        { 'start_time': 1, 'end_time': 13, 'rate': 8.324426408004218 , 'no_events': 4},
        { 'start_time': 37, 'end_time': 43, 'rate': 1.8182496720710062, 'no_events': 7 },
        { 'start_time': 20, 'end_time': 25, 'rate': 3.0424224295953772, 'no_events': 6 },
        { 'start_time': 21, 'end_time': 38, 'rate': 4.319450186421157, 'no_events': 8 },
        { 'start_time': 48, 'end_time': 63, 'rate': 6.118528947223795, 'no_events': 4 }
    ];


    const hdbscanResults = await post_to_services('/cluster', { "events": hdbscanEvents, "rate_threshold": rate_threshold});
    const clusters = hdbscanResults['clusters'];

    return clusters;
}

export function getHDBSCANEvents(bucketEvents: BucketEvent[]) {
    const hdbscanEvents: HDBSCANEvent[] = [];

    // in case of AI document changes / external document changes, the rate is calculated by singleAdds/multiAdds/keystrokes, de vazut
    for (const bucketEvent of bucketEvents) {
        const event = bucketEvent.event
        const percentage = bucketEvent.percentage;

        if (event) {
            const noEvents = event.noEvents();
            const rate = percentage * event.computeRateOfEvent();
            const hdbscanEvent = {
                'start_time': Number(event.start),
                'end_time': Number(event.end),
                'rate': rate,
                'no_events': noEvents
            }
            hdbscanEvents.push(hdbscanEvent);
        }
    }

    return hdbscanEvents;
}







export function iterateThroughEvents(bucketEvents: BucketEvent[], time_unit: 'hour' | 'day', projectName: string | undefined) {
    // de intrebat chatgpt daca e ok
    let startDate = Number(bucketEvents[0].event?.start);

    const length = bucketEvents.length;
    const focusPeriods : [number, number][] = [];
    const activePeriods : [number, number][] = [];
    let currentFocusLevel : FocusLevel;


    let currentFocusPeriod : BucketEvent[] = [];
    let index = 0

    while (Number(bucketEvents[index].event?.end) < startDate + FIFTEEN_MINUTES_IN_MS && index < length) {
        const event = bucketEvents[index];
        currentFocusPeriod.push(event);
        index++;
    }

    currentFocusLevel = computeFocusLevelForEvents(currentFocusPeriod, time_unit, projectName);

    for (const event of bucketEvents.slice(index)) {

        const newFocusLevel = computeFocusLevelForEvents(currentFocusPeriod.concat([event]), time_unit, projectName);

        if (newFocusLevel !== currentFocusLevel) {
            // we have a new period with a differentfocus level
            const periodLength = currentFocusPeriod.length;
            const endDate = Number(currentFocusPeriod[periodLength].event?.end);

            if (currentFocusLevel === 'active')
                activePeriods.push([startDate, endDate]);
            else if (currentFocusLevel === 'focus')
                focusPeriods.push([startDate, endDate]);

            currentFocusLevel = newFocusLevel;
            currentFocusPeriod = [event];
            startDate = Number(event.event?.start);
        }
        else {
            currentFocusPeriod.push(event);
        }
    }
    return {focusPeriods:focusPeriods, activePeriods:activePeriods};
}



// how do we map this data in the chart? We need for each hour/day, right?
export function computeFocusLevelForEvents(bucketEvents: BucketEvent[], time_unit: 'hour' | 'day', projectName: string | undefined) : FocusLevel{
    const rates : number[] = [];
    // in case of AI document changes / external document changes, the rate is calculated by singleAdds/multiAdds/keystrokes, de vazut
    for(const bucketEvent of bucketEvents) {
        const event = bucketEvent.event
        const percentage = bucketEvent.percentage;

        if (event) {
            const rate = percentage * event.computeRateOfEvent();
            rates.push(rate);
        }
    }

    const mean_rate = mean(rates);

    if(mean_rate > FOCUS_RATE_TRESHOLD)
        return 'focus';
    if(mean_rate > ACTIVE_RATE_TRESHOLD)
        return 'active';
    return 'idle';
}


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
