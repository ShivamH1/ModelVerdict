# ModelVerdict

> **Swiss Modern Evaluation Standards for Large Language Models**

ModelVerdict is an advanced LLM benchmarking battleground and automated evaluation suite. It compares models across factual correctness (hallucination index), content safety, and output bias through user votes and automated, advisor-graded batch test runs.

---

## 🚀 Key Features

### 1. Chat Arena (Comparative Battles)

- **Blind Mode Matches**: Input prompts to two anonymous models simultaneously.
- **Real-time Output Streaming**: Parallel streaming of outputs.
- **Dynamic Elo Rating Feedback**: Grade matches via user voting (A is better, B is better, Tie, or Both bad). Voting dynamically updates and shows immediate rating changes (e.g. `+16 Elo` / `-15 Elo`) on the reveal card.

### 2. Model Leaderboard

- **Sequential Elo Calculations**: Dynamic standings page generated chronologically from database vote records.
- **Match Statistics**: Displays total matches, Wins / Losses / Ties, and win rate percentages for each model in the catalog.
- **Trophy Highlights**: Highlights the current #1 model in a custom status card.

### 3. Benchmark Studio

- **Automated Evaluation runs**: Run batch tests of variable sizes (5 to 35 prompts) evaluated on-demand by Gemini-as-a-Judge.
- **Executive Scorecards**: Comprehensive report summaries covering hallucination rates, safety refusal indices, average inference latencies, and token cost projections.
- **Impartial Judge Ledger**: A prompt-by-prompt ledger displaying model outputs, scores, and natural language reasoning comments.

### 4. Observability Guardrail Logs

- **Deterministic Safety Filters**: Logs pre-LLM input blocks and post-LLM output filters.
- **Cost Auditing**: Logs latency, token usage, and estimated dollar costs (filtering out incomplete or zero-token logs).

---

## 🛠️ Tech Stack & Architecture

ModelVerdict is organized as a high-performance monorepo using **Turborepo** and **Bun**:

### Applications

- **`apps/web`**: Next.js single-page application built with React, Lucide Icons, and Vanilla CSS.
- **`apps/api`**: Express.js server utilizing Node HTTP, WebSockets (`ws`), and Prisma ORM connected to PostgreSQL.

### Shared Packages

- **`packages/llm-client`**: Client interface for communicating with OpenRouter, HuggingFace, and Google Gemini API endpoints.
- **`packages/evaluator`**: Grading rules, rubrics, and automated judge prompting logic.
- **`packages/shared`**: Shared TypeScript interfaces, model catalogs (`MODEL_CATALOG`), and types.

---

## 📦 Getting Started

### 1. Prerequisites

Make sure you have [Bun](https://bun.sh/) and [PostgreSQL](https://www.postgresql.org/) installed locally.

### 2. Environment Variables

Create a `.env` file at the root of the workspace (and configure local `.env` details in `apps/web` and `apps/api` where needed).

```ini
DATABASE_URL="postgresql://user:password@localhost:5432/modelverdict"
OPENROUTER_API_KEY="your-openrouter-key"
```

### 3. Installation & Database Generation

Install monorepo dependencies and generate the Prisma Client for the database:

```bash
# Install packages
bun install

# Generate database schemas
cd apps/api
bun prisma generate
```

### 4. Running the Application

Launch both the backend and frontend dev servers concurrently from the root directory:

```bash
bun run dev
```

- **Frontend Client**: [http://localhost:3000](http://localhost:3000)
- **Backend Express API**: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Development Commands

- **Lint Codebase**: `bun run lint` (runs Turbo-cached ESLint)
- **Format Files**: `bun run format` (runs Prettier)
- **Type Checking**: `bun run check-types`
- **Production Build**: `bun run build`

---

## 📸 Application Screenshots

### Chat Arena — Welcome Screen

The Arena welcome screen greets users with a clean prompt field and example evaluation categories.

![Chat Arena Welcome](apps/web/public/screenshots/01-arena-welcome.png)

### Model Leaderboard

Dynamic Elo standings calculated from crowd-sourced vote records, showing wins, losses, ties, and win rate per model.

![Model Leaderboard](apps/web/public/screenshots/03-leaderboard.png)

### Benchmark Studio

Configure automated evaluation runs — pick model pairs, set dataset size, and launch a Gemini-graded benchmark study.

![Benchmark Studio](apps/web/public/screenshots/04-benchmark.png)

### Guardrail Logs

Observability dashboard showing deterministic safety filter events, token costs, latency, and real-time guardrail activity.

![Guardrail Logs](apps/web/public/screenshots/05-logs.png)
