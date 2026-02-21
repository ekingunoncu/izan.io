# Providers

## 17+ Supported Providers

izan.io integrates with a wide range of LLM providers, giving you the flexibility to choose models based on cost, speed, capability, or privacy preferences. You can switch providers and models at any time without losing your conversation history.

## Available Providers

- **OpenAI** -- GPT-4o, GPT-4.1, o1, o3, o4-mini, and more
- **Anthropic** -- Claude Opus, Sonnet, Haiku
- **Google** -- Gemini 2.5 Pro, Flash, and Google AI Studio models
- **Groq** -- fast inference for Llama, Mixtral, and other open models
- **Cerebras** -- high-throughput inference with generous free tier
- **Cohere** -- Command R and Command R+ models
- **Together AI** -- a broad catalog of open-source models
- **DeepSeek** -- DeepSeek-V3, DeepSeek-R1, and other models
- **Mistral** -- Mistral Large, Medium, and open-weight models
- **xAI** -- Grok models
- **Fireworks** -- fast open-model inference
- **Ollama** -- run models locally on your own hardware, fully offline
- And more providers are regularly added

## Free Tier Options

Several providers let you get started at no cost:

- **Google AI Studio** -- 250 requests per day at no charge
- **Groq** -- free access to fast inference on popular open models
- **Cerebras** -- 1 million tokens per day for free
- **Ollama** -- completely free, runs models locally (requires local installation)

## Setting Up a Provider

1. Go to **Settings** from the sidebar
2. Find your preferred provider in the list
3. Enter your **API key** (obtained from the provider's dashboard)
4. Select a **model** from the dropdown
5. Start chatting -- the selected model is used for all new messages

## Model Capabilities

Not all models support the same features. izan.io tracks three key capability flags:

- **Tools** -- the model can call MCP tools and macros during a conversation
- **Vision** -- the model can process and understand images
- **Reasoning** -- the model supports extended chain-of-thought reasoning

Capability indicators are shown next to each model in the selection dropdown. You can use **any model with any agent**, but agents that rely on tools will work best with tool-capable models.

## Fallback Model

You can configure a **fallback model** that automatically takes over when the primary provider fails with a retryable error (rate limit, server error, or network issue).

### Setting Up

1. Go to **Settings**
2. Find the **Fallback Model** card (below the provider keys)
3. Select a **fallback provider** from the dropdown (only providers with saved API keys are shown)
4. Select a **fallback model** from that provider

### How It Works

- When the primary model returns a **429** (rate limit), **500+** (server error), or a **network error**, izan.io automatically retries the request with the fallback model
- A notice is shown in the chat indicating the switch: "Primary model failed. Retrying with Provider / Model..."
- **Auth errors** (401, 403) do **not** trigger fallback -- these indicate a key problem, not a transient issue
- If the fallback model also fails, the error is shown as usual (no further retries)
- If the fallback provider and model are the same as the primary, fallback is disabled (no point retrying the same endpoint)

### Tips

- Choose a fallback from a **different provider** for maximum resilience (e.g., primary on OpenAI, fallback on Anthropic)
- Free-tier providers like **Groq** or **Cerebras** make great fallbacks since they don't cost anything
- The fallback model doesn't need to support tools -- if it doesn't, the conversation continues as plain chat
