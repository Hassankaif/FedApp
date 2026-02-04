import requests

url = "https://api.kaif-federatedapp.me/api/projects/"
payload = {
    "name": "Diabetes Test",
    "description": "Demo project",
    "owner_id": 1,
    "model_code": """import tensorflow as tf

def create_model(input_shape):
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(10, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model
""",
    "csv_schema": "['age','bmi','glucose','target']",  # JSON string, not array
    "target_column": "target",
    "num_rounds": 5,
    "min_clients": 1
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
