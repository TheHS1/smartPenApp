from transformers import pipeline
import logging

distilled_student_sentiment_classifier = None

# load the ocr model as soon as the module is loaded
try:
    distilled_student_sentiment_classifier = pipeline(
        model="lxyuan/distilbert-base-multilingual-cased-sentiments-student", 
        return_all_scores=True
    )
except Exception as e:
    logging.error(f"Error loading sentiment model: {e}")

def sentiment(data):
    if distilled_student_sentiment_classifier is None:
        logging.exception("Model not loaded before sentiment analysis")
        return;

    return distilled_student_sentiment_classifier(data)
