import axios from 'axios';

const endpointUrl = process.env.AML_ENDPOINT_URL;
const endpointKey = process.env.AML_ENDPOINT_KEY;

export const inferenceController = {
    async evaluateText(req, res) {
        const { comment } = req.body;

        const endpoint_exists = endpointUrl || '';

        if (endpointUrl)
        {
            try {
                const response = await axios.post(endpoint_exists, comment, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${endpointKey}`
                }
                });
                res.status(200).json(response.data); // here is it okay?
            } catch (error) {
                console.error('Error calling AML endpoint:', error);
                throw error;
            }
        }
    }
}