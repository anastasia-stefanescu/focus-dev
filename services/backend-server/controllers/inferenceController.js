import axios from 'axios';

// That would've worked if the model was in the cluster
// const endpointUrl = process.env.AML_ENDPOINT_URL;
// const endpointKey = process.env.AML_ENDPOINT_KEY;

const url = "https://example-endpoint.eastus2.inference.ml.azure.com/score";
const apiKey = "i9sHNhfDCVXfJJf1GmVjlBTsA7cSeQYH";


export const inferenceController = {
    async evaluateText(req, res) {
        const { requestBody } = req.body;

        // const requestHeaders = new Headers({"Content-Type" : "application/json"});
        // requestHeaders.append("Authorization", "Bearer " + apiKey)
        // // This header will force the request to go to a specific deployment. Remove this line to have the request observe the endpoint traffic rules
        // requestHeaders.append("azureml-model-deployment", "example-deployment");

        // fetch(url, {
        //     method: "POST",
        //     body: requestBody,
        //     headers: requestHeaders
        // })
        // .then((response) => {
        //     if (response.ok) {
        //         return response.json();
        //     } else {
        //         // Print the headers - they include the request ID and the timestamp, which are useful for debugging the failure
        //         console.debug(...response.headers);
        //         console.debug(response.body)
        //         throw new Error("Request failed with status code" + response.status);
        //     }
        // })
        // .then((json) => console.log(json))
        // .catch((error) => {
        //     console.error(error)
        // });


        try {
            const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
            });
            res.status(200).json(response.data); // here is it okay?
        } catch (error) {
            console.error('Error calling AML endpoint:', error);
            throw error;
        }
        }
}


// Request data goes here
    // The example below assumes JSON formatting which may be updated
    

