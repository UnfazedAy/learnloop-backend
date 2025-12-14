#!/bin/bash
set -e

echo "🔹 Building fresh Docker image..."
docker build --no-cache -t learnloop-backend .

echo "🔹 Tagging image..."
docker tag learnloop-backend gcr.io/learnloop-be/learnloop-backend:latest

echo "🔹 Pushing to GCR..."
docker push gcr.io/learnloop-be/learnloop-backend:latest

echo "🔹 Deploying to Cloud Run..."
gcloud run deploy learnloop-backend \
  --image gcr.io/learnloop-be/learnloop-backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file env.yaml

echo "✅ Deployment complete!"
