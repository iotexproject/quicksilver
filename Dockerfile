FROM oven/bun:1.1.26
RUN apt update && apt install python3 python3-pip make g++ -y
WORKDIR /app
COPY package.json package.json
RUN bun install
COPY . .
EXPOSE 3000
ENTRYPOINT ["bun","run", "start"]
