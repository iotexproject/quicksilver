FROM oven/bun:1.1.26
WORKDIR /app
COPY package.json package.json
RUN bun install
COPY . .
EXPOSE 3000
ENTRYPOINT ["bun","run", "start"]