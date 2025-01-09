import cassandra from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid'; 

export const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'code_stats',
});

export const logActivity = async (activityDuration: number, startTime:number, activityType:string) => {
  const query = 'INSERT INTO activities (id, action_duration, action_type, start_time) VALUES (?, ?, ?, ?)';
  await client.execute(query, [uuidv4(), activityDuration, activityType, startTime], { prepare: true });
};


//beginInterval < startTime and startTime < endInterval

export const fetchActivities = async (beginInterval:Date, endInterval:Date) => {
  const query = 'SELECT * from activities where (begin < startTime and endTime )';
  const result = await client.execute(query);
  return result;
};

// export const updateActivity = async () => {
  
// }