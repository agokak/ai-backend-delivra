# AI Email Template Design Assistant Backend


## TL;DR

This Bun-based backend uses an LLM (OpenAI's `gpt-4o-mini` via Vercel AI SDK) to help users design HTML email templates. It takes conversation history and current email HTML, then returns chat responses and optionally updated HTML. The main goal is to power a new, dedicated UI for AI-assisted email template generation.

## Tech Stack & Rationale

*   **Bun**: Fast JS/TS runtime, bundler, package manager. Speeds up dev & execution.
*   **TypeScript**: Type safety, better DX.
*   **Hono**: Lightweight, fast web framework for Node.js/Bun. Good for performant APIs.
*   **Vercel AI SDK (`ai` package)**: Handles streaming and structured JSON (via `streamObject`) from OpenAI. Manages message history.
*   **Zod**: Schema declaration & validation for API requests (`chatRequestSchema`) and AI responses (`aiResponseSchema`). Ensures data integrity.

## How It Works

**Endpoint:** `POST /api/chat`

**Request (`chatRequestSchema`):**
```json
{
  "messages": [{"role": "user" | "assistant" | "system", "content": "string"}],
  "emailHtml": "string" // Optional: current template HTML
}
```

**Process:**
1.  Frontend POSTs to `/api/chat`.
2.  Hono + `zod-validator` validate request.
3.  System prompt + `emailHtml` + message history sent to `gpt-4o-mini` via AI SDK's `streamObject`.
4.  AI SDK streams a JSON object matching `aiResponseSchema`.

**Response (`aiResponseSchema`):**
```json
{
  "chatResponse": "string", // AI's conversational reply
  "updatedHtml": "string" // Optional: Full updated HTML if AI made changes
}
```

Basic error handling for AI calls is in place.

## Frontend Integration

*   **Current POC**: Integrated into the existing editor (`Assets/.../AIChatTab.tsx`) for basic chat and HTML updates.
*   **Target**: Power a new, standalone UI for AI template generation (previews, conversational refinement).
*   **CORS/CSP**: Backend (port 1807) has CORS. `SpaWithSessionInjection.cs` and `config-overrides.js` updated for CSP to allow `localhost:1807` connections during local dev.

## Setup & Run

Install:
```sh
bun install
```

Run dev server:
```sh
bun run dev
```
Service runs on `http://localhost:1807` (see `AI/src/index.ts`).

## Key Points for Demo

*   **`AI/src/index.ts` Walkthrough**:
    *   Hono setup, CORS.
    *   Zod schemas: `chatRequestSchema`, `aiResponseSchema`.
    *   `/api/chat` logic: receiving `emailHtml` & `messages`.
    *   System prompt construction.
    *   `streamObject` usage (AI SDK).
*   **Tech Choices Rationale**: Briefly cover *why* Bun, Hono, AI SDK, Zod (speed, type safety, AI integration ease).
*   **Frontend Interaction**:
    *   Show POC (`AIChatTab.tsx`).
    *   Explain purpose of new UI.
    *   Mention CORS/CSP for local dev communication between frontend and this AI service.
*   **Future**: Reiterate the new dedicated AI template UI.
