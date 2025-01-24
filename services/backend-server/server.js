import express from 'express';
import cors from 'cors';
import { activityRouter } from './routes/activityRouter';
import { dashboardRouter } from './routes/dashboardRouter';
import { inferenceRouter } from './routes/inferenceRouter';
import { test_endpoint  } from './server_actions';
 

const port = 3002;

const app = express();
app.set('port', port);

// Middleware
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello, TypeScript with Node.js!');
});

//app.post('/dashboard', test_endpoint)

//Routing
app.use('/activity', activityRouter);
app.use('/dashboard', dashboardRouter);
app.use('/inference', inferenceRouter);

export default app;



