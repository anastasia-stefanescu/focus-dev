import app from "./server.js";
import AWS from 'aws-sdk';

export const lambda = new AWS.Lambda({ region: 'us-east-1' });

const port = 3002;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    });