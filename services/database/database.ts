import cassandra from 'cassandra-driver';

export const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'code_stats',
});

export const logActivity = async (userId: string, codingTime: number) => {
  const query = 'INSERT INTO activities (user_id, coding_time) VALUES (?, ?)';
  await client.execute(query, [userId, codingTime], { prepare: true });
};

export const fetchActivities = async () => {
  const query = 'SELECT * from activities';
  const result = await client.execute(query);
  return result;
};