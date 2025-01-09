import axios from 'axios';
import { service_database_port } from '../Constants';
import { window } from 'vscode';

const base_url = `http://localhost:${service_database_port}`;

//send to server
export const post_to_services = async (endpoint: string, content: any) => {
    window.showInformationMessage(`Inside post to service ${endpoint}`);
    try {
        const response = await axios.post(base_url + endpoint, content );
        console.log('Response:', response.data);
    } catch (error) {
      console.error('Axios error:', error);
    }
};

export const get_from_services = async (endpoint: string, content: any) => {
  try {
      const response = await axios.get(base_url + endpoint, content );
      console.log('Response:', response.data);
  } catch (error) {
    console.error('Axios error:', error);
  }
};

  export function isResponseOk(resp: any) {
    let status = getResponseStatus(resp);
    if (status && resp && status < 300) {
      return true;
    }
    return false;
  }
  

  function getResponseStatus(resp: any) {
    let status = null;
    if (resp?.status) {
      status = resp.status;
    } else if (resp?.response && resp.response.status) {
      status = resp.response.status;
    } else if (resp?.code === 'ECONNABORTED') {
      status = 500;
    } else if (resp?.code === 'ECONNREFUSED') {
      status = 503;
    }
    return status;
  }

