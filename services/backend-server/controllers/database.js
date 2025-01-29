import cassandra from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid'; 

export const client = new cassandra.Client({
  contactPoints: ['cassandra-service'],  // Use the service name instead of ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'code_stats',
});

export const logActivity = async (activityDuration, startTime, activityType) => {
  const query = 'INSERT INTO activities (id, action_duration, action_type, start_time) VALUES (?, ?, ?, ?)';
  console.log(query);
  await client.execute(query, [uuidv4(), activityDuration, activityType, startTime], { prepare: true });
};


//beginInterval < startTime and startTime < endInterval

export const fetchActivities = async (beginInterval, endInterval) => {
  const query = `SELECT * from activities where (${beginInterval} < start_time and start_time  < ${endInterval})`;
  console.log(query);
  const result = await client.execute(query);
  console.log(result);
  return result;
};

// export const updateActivity = async () => {
  
// }