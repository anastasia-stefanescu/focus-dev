import axios from 'axios';
import { service_database_port } from '../Constants';
import { window } from 'vscode';
import { json } from 'body-parser';
import { HDBSCANEvent } from '../Clustering/hdbscan';
import { Event } from '../EventTracking/event_models';

const base_url = `http://localhost:${service_database_port}`;
//const cloud_url = `http://52.251.15.216:80`
// UNCOMMENT THIS WHEN USING CLOUD!!!!!!!!

export async function sendEventsToAWSDB(tableName: string, events: Event[]) {
  console.log(`Sending ${events.length} events to AWS DB for table ${tableName}`);
  const jsonArray = events.map(e => JSON.parse(JSON.stringify(e)));

  try {
    const res = await axios.post("https://xhnt1w4lah.execute-api.us-east-1.amazonaws.com/events", {
      userId: "user123",
      table: tableName,
      events: jsonArray
    });
    console.log(res.data);
    return res.data;
  } catch (error) {
    console.error('Error sending events to AWS DB:', error);
    window.showErrorMessage('Failed to send events to AWS DB. Please check the console for details.');
    return;
  }
}

export async function getEventsToAWSDB(tableName: string, start: string, end: string, userId: string,
  projectName: string | undefined = undefined, branch:string | undefined = undefined, source: string | undefined = undefined) {

  const res = await axios.post("https://xhnt1w4lah.execute-api.us-east-1.amazonaws.com/events", {
    userId: "user123",
    table: tableName,
    start: start,
    end: end,
    projectName: projectName,
    branch: branch,
    source: source
  });

  console.log(res.data);
  return res.data;
}

export async function postToCluster(events: HDBSCANEvent[], rate: number) {
  console.log(`Sending ${events.length} events to AWS for clustering with rate ${rate}`);
  const jsonArray = events.map(e => JSON.parse(JSON.stringify(e)));
  const res = await axios.post("https://xhnt1w4lah.execute-api.us-east-1.amazonaws.com/cluster", {
    events: jsonArray,
    rate: rate
  });

  console.log(res.data);
  return res.data;
}

//send to server
export const post_to_services = async (endpoint: string, content: any) => {
    window.showInformationMessage(`Inside post to service ${endpoint}`);
    try {
        const response = await axios.post(base_url + endpoint, content);
        console.log('Response:', response.data);
        window.showInformationMessage('got from AWS:', String(response));
        return response.data;
    } catch (error) {
      console.error('Axios error:', error);
    }
};

export const get_from_services = async (endpoint: string, content: any) => {
  try {
      const response = await axios.get(base_url + endpoint, content );
      window.showInformationMessage('got from Bancked:', String(response));
      return response;
  } catch (error) {
    console.error('Axios error:', error);
  }
};

