FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/build ./build

EXPOSE 3000

ENV REACT_APP_API_URL=http://localhost:5002

CMD ["serve", "-s", "build", "-l", "3000"]
