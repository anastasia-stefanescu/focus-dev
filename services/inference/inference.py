from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import pandas as pd

test_df = pd.read_csv('Senti4SD_Pilot.csv')
test_df["labels"] = test_df["Label"].apply(
    lambda x: 2 if x == "positive" else (0 if x == "negative" else 1)
)

test_sentences = test_df["Text"].tolist()
test_ground_truths = test_df["labels"].tolist()

##############################

tokenizer = AutoTokenizer.from_pretrained("fine_tuned_bert")

model = AutoModelForSequenceClassification.from_pretrained("fine_tuned_bert")
model.eval()

#test_sentences = ["I love programming.", "Debugging can be frustrating."]

test_inputs = tokenizer(test_sentences, padding=True, truncation=True, return_tensors="pt", max_length=128)

##############################
# Move the model and inputs to the appropriate device
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
test_inputs = {key: val.to(device) for key, val in test_inputs.items()}

##############################
with torch.no_grad():
    outputs = model(**test_inputs)
    logits = outputs.logits
    predictions = torch.argmax(logits, dim=1).cpu().numpy()
    comparations = [(predictions[i], test_ground_truths[i]) for i in range(len(test_ground_truths)) if predictions[i] == test_ground_truths[i]]

print("Predicted labels:", len(comparations))
print("Total labels:", len(test_ground_truths))

##############################