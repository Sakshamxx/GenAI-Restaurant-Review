🍽️ GenAI Restaurant Review

An AI-powered restaurant review intelligence platform that transforms customer feedback into actionable insights using Natural Language Processing (NLP), Machine Learning (ML), and Generative AI.

📌 Overview

GenAI Restaurant Review is designed to help restaurants understand customer experiences beyond star ratings. The platform analyzes reviews, identifies complaint categories, detects emotions, performs sentiment analysis, generates summaries, and provides business intelligence through AI-driven analytics.

The project combines:

* Natural Language Processing (NLP)
* Machine Learning (ML)
* Deep Learning (DL)
* Generative AI (GenAI)
* Data Analytics

to extract meaningful insights from restaurant reviews collected from platforms such as Yelp, Google Reviews, and other public review sources.

⸻

🎯 Problem Statement

Restaurant owners receive thousands of reviews but often struggle to identify:

* Why customers are dissatisfied
* Common complaints
* Service quality issues
* Food quality concerns
* Emerging trends in customer feedback

GenAI Restaurant Review automates this process and converts unstructured review text into structured business insights.

⸻

🚀 Features

1. Sentiment Analysis

Classifies reviews into:

* Positive
* Neutral
* Negative

Example:

"The food was amazing and the staff was friendly."

Output:

{
  "sentiment": "Positive",
  "confidence": 0.96
}

⸻

2. Emotion Detection

Identifies customer emotions such as:

* Happy
* Satisfied
* Excited
* Angry
* Frustrated
* Disappointed

Example:

"The waiting time was ridiculous."

Output:

{
  "emotion": "Frustrated"
}

⸻

3. Complaint Classification

Automatically categorizes customer complaints into:

* Food Quality
* Service Delay
* Staff Behaviour
* Pricing
* Cleanliness
* Wrong Order
* Ambience
* No Complaint

Example:

"The waiter ignored us for 30 minutes."

Output:

{
  "complaint_category": "Service Delay"
}

⸻

4. Aspect-Based Sentiment Analysis (ABSA)

Analyzes sentiment for specific aspects of a restaurant.

Aspects:

* Food
* Service
* Ambience
* Pricing
* Cleanliness
* Waiting Time

Example:

"The food was excellent but the service was very slow."

Output:

{
  "food": "Positive",
  "service": "Negative"
}

⸻

5. AI Review Generation

Customers can provide ratings through a QR-based interface and generate natural language reviews using Generative AI.

Input:

{
  "food": 5,
  "service": 3,
  "ambience": 4
}

Generated Review:

The food was excellent and the ambience was pleasant. While the service could be improved, the overall experience was enjoyable.

⸻

6. Review Summarization

Summarizes hundreds of reviews into concise business insights.

Example:

Customers consistently appreciate the food quality and ambience. However, service delays and waiting times are recurring concerns.

⸻

7. Analytics Dashboard

Provides restaurant owners with:

* Sentiment Trends
* Emotion Distribution
* Complaint Breakdown
* Rating Analysis
* Review Volume Trends
* Customer Feedback Insights

⸻

🏗️ System Architecture

Data Collection
      ↓
Data Cleaning
      ↓
NLP Processing
      ↓
Sentiment Analysis
      ↓
Emotion Detection
      ↓
Complaint Classification
      ↓
Aspect-Based Sentiment Analysis
      ↓
Review Summarization
      ↓
Analytics Dashboard

⸻

🧠 Machine Learning Pipeline

Complaint Classification

Review Text
      ↓
Text Preprocessing
      ↓
TF-IDF Vectorization
      ↓
XGBoost Classifier
      ↓
Complaint Category

Models Used

Task	Model
Sentiment Analysis	RoBERTa
Emotion Detection	DistilRoBERTa
Complaint Classification	TF-IDF + XGBoost
Topic Modeling	BERTopic
Embeddings	Sentence-BERT
Review Generation	Gemini / LLM
Summarization	Gemini / LLM

⸻

🛠️ Tech Stack

Frontend

* Vite
* React
* Tailwind CSS
* ShadCN UI

Backend

* FastAPI
* Supabase

Database

* PostgreSQL (Supabase)

Machine Learning

* Scikit-Learn
* XGBoost
* Transformers
* Sentence Transformers

NLP

* NLTK
* spaCy
* Hugging Face Transformers

Deployment

* Vercel
* Supabase
* Docker

## Local Environment Setup

Copy `.env.example` to `.env` and `frontend.env.example` to `frontend.env` before running the app. Do not commit these files.

Backend `.env` must contain:
- `FRONTEND_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `Gemini_API_Key`
- `Email_API_Key`

Frontend `frontend.env` must contain:
- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_BACKEND_URL`

⸻

📂 Project Structure

GenAI-Restaurant-Review/
│
├── data/
│   ├── raw/
│   ├── processed/
│
├── notebooks/
│
├── models/
│   ├── sentiment/
│   ├── complaint_classifier/
│   ├── emotion_detection/
│
├── backend/
│   ├── api/
│   ├── services/
│
├── frontend/
│
├── dashboard/
│
├── docs/
│
├── requirements.txt
│
└── README.md

⸻

📊 Dataset

Primary Sources:

* Yelp Open Dataset
* Google Reviews
* Public Restaurant Review Datasets

Required Fields:

restaurant_name
review_text
rating
date
location
platform

⸻

🔮 Future Enhancements

* Multilingual Review Analysis
* Voice-to-Review Generation
* Real-Time Customer Feedback Monitoring
* Recommendation Engine
* Review Authenticity Detection
* Complaint Severity Prediction
* Restaurant Benchmarking System

⸻

👨‍💻 Team Vision

GenAI Restaurant Review aims to bridge the gap between customer feedback and restaurant decision-making by leveraging the power of Artificial Intelligence, Natural Language Processing, and Generative AI to transform reviews into actionable business intelligence.

⸻

⭐ Project Status

Current Phase: Research & Development (R&D)

* Project Planning
* Data Collection
* Data Cleaning
* Sentiment Analysis
* Complaint Classification
* Emotion Detection
* Review Generation
* Dashboard Development
* Deployment

⸻

Built with AI, NLP, ML, and GenAI to revolutionize restaurant feedback analysis. 🚀🍽️
