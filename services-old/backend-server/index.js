import app from "./server.js";
import AWS from 'aws-sdk';

export const lambda = new AWS.Lambda({ region: 'us-east-1' });

// export const lambda = new AWS.Lambda({
//     endpoint: 'http://127.0.0.1:3001',  // Point to local Lambda started by SAM
//     region: 'us-east-1',  // Fake region, since it's running locally
//     credentials: new AWS.Credentials({
//         accessKeyId: 'fakeAccessKey',  // Fake credentials since this is local
//         secretAccessKey: 'fakeSecretKey'
//     })
// });

const port = 3002;

// update so it listens on all ports!
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    });