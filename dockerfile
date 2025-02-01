FROM node:20 as BUILD_IMAGE
ENV NODE_ENV=production

# Create the directory!
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy and Install our bot
COPY package.json /usr/src/bot
RUN npm install --omit=dev
RUN wget https://gobinaries.com/tj/node-prune --output-document - | /bin/sh && node-prune

# Our precious bot
COPY . /usr/src/bot

ENV NODE_ENV=production
RUN node ./deploy-commands.js
RUN node ./deploy-commands-global.js

FROM node:current-buster

WORKDIR /usr/src/bot

COPY --from=BUILD_IMAGE /usr/src/bot ./

# Start me!
CMD ["node", "index.js"]