# api

Core NestJS API. This pass scaffolds just enough to close the MVP's AI-reply
loop; auth, tenant management, module registry, and billing are not built
yet.

## What's here

- `src/health/health.controller.ts` — `GET /health`.
- `src/agent/incoming-message.processor.ts` — drains the shared
  `whatsapp-incoming` BullMQ queue (see `@intelligencebiz/queue`) that
  `apps/whatsapp-worker` publishes customer messages to, calls
  `@intelligencebiz/ai-engine` to generate a reply, and enqueues it onto
  the tenant's `whatsapp-outgoing` queue for the worker to send. Skips
  tenants with no active `agent_configs` row and conversations currently
  in `human_takeover` status.

## Running

Copy `.env.example` to `.env`, fill in Supabase + Redis + at least one LLM
provider key, then:

```bash
pnpm --filter @intelligencebiz/api build
pnpm --filter @intelligencebiz/api start
```

## Not yet built

Auth, tenant CRUD, module registry, billing/subscriptions — these are the
rest of `apps/api`'s scope per the architecture doc and come in a later pass.
