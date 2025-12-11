import pandas as pd
from sklearn.ensemble import IsolationForest
import json

# Sample attendance data - in real implementation, this would come from database
data = {
    'student_id': [1, 1, 1, 2, 2, 2, 3, 3, 3],
    'latitude': [40.7128, 40.7128, 40.7129, 40.7589, 40.7589, 40.7589, 40.7505, 40.7505, 40.7505],
    'longitude': [-74.0060, -74.0060, -74.0061, -73.9851, -73.9851, -73.9851, -73.9934, -73.9934, -73.9934],
    'browser_fingerprint': ['fp1', 'fp1', 'fp1', 'fp2', 'fp2', 'fp2', 'fp3', 'fp3', 'fp3'],
    'timestamp': pd.date_range('2023-01-01', periods=9, freq='H')
}

df = pd.DataFrame(data)

# Feature engineering for anomaly detection
df['time_diff'] = df.groupby('student_id')['timestamp'].diff().dt.total_seconds().fillna(0)
df['coord_change'] = ((df['latitude'].diff() ** 2 + df['longitude'].diff() ** 2) ** 0.5).fillna(0)

# Prepare features for anomaly detection
features = df[['time_diff', 'coord_change']]

# Isolation Forest for anomaly detection
model = IsolationForest(contamination=0.1, random_state=42)
df['anomaly_score'] = model.fit_predict(features)

# Anomalies are marked as -1
anomalies = df[df['anomaly_score'] == -1][['student_id', 'timestamp']].to_dict('records')

# Output as JSON
print(json.dumps(anomalies))
