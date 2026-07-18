# @intelligencebiz/channel-core

Provider-agnostic `Channel` interface shared by every messaging adapter
(Baileys today, Meta Cloud API later). The core API, `ai-engine`, and
`whatsapp-worker` depend only on this interface — never on a specific
provider's SDK — so swapping providers means writing a new adapter that
implements `Channel`, not touching the core or the AI engine.

## Exports

- `Channel` — the interface adapters implement: `sendMessage`,
  `onMessageReceived`, `getConnectionStatus`, `reconnect`,
  `onConnectionStatusChange`.
- `ChannelFactory` — how an adapter is constructed for a given tenant/config.
- Supporting types: `ChannelType`, `ConnectionStatus`, `InboundMessage`,
  `OutboundMessage`, `MessageContent`, `QrCode`, etc.

Adapters (e.g. `whatsapp-worker`'s Baileys implementation) live outside
this package and import from it.
