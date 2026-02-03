# download_data.py
import pandas as pd
from sklearn.datasets import load_diabetes
from sklearn.model_selection import train_test_split
import numpy as np

# Load diabetes dataset
diabetes = load_diabetes()
X = diabetes.data
y = (diabetes.target > diabetes.target.mean()).astype(int)  # Binary classification

# Create DataFrame
df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(X.shape[1])])
df['target'] = y

# Split into 3 non-IID datasets (simulate different hospitals)
# Hospital A: 40% of data
# Hospital B: 35% of data
# Hospital C: 25% of data

indices = np.arange(len(df))
np.random.shuffle(indices)

split_a = int(0.4 * len(df))
split_b = int(0.75 * len(df))

hospital_a = df.iloc[indices[:split_a]]
hospital_b = df.iloc[indices[split_a:split_b]]
hospital_c = df.iloc[indices[split_b:]]

# Save datasets
hospital_a.to_csv('fl-client/data/hospital_a.csv', index=False)
hospital_b.to_csv('fl-client/data/hospital_b.csv', index=False)
hospital_c.to_csv('fl-client/data/hospital_c.csv', index=False)

print(f"Hospital A: {len(hospital_a)} samples")
print(f"Hospital B: {len(hospital_b)} samples")
print(f"Hospital C: {len(hospital_c)} samples")