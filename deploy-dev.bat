docker build -t registry.digitalocean.com/nesthub/universalis_bot_development:latest .
docker push registry.digitalocean.com/nesthub/universalis_bot_development
kubectl apply -f .\development\example-redis-config.yaml -n development
kubectl apply -f .\development\redis-deployment.yaml -n development
kubectl apply -f .\development\bot-deployment.yaml -n development
kubectl rollout restart StatefulSet/universalis-bot -n development