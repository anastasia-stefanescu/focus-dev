import numpy as np
from sklearn.cluster import HDBSCAN
from scipy.spatial.distance import pdist, squareform
import statistics


segments = [
    {'start_time': 51, 'end_time': 68, 'rate': 1.834347898661638},
    {'start_time': 71, 'end_time': 88, 'rate': 5.96850157946487},
    {'start_time': 82, 'end_time': 93, 'rate': 0.5808361216819946},
    {'start_time': 87, 'end_time': 96, 'rate': 6.011150117432088},
    {'start_time': 23, 'end_time': 30, 'rate': 0.20584494295802447},
    {'start_time': 1, 'end_time': 13, 'rate': 8.324426408004218},
    {'start_time': 37, 'end_time': 43, 'rate': 1.8182496720710062},
    {'start_time': 20, 'end_time': 25, 'rate': 3.0424224295953772},
    {'start_time': 21, 'end_time': 38, 'rate': 4.319450186421157},
    {'start_time': 48, 'end_time': 63, 'rate': 6.118528947223795}
]


def get_clusters(segments):

    # Step 2: Extract feature values (e.g., mean value) for each segment
    segment_values = np.array([seg['rate'] for seg in segments])

    # Step 3: Calculate distances (both based on time and mean values)
    time_distances = pdist([[seg['start_time'], seg['end_time']] for seg in segments], metric='euclidean')
    mean_value_distances = pdist(segment_values.reshape(-1, 1), metric='euclidean')

    # Combine distances into a single distance matrix (you can normalize them if necessary)
    combined_distances = (time_distances + mean_value_distances) / 2

    # Step 4: Apply HDBSCAN using the precomputed distance matrix
    distance_matrix = squareform(combined_distances)
    clusterer = HDBSCAN(min_cluster_size=2, metric='precomputed', cluster_selection_epsilon=0.5)
    clusterer.fit(distance_matrix)

    cluster_labels = clusterer.labels_
    print(cluster_labels)

    cluster_data = {}

    for idx, label in enumerate(cluster_labels):
        if label not in cluster_data:
            cluster_data[int(label)] = {'start_time': segments[idx]["start_time"], 'end_time': segments[idx]["end_time"], 'rate': segments[idx]["rate"], 'no_events': 1}
        else:
            if segments[idx]["start_time"] < cluster_data[label]['start_time']:
                cluster_data[label]['start_time'] = segments[idx]["start_time"]
            if segments[idx]["end_time"] > cluster_data[label]['end_time']:
                cluster_data[label]['end_time'] = segments[idx]["end_time"]
            cluster_data[label]['rate'] = cluster_data[label]['rate'] + segments[idx]["rate"]
            cluster_data[label]['no_events'] += 1


    return cluster_data


#print(get_clusters(segments))
