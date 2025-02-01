docker build -t registry.digitalocean.com/nesthub/universalis_bot_production:latest .
docker push registry.digitalocean.com/nesthub/universalis_bot_production
kubectl apply -f .\kubernetes\example-redis-config.yaml
kubectl apply -f .\kubernetes\redis-deployment.yaml
kubectl apply -f .\kubernetes\bot-deployment.yaml
kubectl rollout restart StatefulSet/universalis-bot