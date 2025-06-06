import axios from 'axios';
import { service_database_port } from '../Constants';
import { window } from 'vscode';

const base_url = `http://localhost:${service_database_port}`;
//const cloud_url = `http://52.251.15.216:80`
// UNCOMMENT THIS WHEN USING CLOUD!!!!!!!!

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

