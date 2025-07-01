import { BucketEvent } from "../Aggregation/time_aggregate";
import { post_to_services } from "../API/api_wrapper";
import { DocumentChangeInfo } from "../EventTracking";

export interface HDBSCANEvent {
    'start_time': number;
    'end_time': number;
    'rate': number;
    'no_events': number;
}


export async function getHDBSCANResults(bucketEvents: BucketEvent[], rate_threshold: number = 0.5) {
    //const hdbscanEvents = getHDBSCANEvents(bucketEvents);
    const hdbscanEvents: HDBSCANEvent[] = [
        { 'start_time': 51, 'end_time': 68, 'rate': 1.834347898661638, 'no_events': 3 },
        { 'start_time': 71, 'end_time': 88, 'rate': 5.96850157946487, 'no_events': 2 },
        { 'start_time': 82, 'end_time': 93, 'rate': 0.5808361216819946, 'no_events': 1 },
        { 'start_time': 87, 'end_time': 96, 'rate': 6.011150117432088, 'no_events': 8 },
        { 'start_time': 23, 'end_time': 30, 'rate': 0.20584494295802447, 'no_events': 6 },
        { 'start_time': 1, 'end_time': 13, 'rate': 8.324426408004218, 'no_events': 4 },
        { 'start_time': 37, 'end_time': 43, 'rate': 1.8182496720710062, 'no_events': 7 },
        { 'start_time': 20, 'end_time': 25, 'rate': 3.0424224295953772, 'no_events': 6 },
        { 'start_time': 21, 'end_time': 38, 'rate': 4.319450186421157, 'no_events': 8 },
        { 'start_time': 48, 'end_time': 63, 'rate': 6.118528947223795, 'no_events': 4 }
    ];


    const hdbscanResults = await post_to_services('/cluster', { "events": hdbscanEvents, "rate_threshold": rate_threshold });
    const clusters = hdbscanResults['clusters'];
    console.log(`HDBSCAN clusters: ${JSON.stringify(clusters)}`);
    return clusters;
}



export function getHDBSCANEvents(bucketEvents: BucketEvent[]): HDBSCANEvent[] {
    const hdbscanEvents: HDBSCANEvent[] = [];

    // in case of AI document changes / external document changes, the rate is calculated by singleAdds/multiAdds/keystrokes, de vazut
    for (const bucketEvent of bucketEvents) {
        const event = bucketEvent.event
        const percentage = bucketEvent.percentage;

        // CHECK HERE IF TYPE IS PRESERVED!!!!
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

// export function constructHDBSCANEventFromDocChange(bucketEvents : BucketEvent[]): HDBSCANEvent[] {
//     const hdbscanEvents: HDBSCANEvent[] = [];
//     for (const bucketEvent of bucketEvents) {
//         if (bucketEvent.event instanceof DocumentChangeInfo) {
//             let noActivities = (bucketEvent.event?.keystrokes ?? 0) * bucketEvent.percentage;
//             // here we are considering even the ai code as written code?, that means the user is in the process of coding
//             // noActivities += ((bucketEvent.event?.singleAdds ?? 0) + (bucketEvent.event?.multiAdds ?? 0)) * bucketEvent.percentage;
//             // noActivities += (bucketEvent.event?.replacements ?? 0) * bucketEvent.percentage;
//             const time = (Number(bucketEvent.event?.end) - Number(bucketEvent.event?.start)) * bucketEvent.percentage;
//             const rate = noActivities / (time / 1000); // rate in events per second
//             const hdbscanEvent: HDBSCANEvent = {
//                 'start_time': Number(bucketEvent.event?.start),
//                 'end_time': Number(bucketEvent.event?.end),
//                 'rate': rate,
//                 'no_events': noActivities
//             };
//             hdbscanEvents.push(hdbscanEvent);
//         }

//     }
//     return hdbscanEvents;
// }
