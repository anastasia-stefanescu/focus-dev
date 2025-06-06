import numpy as np
from sklearn.cluster import HDBSCAN
import matplotlib.pyplot as plt
from scipy.spatial.distance import pdist, squareform

# Step 1: Generate random 1D data points
np.random.seed(42)  # Set seed for reproducibility
n_points = 100
data = np.random.randn(n_points, 1)  # 100 points in 1D (single feature)

# Step 2: Sort the data in ascending order
data_sorted = np.sort(data, axis=0)  # Sort the data in ascending order
print(data_sorted)


# Step 2: Calculate pairwise distances (Euclidean distance in this case, which is just the absolute difference in 1D)
distance_matrix = pdist(data_sorted, metric='euclidean')  # Pairwise distances
distance_matrix_square = squareform(distance_matrix)  # Convert to square form matrix

# Step 3: Apply HDBSCAN
clusterer = HDBSCAN(min_cluster_size=5, min_samples=2, metric='precomputed')
clusterer.fit(distance_matrix_square)

# Step 4: Plot the results
plt.figure(figsize=(8, 6))
plt.scatter(data_sorted, np.zeros_like(data_sorted), c=clusterer.labels_, cmap='viridis', s=50, alpha=0.7)
plt.title('HDBSCAN Clustering on Random 1D Data')
plt.xlabel('Data Values (1D)')

# Remove the Y-axis
plt.gca().get_yaxis().set_visible(False)

plt.colorbar(label='Cluster Labels')
plt.show()

# Print cluster labels for inspection
print(f"Cluster Labels: {clusterer.labels_}")
