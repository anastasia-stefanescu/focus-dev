import axios from 'axios';
import { BucketEvent, group_events_by_time_unit } from './time_aggregate';


const actions_of_classes = {
    "Coding": ['typing', 'autocomplete', 'refactorize', 'copy/paste', 'file actions'],
    "Code Review": ['idle time', 'cursor', 'file actions', 'typing'], // less typing, "idle time" is more important
    "Testing": ['execution', 'debugging', 'testing'],
    "Refactoring" : ['refactorize', 'file actions', 'typing'], // less typing, "file actions" is more important
    // something in between coding and reviewing
}
// cluster also events of the same type, but with larger time gaps?
export async function computeIntervalsFocusData(time_unit: 'hour' | 'day', projectName: string | undefined) {
    // change back to 'documtent' when done testing
    const docEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName);
    const userActivityEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'userActivity', projectName);
    const executionEvents: { [key: string]: BucketEvent[] } = await group_events_by_time_unit(time_unit, 'execution', projectName);
    const allbucketEvents: { [key: string]: BucketEvent[] } = {...docEvents, ...userActivityEvents, ...executionEvents};


}


export async function classifyWithSVM(features: number[]): Promise<void> {
    console.log('Classifying with SVM...');
    try {
        const convertedFeatures = features.map(feature => Number(feature));
        console.log('Converted features:', convertedFeatures);
        console.log('Type of converted features:', typeof convertedFeatures[0]);

        const response = await axios.post('http://localhost:5000/predict', {
            features: convertedFeatures
        });
        console.log('Response from SVM server:', response
        );

        console.log('Predicted class:', response.data.prediction);
    } catch (error) {
        console.error('Error classifying:', error);
    }
}
