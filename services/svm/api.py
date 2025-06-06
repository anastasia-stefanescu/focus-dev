from flask import Flask, request, jsonify
import joblib
import numpy as np
from segment_hdbscan import get_clusters

# Load the trained SVM model
model = joblib.load('svm_model.pkl')

app = Flask(__name__)

@app.route('/cluster', methods=['POST'])
def predict():
    try:
        data = request.get_json()  # Get data from the request
        events = data['events']  # Features should be sent as a list or array
        print("Received events:", events)

        # Get clusters using the HDBSCAN function
        clusters = get_clusters(events)

        print("Returned clusters:", clusters)

        return jsonify({'clusters': clusters})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
