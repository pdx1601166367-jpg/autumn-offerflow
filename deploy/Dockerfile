FROM node:24-alpine

WORKDIR /app

COPY package.json* ./
COPY server ./server
COPY js ./js
COPY css ./css
COPY index.html manifest.webmanifest sw.js icon.svg ./

ENV PORT=8125
ENV NODE_ENV=production

VOLUME ["/app/server/data"]

EXPOSE 8125

CMD ["node", "server/server.js"]
