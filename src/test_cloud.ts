
import { window } from "vscode";
import { ActivityRequest } from "./Constants";
import { post_to_services, get_from_services } from "./API/api_wrapper";


export async function testing_cluster_and_services () {
    await put_into_database();

    // const activities = await get_from_database();
    // window.showInformationMessage('got activities:', String(activities));

    // const result = await send_to_inference();
    // window.showInformationMessage('got result:', result ?? '');
}

export async function put_into_database() {
    window.showInformationMessage('Starting send request');
    const aux = {
        activityDuration: 350, 
        startTime: 40000, 
        activityType: 'coding'
    };

    await post_to_services('/activity', aux);
}

export async function get_from_database() {
    window.showInformationMessage('Testing getting from database');

    const activities = await get_from_services('/activity', {begin: 10000, end: 50000});
    console.log('got activities', activities);
    return activities;
}

export async function send_to_inference() {
    window.showInformationMessage('Sending to inference');

    const requestBody = {"data": [
        [1,2,3,4,5,6,7,8,9,10], 
        [10,9,8,7,6,5,4,3,2,1]
    ]};

    const results = await post_to_services('/inference', requestBody);

    return results;
    
}

export async function do_chart() {
    window.showInformationMessage('Doing chart');

    const requestBody = {
        "data":[
            {
            "activityDuration": "100",
            "startTime": "17000",
            "activityType": "coding"
            },
            {
                "activityDuration": "220",
                "startTime": "25500",
                "activityType": "debugging"
            },
            {
                "activityDuration": "80",
                "startTime": "30000",
                "activityType": "coding"
            },
            {
                "activityDuration": "190",
                "startTime": "32000",
                "activityType": "debugging"
            },
            {
                "activityDuration": "500",
                "startTime": "35000",
                "activityType": "coding"
            }
        ]
    }

    const embedUrl = await post_to_services('/dashboard/activity', requestBody);


}