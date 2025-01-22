from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import pandas as pd
import joblib
import os
import json

# Global variable to store the model
device = None
tokenizer = None
model = None

def init():
    """
    This function is called when the service is initialized. For subsequent request the resources loaded here will be used.
    """
    global model, tokenizer, device
    try:
        # Get the model directory path from the environment variable
        #model_dir = os.getenv('AZUREML_MODEL_DIR')
        model_dir = "/Users/alinstefanescu/Documents/code-stats/services/inference/fine_tuned_bert"

        model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        tokenizer = AutoTokenizer.from_pretrained(model_dir)

        device = "cpu"
        model.to(device)

        print("Model and tokenizer loaded successfully on device: ", device)
    except Exception as e:
        print(f"Error during initialization: {e}")
        raise

def run(data):
    try:
        # Parse the incoming data
        input_data = json.loads(data)
        print("Received input data:", input_data)

        text = input_data.get("text", None)
        if text is None:
            raise ValueError("Input JSON must contain a 'text' field.")
        
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
        inputs = {key: val.to(device) for key, val in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predictions = torch.argmax(logits, dim=1).cpu().tolist()  # Convert predictions to CPU and list format

        return json.dumps({"predictions": predictions})
    except Exception as e:
        error_message = f"Error during inference: {str(e)}"
        print(error_message)
        return json.dumps({"error": error_message})

