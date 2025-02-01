# Universalis Discord Bot

A Discord bot deployment using Docker and Kubernetes.

## Project Overview

This project is a Discord bot implementation that utilizes Docker for containerization and Kubernetes for orchestration. The bot is designed to be scalable and maintainable with a distributed architecture.

## Prerequisites

- Docker
- Kubernetes
- DigitalOcean Registry access
- Discord Bot Token
- ChatGPT API Token

## Configuration

The bot requires several configuration parameters which are stored securely:

- Discord Bot Token
- ChatGPT API Token

These sensitive values are managed through Kubernetes secrets and should not be committed to version control.

The following parameters are not sensitive and can be stored in version control:

- Client ID
- Guild ID

### Kubernetes secrets

```bash
kubectl create secret generic bot-secrets --from-literal=bot-token='token' --from-literal=chatgpt-token='token'
```

### Config.json

Used during docker build, this file also needs to be filled out. I would like this to be removed eventually honestly.

## Deployment

### Building and Pushing Docker Image

```bash
docker build -t registry.digitalocean.com/nesthub/universalis_bot_production:latest .
docker push registry.digitalocean.com/nesthub/universalis_bot_production
```

### Kubernetes Deployment

1. Apply Redis configuration:
```bash
kubectl apply -f ./kubernetes/example-redis-config.yaml
kubectl apply -f ./kubernetes/redis-deployment.yaml
```

2. Deploy the bot:
```bash
kubectl apply -f ./kubernetes/bot-deployment.yaml
```

3. Restart the deployment if needed:
```bash
kubectl rollout restart StatefulSet/universalis-bot
```

## Architecture

- Uses StatefulSet with 5 replicas for high availability
- Implements rolling updates for zero-downtime deployments
- Includes Pod Disruption Budget for maintaining minimum availability
- Integrates with Redis for data persistence

## Local Development with Docker Desktop

### Prerequisites
- Docker Desktop installed
- Kubernetes enabled in Docker Desktop settings

### Local Registry Setup

1. Create a local registry:
```bash
docker run -d -p 5000:5000 --name registry registry:2
```

2. Switch Kubernetes context to Docker Desktop:
```bash
kubectl config use-context docker-desktop
```

### Local Deployment Steps

1. For development, reduce replicas to 1 in kubernetes/bot-deployment.yaml:
```yaml
OLD: replicas: 5
NEW: replicas: 1
```

Also update index.js to use shardCount of 1

```js
OLD: const client = new Client({shards: shardId, shardCount: 5,  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });
NEW: const client = new Client({shards: shardId, shardCount: 1,  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });
```

2. Build and push to local registry:
```bash
docker build -t localhost:5000/universalis-bot:local .
docker push localhost:5000/universalis-bot:local
```

3. Create required secrets:
```bash
kubectl create secret generic bot-secrets --from-literal=bot-token='token' --from-literal=chatgpt-token='token'
```

4. Update image in deployment files to use local registry:
```bash
# Edit kubernetes/bot-deployment.yaml
# Change image to: localhost:5000/universalis-bot:local
```

5. Apply Kubernetes configurations:
```bash
kubectl apply -f ./kubernetes/
```

6. Monitor pods:
```bash
kubectl get pods -w
```

## Security Notes

- All sensitive information is stored in Kubernetes secrets (and one config.json file that needs to be gotten rid of)
- Environment variables are used for configuration
- Tokens and API keys should never be committed to version control

## Contributing

Please ensure all sensitive information is properly secured before submitting any contributions.
