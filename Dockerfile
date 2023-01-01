FROM node:18-alpine

WORKDIR /backend

COPY . .

RUN npm install
RUN npm run build

CMD ["npm", "run", "start", "--", "--port", "8002"]

EXPOSE 8002
