FROM oven/bun:1.1.26
RUN apt update && apt install python3 python3-pip make g++ -y
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3000
ENTRYPOINT ["bun","run", "start"]
