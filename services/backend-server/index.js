import app from "./server.js";
import AWS from 'aws-sdk';

export const lambda = new AWS.Lambda({ region: 'us-east-1' });

const port = 3002;

// update so it listens on all ports!
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    });