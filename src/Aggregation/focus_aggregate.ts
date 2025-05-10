

// passive vs active code time
// get overall time??

import { DocumentChangeInfo, Event, EventType, ExecutionEventInfo, getNewEvent, Source, UserActivityEventInfo } from "../EventTracking/event_models";
import { instance } from "../extension";
import { window } from 'vscode';
import { BucketEvent, group_events_by_time_unit } from "./time_aggregate";
import { time } from "console";

// Looking for:
// idle => window is in focus, little to no activity
// (passive => only user activities allowed) -> this might be code review so not taking into account for focus
// active => document changes

// returns focus/active periods and total focus/active time per period

// pre-procesare: concatenarea elementelor care mai pot fi sparte
// pentru o unitate de timp(1 ora de ex):
// adunam minutele per activitate, display 'bar' spart in bucati per activitate

// Options: week, day -> TIMEZONES FOR HOURS!!!!???

// For focus/activity, what we first want to see are document changes
// If these exist in a decent amount, we can add in user activity and execution events

// iterate through events starting with a small group
// Add a new event to the current interval
// Calculate interval's focus level by Coefficient of Variation/Gini Coefficient
// If the newly added event changes the focus level (focus falls under or above previous category treshold)
// We start a new interval?

const FOCUS_RATE_TRESHOLD : number = 0.5; // > 0.5 - 0.7 keystrokes per second. If writing continuously, it can even be easily double
const ACTIVE_RATE_TRESHOLD : number = 0.2; // > 0.2 - 0.5 keystrokes per second. If writing continuously, it can even be easily double
const VARIANCE_TRESHOLD : number = 0.5;

export type FocusLevel = 'active' | 'focus' | 'idle'; // focus level of the user

export function computeFocusStatistics(time_unit: 'hour' | 'day', projectName: string | undefined) {}


// Includes all kinds of events
// spans over an entire hour / day
export async function computeOverallFocus(time_unit: 'hour' | 'day', projectName: string | undefined) {
    // determine doc changes focus first
    const allbucketEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'document', projectName);

    for (const interval in Object.keys(allbucketEvents)) {
        const events = allbucketEvents[interval];

        const {focusPeriods, activePeriods} = iterateThroughEvents(events, time_unit, projectName);
    }

    // if these exist in a decent amount, we can add in user activity and execution events

}

export function iterateThroughEvents(bucketEvents: BucketEvent[], time_unit: 'hour' | 'day', projectName: string | undefined) {
    // de intrebat chatgpt daca e ok
    let startDate = Number(bucketEvents[0].event?.start);
    const fifteenMinutes = 15 * 60; // 15 minutes in seconds (use millliseconds?)
    const length = bucketEvents.length;
    const focusPeriods : [number, number][] = [];
    const activePeriods : [number, number][] = [];
    let currentFocusLevel : FocusLevel;


    let currentFocusPeriod : BucketEvent[] = [];
    let index = 0
    // let's keep the date in seconds
    while (Number(bucketEvents[index].event?.end) < startDate + fifteenMinutes && index < length) {
        const event = bucketEvents[index];
        currentFocusPeriod.push(event);
        index++;
    }

    currentFocusLevel = computeFocusLevelForEvents(currentFocusPeriod, time_unit, projectName);

    for (let i = index; i< length; i++) {
        const event = bucketEvents[i];

        const newFocusLevel = computeFocusLevelForEvents(currentFocusPeriod.concat([event]), time_unit, projectName);

        if (newFocusLevel !== currentFocusLevel) {
            // we have a new period with a differentfocus level
            const periodLength = currentFocusPeriod.length;
            const endDate = Number(currentFocusPeriod[periodLength].event?.end);

            if (currentFocusLevel === 'active')
                activePeriods.push([startDate, endDate]);
            else if (currentFocusLevel === 'focus')
                focusPeriods.push([startDate, endDate]);

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
