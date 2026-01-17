# client_inference.py
import pickle
import numpy as np
import pandas as pd
import tensorflow as tf

# Load weights
with open(r'C:\Users\hassa\OneDrive\Desktop\FLApp\backend\models\global_model_1768636640.pkl', 'rb') as f:
    weights = pickle.load(f)
weights = [np.array(w) for w in weights]  # convert lists to arrays

# Define model architecture (must match training)
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(10,)),   # cleaner than input_shape in Dense
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

# Set weights
model.set_weights(weights)

# Load test data
test_data = pd.read_csv(r'C:\Users\hassa\OneDrive\Desktop\FLApp\fl-client\data\hospital_a.csv')

# Separate features and target
X = test_data.drop(columns=["target"]).values   # only features
y_true = test_data["target"].values             # optional, for evaluation

# Normalize features (same preprocessing as training)
X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)

# Predict
predictions = model.predict(X)
print(f"Risk predictions: {predictions}")

# Optional: compare predictions with ground truth
from sklearn.metrics import accuracy_score, roc_auc_score

binary_preds = (predictions > 0.5).astype(int)
print("Accuracy:", accuracy_score(y_true, binary_preds))
print("ROC-AUC:", roc_auc_score(y_true, predictions))

import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc

# Histogram of predicted risk scores
plt.figure(figsize=(6,4))
plt.hist(predictions, bins=20, color='skyblue', edgecolor='black')
plt.title("Histogram of Predicted Risk Scores")
plt.xlabel("Predicted Probability")
plt.ylabel("Frequency")
plt.show()

# Scatter plot: true vs predicted
plt.figure(figsize=(6,4))
plt.scatter(range(len(y_true)), predictions, c=y_true, cmap='coolwarm', alpha=0.7)
plt.title("True Labels vs Predicted Probabilities")
plt.xlabel("Sample Index")
plt.ylabel("Predicted Probability")
plt.colorbar(label="True Label")
plt.show()

# ROC curve
fpr, tpr, thresholds = roc_curve(y_true, predictions)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(6,6))
plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.2f})')
plt.plot([0,1], [0,1], color='navy', lw=2, linestyle='--')
plt.title("Receiver Operating Characteristic (ROC)")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.legend(loc="lower right")
plt.show()
