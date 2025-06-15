from transformers import AutoTokenizer
from torch.utils.data import Dataset
from torch.utils.data import DataLoader
import torch
from transformers import AutoModelForSequenceClassification
from sklearn.model_selection import train_test_split
import pandas as pd
import pytorch_lightning as pl
from torch.optim import AdamW

class SentenceDataset(Dataset):
    def __init__(self, inputs, labels):
        self.inputs = inputs
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: val[idx] for key, val in self.inputs.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item
    
class BERTFineTuner(pl.LightningModule):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask=None, labels=None):
        return self.model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)


    def training_step(self, batch, batch_idx):
        outputs = self(batch["input_ids"], attention_mask=batch["attention_mask"], labels=batch["labels"])
        loss = outputs.loss
        self.log("train_loss", loss)
        return loss

    def validation_step(self, batch, batch_idx):
        outputs = self(batch["input_ids"], attention_mask=batch["attention_mask"], labels=batch["labels"])
        val_loss = outputs.loss
        self.log("val_loss", val_loss)

    def configure_optimizers(self):
        return AdamW(self.model.parameters(), lr=2e-5)
    
##############################

train_df = pd.read_csv('Senti4SD_Extended_sA.csv')   
val_and_test_df = pd.read_csv('Senti4SD_Pilot.csv')

train_df["labels"] = train_df["Label"].apply(
    lambda x: 2 if x == "positive" else (0 if x == "negative" else 1)
)

val_and_test_df["labels"] = val_and_test_df["Label"].apply(
    lambda x: 2 if x == "positive" else (0 if x == "negative" else 1)
)

train_inputs = {
    "input_ids": train_df["id"],
    "attention-mask": train_df["Text"],
    "labels": train_df["labels"],
}

val_and_test_inputs = {
    "input_ids": val_and_test_df["id"],
    "attention-mask": val_and_test_df["Text"],
    "labels": val_and_test_df["labels"],
}

train_txt = train_inputs["attention-mask"].tolist()
train_lab = train_inputs["labels"].tolist()
val_txt, test_txt, val_lab, test_lab = train_test_split(val_and_test_inputs["attention-mask"], val_and_test_inputs["labels"], test_size=0.33, random_state=42)
val_txt = val_txt.tolist()
val_lab = val_lab.tolist()

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
# Load pre-trained BERT with a classification head for 3 possible classes
model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=3)

##############################

tok_train_inputs = tokenizer(train_txt, padding=True, truncation=True, return_tensors="pt", max_length=128)
tok_val_inputs = tokenizer(val_txt, padding=True, truncation=True, return_tensors="pt", max_length=128)

train_dataset = SentenceDataset(tok_train_inputs, train_lab)
val_dataset = SentenceDataset(tok_val_inputs, val_lab)

train_dataloader = DataLoader(train_dataset, batch_size=8, shuffle=True)
val_dataloader = DataLoader(val_dataset, batch_size=8)

##############################


trainer = pl.Trainer(max_epochs=3, accelerator="auto", devices="auto", logger=False, enable_checkpointing=False)
model = BERTFineTuner(model)
trainer.fit(model, train_dataloader, val_dataloader)

##############################

model.model.save_pretrained("fine_tuned_bert")
tokenizer.save_pretrained("fine_tuned_bert")

#fine_tuned_model = AutoModelForSequenceClassification.from_pretrained("fine_tuned_bert")