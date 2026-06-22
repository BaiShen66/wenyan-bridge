FROM node:20-alpine
RUN npm install -g @wenyan-md/mcp
WORKDIR /app
COPY package.json server.js ./
RUN npm install
EXPOSE 3333
CMD ["node","server.js"]