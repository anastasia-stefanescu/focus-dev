import axios from 'axios';


// cluster also events of the same type, but with larger time gaps?




export async function classifyWithSVM(features: number[]): Promise<void> {
    console.log('Classifying with SVM...');
    try {
        const convertedFeatures = features.map(feature => Number(feature));
        console.log('Converted features:', convertedFeatures);
        console.log('Type of converted features:', typeof convertedFeatures[0]);

        const response = await axios.post('http://localhost:5000/predict', {
            features: convertedFeatures
        });
        console.log('Response from SVM server:', response
        );

        console.log('Predicted class:', response.data.prediction);
    } catch (error) {
        console.error('Error classifying:', error);
    }
}
