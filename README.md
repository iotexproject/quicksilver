# Quicksilver: Sentient AI Framework

[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/raullenchai/quicksilver)](https://github.com/raullenchai/quicksilver/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/raullenchai/quicksilver?style=social)](https://github.com/raullenchai/quicksilver/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/raullenchai/quicksilver?style=social)](https://github.com/raullenchai/quicksilver/network/members)

**Quicksilver** is an open-source framework that bridges the capabilities of **Large Language Models (LLMs)** with **Decentralized Physical Infrastructure Networks (DePINs)** to create **advanced AI agents**.

> By leveraging DePINs as the "_sensorial component_", Quicksilver enables AI agents to interact with the physical world, gather real-time data, and respond contextually.

<details>
  <summary>Read more</summary>
The QuickSilver framework empowers developers to build intelligent agents that:

- **Sense and Understand**: Use DePINs to collect and process data from decentralized physical infrastructure, acting as the sensory layer for AI agents.
- **Act and Respond**: Combine LLMs' advanced reasoning capabilities with data from DePINs to perform context-aware interactions.
- **Integrate Seamlessly**: Utilize the framework's modularity to connect with multiple DePIN projects, including weather, energy, and location networks, enabling agents to access diverse sources of decentralized data.
- **Orchestrate Workflows**: Automate multi-step processes while maintaining state and context.

</details>

---

![Preview](./assets/preview.gif)

## Features

- **Workflow Orchestration**: Executes complex, multi-step tasks orchestrating interaction between LLM, tools, and memory.
- **LLM Integration**: Suports popular LLMs like OpenAI, Gemini, etc... to understand and generate human-like text.
- **Contextual Memory**: Maintains state and context across conversations.
- **Built in Tools**: Built-in tools for computing, interacting with DePIN projects and other APIs (e.g., weather and energy data, news services, and more).
- **Modular Architecture**: Easily extendable with new tools and workflows.

---

## Architecture

Quicksilver's architecture is modular and extensible, enabling developers to customize it for various use cases.

```mermaid
graph TD
    A[Sentient AI - Core Orchestrator]
    B[Contextual Memory]
    C[Workflow Manager]
    D[Modular Tools]
    E[LLM Integration]
    F[Energy DePIN Data]
    G[News API]
    H[Weather DePIN Data]
    I[Custom Tool...]


    A <--> B
    A --> C
    C --> E
    C --> D
    D --> F
    D --> G
    D --> I
    D --> H
    E --> A
```

### Key Components

1. **Sentient AI (Core Orchestrator)**: Central hub managing interactions and delegating tasks.
2. **Contextual Memory**: Tracks user interactions and maintains context for continuity. This has been removed to make API calls more efficient.
3. **Workflow Manager**: Handles task automation and orchestration.
4. **Modular Tools**: Extensible modues for interacting with different DePINs.
5. **LLM Integration**: Interfaces with language models for intelligent responses.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22)
- [bun](https://bun.sh/)
- Docker (optional, for containerized environments)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/iotexproject/quicksilver.git
   cd quicksilver
   ```

2. Install dependencies:

   ```bash
   bun i
   ```

3. Create a `.env` file based on `.env.template`:

   ```env
    OPENAI_API_KEY=your_openai_api_key
    NUBILA_API_KEY=your_nubila_api_key
    NEWSAPI_API_KEY=your_newsapi_api_key
   ```

4. Run example agents:

Some example agents are located in the `example` folder. Run an example with:

```bash
bun run example/demo_agent.ts
```

5. Run the server:

   ```bash
   bun run start
   ```

6. Test API query:

   ```bash
    curl http://localhost:8000/ask -X POST -H "Content-Type: application/json" -d '{"q": "What is the weather in San Francisco?"}'
   ```

7. Access raw tool data:

   ```bash
   # Get raw weather data for San Francisco
   curl "http://localhost:8000/raw?tool=weather-current&lat=37.7749&lon=-122.4194"

   # Get raw news data
   curl "http://localhost:8000/raw?tool=news"

   # Get raw DePIN metrics
   curl "http://localhost:8000/raw?tool=depin-metrics&isLatest=true"
   ```

The `/raw` endpoint allows direct access to tool data without LLM processing. This is useful for:

- Debugging tool responses
- Building custom integrations
- Reducing API costs by skipping LLM processing
- Accessing structured data formats
- Context providing for agents

Available tools and their parameters:
| Tool | Parameters | Description |
|------|------------|-------------|
| `weather-current` | `lat`, `lon` | Current weather data |
| `weather-forecast` | `lat`, `lon` | Weather forecast |
| `news` | none | Latest news headlines |
| `depin-metrics` | `isLatest` | DePIN network metrics |
| `depin-projects` | none | DePIN project data |
| `l1data` | none | L1 blockchain statistics |
| `nuclear` | `start`, `end` | Nuclear outage data |

---

## What's next?

Quicksilver is just getting started, and there's immense potential for growth. We're inviting contributors to join us in building the future of AI agents and DePIN integration. Here are some areas where you can make a difference:

- **Integrate DePIN network**: Be part of Quicksilver’s core vision by researching and integrating a Decentralized Physical Infrastructure Network (DePIN). This is an opportunity to demonstrate how DePINs can act as the “sensorial” layer for AI agents.
- **Implement advanced memory types**: Help Quicksilver remember more effectively! Experiment with innovative memory systems like conversation buffers or vector databases to enhance context retention and agent intelligence.
- **Develop custom tools**: Bring your creativity to life by building tools for new functionalities, such as calendar access, task management, or data analysis. Your contributions can significantly expand the agent’s utility.
- **Enhance workflow logic**: Improve the agent’s decision-making capabilities to make better use of the tools and resources available. Collaborate to create smarter, more adaptable workflows.

Have an idea outside of this list? We'd love to hear it!

## Quicksilver works with Eliza

Quicksilver is serving the sentient AI queries as the DePIN-Plugin on [Eliza](https://github.com/elizaOS/eliza). You can simply enable the plugin and start using it. With Quicksilver, your Eliza agent will gain sentient-like capabilities to interact intelligently with the world. The current capabilities are listed above. If you like to add more capabilities, please refer to the [Contributing](#contributing) section.

## LLM Provider Configuration

Quicksilver supports multiple LLM providers and uses a dual-LLM architecture with a fast LLM for initial processing and a primary LLM for complex reasoning. Configure your providers in the `.env` file:

```env
# LLM Provider API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# LLM Model Selection
FAST_LLM_MODEL=gpt-4o-mini    # Model for fast processing
LLM_MODEL=deepseek-chat       # Model for primary reasoning
```

### Supported Providers

- **OpenAI**: Use OpenAI's models by setting the provider to `openai`
  - Default model: `gpt-4o-mini`
- **Anthropic**: Use Claude models by setting the provider to `anthropic`
  - Default model: `claude-3-5-haiku-latest`
- **DeepSeek**: Use DeepSeek's models by setting the provider to `deepseek`
  - Default model: `deepseek-chat`
  - Note: DeepSeek uses OpenAI-compatible API endpoints

You can configure both the fast LLM and primary LLM providers in the SentientAI initialization:

```typescript
new SentientAI({
  fastLLMProvider: "openai", // For quick processing
  llmProvider: "deepseek", // For main reasoning
});
```

## Managing Multiple Instances

Quicksilver supports running multiple instances with different tool configurations. This is useful when you want to:

- Run specialized instances for different use cases
- Isolate tool sets for different environments
- Manage resource usage by enabling only necessary tools
- Test different tool combinations

### Configuration Structure

```bash
configs/
└── instances/           # Your instance-specific configurations (gitignored)
    ├── weather.env      # Instance with only weather-related tools
    ├── news.env         # Instance with news and analytics tools
    └── full.env         # Instance with all tools enabled
```

### Creating a New Instance

1. Copy the template configuration:

   ```bash
   cp .env.template configs/instances/myinstance.env
   ```

2. Edit the configuration file:

   ```env
   # configs/instances/myinstance.env

   # Enable only required tools
   ENABLED_TOOLS=weather-current,weather-forecast,news

   # Configure instance-specific API keys
   NUBILA_API_KEY=your_key
   NEWSAPI_API_KEY=your_key

   # Other configuration...
   PORT=8001
   ```

### Running Instances

Using Docker Compose:

```bash
# Start a specific instance
CONFIG_PATH=configs/instances/weather.env docker compose up instance1

# Run multiple instances
CONFIG_PATH=configs/instances/weather.env docker compose up instance1 & \
CONFIG_PATH=configs/instances/news.env docker compose up instance2
```

Using environment files directly:

```bash
# Start with specific config
bun run start --env-file configs/instances/weather.env

# Or using environment variable
CONFIG_PATH=configs/instances/weather.env bun run start
```

### Example Configurations

1. Weather-focused Instance:

```env
# configs/instances/weather.env
ENABLED_TOOLS=weather-current,weather-forecast
NUBILA_API_KEY=your_key
PORT=8001
```

2. News and Analytics Instance:

```env
# configs/instances/news.env
ENABLED_TOOLS=news,depin-metrics,depin-projects
NEWSAPI_API_KEY=your_key
DEPIN_API_KEY=your_key
PORT=8002
```

3. IoT Data Instance:

```env
# configs/instances/iot.env
ENABLED_TOOLS=dimo,l1data
CLIENT_ID=your_client_id
REDIRECT_URI=your_uri
API_KEY=your_key
PORT=8003
```

### Docker Compose Example

```yaml
version: "3"

services:
  # Weather instance
  weather:
    image: qs:main
    env_file: ${CONFIG_PATH:-configs/instances/weather.env}
    ports:
      - "8001:8000"
    restart: always

  # News instance
  news:
    image: qs:main
    env_file: ${CONFIG_PATH:-configs/instances/news.env}
    ports:
      - "8002:8000"
    restart: always

  # IoT instance
  iot:
    image: qs:main
    env_file: ${CONFIG_PATH:-configs/instances/iot.env}
    ports:
      - "8003:8000"
    restart: always
```

### Available Tools

The following tools can be enabled in your configuration:

| Tool Name          | Description           | Required Environment Variables         |
| ------------------ | --------------------- | -------------------------------------- |
| `news`             | News API integration  | `NEWSAPI_API_KEY`                      |
| `weather-current`  | Current weather data  | `NUBILA_API_KEY`                       |
| `weather-forecast` | Weather forecasts     | `NUBILA_API_KEY`                       |
| `depin-metrics`    | DePIN network metrics | `DEPIN_API_KEY`                        |
| `depin-projects`   | DePIN project data    | `DEPIN_API_KEY`                        |
| `l1data`           | L1 blockchain data    | -                                      |
| `dimo`             | Vehicle IoT data      | `CLIENT_ID`, `REDIRECT_URI`, `API_KEY` |
| `nuclear`          | Nuclear outage data   | `EIA_API_KEY`                          |

### Best Practices

1. **Configuration Management**:

   - Keep sensitive data out of version control
   - Use descriptive names for config files
   - Document required environment variables

2. **Resource Optimization**:

   - Enable only necessary tools per instance
   - Monitor resource usage
   - Use appropriate container resources

3. **Deployment**:

   - Use different ports for different instances
   - Set up health checks
   - Implement proper logging

4. **Security**:
   - Don't commit API keys
   - Use separate API keys per instance
   - Implement rate limiting

## Contributing

We welcome contributions! To contribute:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Make your changes and test thoroughly.
4. Submit a pull request with a detailed description.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.
