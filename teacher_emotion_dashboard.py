import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import numpy as np

# Set page config
st.set_page_config(page_title="Emotion Recognition Game - Teacher Dashboard", layout="wide")

# ============================================================================
# SIMULATE DATA
# ============================================================================

# Set random seed for reproducibility
np.random.seed(42)

# Create student information
students = [
    {'id': 's101', 'name': 'Anna'},
    {'id': 's102', 'name': 'Ben'},
    {'id': 's103', 'name': 'Charlie'},
    {'id': 's104', 'name': 'Diana'},
    {'id': 's105', 'name': 'Ethan'}
]

# Emotions in the game
emotions = ['Happy', 'Sad', 'Angry', 'Scared']

# Create raw log data
data_list = []

for student in students:
    # Create 30 game plays per student across different dates
    base_date = datetime(2024, 1, 1) + timedelta(days=students.index(student) * 5)
    
    for i in range(30):
        timestamp = base_date + timedelta(hours=i)
        emotion_shown = np.random.choice(emotions)
        answer_selected = np.random.choice(emotions)
        is_correct = (emotion_shown == answer_selected)
        
        data_list.append({
            'student_id': student['id'],
            'student_name': student['name'],
            'timestamp': timestamp,
            'emotion_shown': emotion_shown,
            'answer_selected': answer_selected,
            'is_correct': is_correct,
            'game_level': 'Level 1'
        })

# Create DataFrame
df = pd.DataFrame(data_list)

# Adjust accuracy patterns for each student to make data more realistic
# Anna: High accuracy (85%)
anna_indices = df[df['student_name'] == 'Anna'].index
for idx in anna_indices:
    if np.random.random() < 0.85:
        df.at[idx, 'is_correct'] = True
        df.at[idx, 'answer_selected'] = df.at[idx, 'emotion_shown']
    else:
        df.at[idx, 'is_correct'] = False

# Ben: Medium accuracy (70%)
ben_indices = df[df['student_name'] == 'Ben'].index
for idx in ben_indices:
    if np.random.random() < 0.70:
        df.at[idx, 'is_correct'] = True
        df.at[idx, 'answer_selected'] = df.at[idx, 'emotion_shown']
    else:
        df.at[idx, 'is_correct'] = False

# Charlie: Lower accuracy (55%)
charlie_indices = df[df['student_name'] == 'Charlie'].index
for idx in charlie_indices:
    if np.random.random() < 0.55:
        df.at[idx, 'is_correct'] = True
        df.at[idx, 'answer_selected'] = df.at[idx, 'emotion_shown']
    else:
        df.at[idx, 'is_correct'] = False

# Diana: Very high accuracy (90%)
diana_indices = df[df['student_name'] == 'Diana'].index
for idx in diana_indices:
    if np.random.random() < 0.90:
        df.at[idx, 'is_correct'] = True
        df.at[idx, 'answer_selected'] = df.at[idx, 'emotion_shown']
    else:
        df.at[idx, 'is_correct'] = False

# Ethan: Medium-low accuracy (65%)
ethan_indices = df[df['student_name'] == 'Ethan'].index
for idx in ethan_indices:
    if np.random.random() < 0.65:
        df.at[idx, 'is_correct'] = True
        df.at[idx, 'answer_selected'] = df.at[idx, 'emotion_shown']
    else:
        df.at[idx, 'is_correct'] = False

# ============================================================================
# STREAMLIT INTERFACE
# ============================================================================

# Main title
st.title("Emotion Recognition Game - Teacher Dashboard")

# Sidebar filter
st.sidebar.header("Filters")
student_options = ["Class Overview"] + sorted(df['student_name'].unique().tolist())
selected_student = st.sidebar.selectbox("Select Student:", student_options)

# ============================================================================
# CLASS OVERVIEW
# ============================================================================

if selected_student == "Class Overview":
    st.header("Class Overview - Level 1")
    
    # Calculate overall class accuracy
    total_correct = df['is_correct'].sum()
    total_attempts = len(df)
    class_accuracy = (total_correct / total_attempts) * 100
    
    st.metric("Class Accuracy", f"{class_accuracy:.1f}%", f"{int(total_correct)}/{total_attempts} correct")
    
    # Chart 1: Class Accuracy by Emotion
    accuracy_by_emotion_data = []
    for emotion in emotions:
        emotion_df = df[df['emotion_shown'] == emotion]
        if len(emotion_df) > 0:
            accuracy = (emotion_df['is_correct'].sum() / len(emotion_df)) * 100
            accuracy_by_emotion_data.append({
                'emotion_shown': emotion,
                'accuracy': accuracy,
                'attempts': len(emotion_df)
            })
    
    accuracy_by_emotion = pd.DataFrame(accuracy_by_emotion_data)
    
    fig1 = px.bar(
        accuracy_by_emotion,
        x='emotion_shown',
        y='accuracy',
        title="Class Accuracy by Emotion",
        labels={'emotion_shown': 'Emotion', 'accuracy': 'Accuracy (%)'},
        color='accuracy',
        color_continuous_scale='Viridis',
        hover_data=['attempts']
    )
    fig1.update_yaxes(range=[0, 100])
    fig1.update_layout(showlegend=False)
    st.plotly_chart(fig1, use_container_width=True)
    
    # Display class summary table
    st.subheader("Student Performance Summary")
    student_summary = []
    for student_name in sorted(df['student_name'].unique()):
        student_df = df[df['student_name'] == student_name]
        accuracy = (student_df['is_correct'].sum() / len(student_df)) * 100
        student_summary.append({
            'Student': student_name,
            'Accuracy (%)': f"{accuracy:.1f}%",
            'Correct Answers': student_df['is_correct'].sum(),
            'Total Attempts': len(student_df)
        })
    
    summary_df = pd.DataFrame(student_summary)
    st.dataframe(summary_df, use_container_width=True)

# ============================================================================
# INDIVIDUAL STUDENT REPORT
# ============================================================================

else:
    # Filter data for selected student
    student_data = df[df['student_name'] == selected_student]
    
    st.header(f"Student Report: {selected_student}")
    
    # Calculate student accuracy
    total_correct = student_data['is_correct'].sum()
    total_attempts = len(student_data)
    student_accuracy = (total_correct / total_attempts) * 100
    
    st.metric("Student Accuracy", f"{student_accuracy:.1f}%", f"{int(total_correct)}/{total_attempts} correct")
    
    # Chart 1: Skill Mastery by Emotion
    mastery_data = []
    for emotion in emotions:
        emotion_df = student_data[student_data['emotion_shown'] == emotion]
        if len(emotion_df) > 0:
            accuracy = (emotion_df['is_correct'].sum() / len(emotion_df)) * 100
            mastery_data.append({
                'emotion_shown': emotion,
                'accuracy': accuracy,
                'attempts': len(emotion_df)
            })
    
    mastery_by_emotion = pd.DataFrame(mastery_data)
    
    fig1 = px.bar(
        mastery_by_emotion,
        x='emotion_shown',
        y='accuracy',
        title="Mastery by Emotion",
        labels={'emotion_shown': 'Emotion', 'accuracy': 'Accuracy (%)'},
        color='accuracy',
        color_continuous_scale='RdYlGn',
        hover_data=['attempts']
    )
    fig1.update_yaxes(range=[0, 100])
    fig1.update_layout(showlegend=False)
    st.plotly_chart(fig1, use_container_width=True)
    
    # Chart 2: Progress Over Time
    student_data_sorted = student_data.sort_values('timestamp')
    daily_accuracy_data = student_data_sorted.set_index('timestamp').resample('D').apply(
        lambda x: (x['is_correct'].sum() / len(x)) * 100 if len(x) > 0 else 0
    )
    daily_accuracy_df = daily_accuracy_data.reset_index()
    daily_accuracy_df.columns = ['timestamp', 'accuracy']
    
    fig2 = px.line(
        daily_accuracy_df,
        x='timestamp',
        y='accuracy',
        title="Accuracy Over Time",
        labels={'timestamp': 'Date', 'accuracy': 'Accuracy (%)'},
        markers=True
    )
    fig2.update_yaxes(range=[0, 100])
    fig2.update_layout(hovermode='x unified')
    st.plotly_chart(fig2, use_container_width=True)
    
    # Table 1: Areas for Review (Common Mistakes)
    st.subheader("Areas for Review")
    mistakes_data = student_data[student_data['is_correct'] == False][['timestamp', 'emotion_shown', 'answer_selected']]
    
    if len(mistakes_data) > 0:
        # Rename columns for better readability
        mistakes_display = mistakes_data.rename(columns={
            'timestamp': 'Date & Time',
            'emotion_shown': 'Correct Emotion',
            'answer_selected': 'Selected Emotion'
        }).reset_index(drop=True)
        
        st.dataframe(mistakes_display, use_container_width=True)
        st.info(f"Total mistakes: {len(mistakes_data)} out of {len(student_data)} attempts")
    else:
        st.success("No mistakes! This student is doing great! 🎉")