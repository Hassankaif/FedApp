import pandas as pd

hospital_a = pd.read_csv('fl-client/data/hospital_a.csv')
hospital_b = pd.read_csv('fl-client/data/hospital_b.csv')
hospital_c = pd.read_csv('fl-client/data/hospital_c.csv')

combined = pd.concat([hospital_a, hospital_b, hospital_c], ignore_index=True)
combined.to_csv('combined_dataset.csv', index=False)

print(f"Combined dataset: {len(combined)} rows")