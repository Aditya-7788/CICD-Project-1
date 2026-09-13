FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

VOLUME ["/app/data"]

EXPOSE 5000

CMD ["npm", "start"]
