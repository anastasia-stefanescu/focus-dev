FROM node:22

WORKDIR /services/Backend\ server

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the backend code
COPY . .

EXPOSE 3002

# Start the server
CMD ["npm", "start"]