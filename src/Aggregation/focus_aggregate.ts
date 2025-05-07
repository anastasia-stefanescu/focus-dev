

// passive vs active code time
// get overall time??

import { DocumentChangeInfo, Event, EventType, ExecutionEventInfo, getNewEvent, Source, UserActivityEventInfo } from "../EventTracking/event_models";
import { instance } from "../extension";
import { window } from 'vscode';
import { BucketEvent, group_events_by_time_unit } from "./time_aggregate";

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




// Includes all kinds of events
export function computeOverallFocus(time_unit: 'hour' | 'day', projectName: string | undefined) {

}


// how do we map this data in the chart? We need for each hour/day, right?
export async function compute_focus_level_for_time_unit(time_unit: 'hour' | 'day', focus_type: 'focus' | 'active', projectName: string | undefined) {
    const FOCUS_RATE_TRESHOLD = 100;
    const ACTIVE_RATE_TRESHOLD = 70;

    const allbucketEvents : {[key: string]:BucketEvent[]} = await group_events_by_time_unit(time_unit, 'document', projectName);
    // only user written document changes!


    const rates : number[] = [];
    // in case of AI document changes / external document changes, the rate is calculated by singleAdds/multiAdds/keystrokes, de vazut
    for(const key of Object.keys(allbucketEvents)) {
        const event = allbucketEvents[key][0].event
        const percentage = allbucketEvents[key][0].percentage;

        if (event) {
            const rate = percentage * event.computeRateOfEvent();
            rates.push(rate);
        }
    }

}

export function compute_active_periods(time_unit: 'hour' | 'day') {

}



function mean(rates: number[], time_unit: 'hour' | 'day') {
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

function computeCoefficientOfVariation(events: Event[], time_unit: 'hour' | 'day') {

}
