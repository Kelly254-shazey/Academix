import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import json

# Sample data - in real implementation, this would come from database
data = {
    'past_attendance': [0.8, 0.9, 0.7, 0.85, 0.6],
    'class_time': [9, 14, 10, 11, 16],  # hour of day
    'day_of_week': [1, 2, 3, 4, 5],  # Monday=0, Sunday=6
    'course_difficulty': [3, 2, 4, 3, 5],  # 1-5 scale
    'lecturer_punctuality': [0.9, 0.95, 0.8, 0.88, 0.7],
    'absent': [0, 0, 1, 0, 1]  # target
}

df = pd.DataFrame(data)

X = df.drop('absent', axis=1)
y = df['absent']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Make predictions for all students
predictions = model.predict_proba(X)[:, 1]  # Probability of being absent

# Output predictions as JSON
output = [{'student_id': i+1, 'absenteeism_risk': float(pred)} for i, pred in enumerate(predictions)]
print(json.dumps(output))
