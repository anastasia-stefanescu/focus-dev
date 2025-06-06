from sklearn.cluster import DBSCAN
import numpy as np
import pandas as pd

num_events = 200

random_intervals = np.random.exponential(scale=60, size=num_events)

start_time = pd.Timestamp('2025-06-01 00:00:00')
timestamps = [start_time]
for interval in random_intervals:
    timestamps.append(timestamps[-1] + pd.Timedelta(seconds=interval))

event_types = np.random.choice(['typing', 'execute', 'debug', 'test'], size=num_events)
df = pd.DataFrame({'timestamp': timestamps[:num_events], 'event': event_types})

# Convert timestamps to numeric values (e.g., Unix timestamps)
df['timestamp_numeric'] = df['timestamp'].astype(np.int64) // 10**9

# Prepare the data for clustering
X = df[['timestamp_numeric']].values

# Adjust DBSCAN parameters
# Try setting eps smaller (e.g., 60 seconds) and lower min_samples (e.g., 2)
db = DBSCAN(eps=90, min_samples=2)  # eps is the radius of the neighborhood in seconds, min_samples is the minimum number of points required for a cluster
df['cluster'] = db.fit_predict(X)

# Extract periods of dense clusters (cluster label >= 0 means it's a detected cluster)
dense_clusters = df[df['cluster'] >= 0]

print(dense_clusters)
