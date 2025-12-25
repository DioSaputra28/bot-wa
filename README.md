# bot-wa

WhatsApp bot built with Baileys library.

## Setup

```bash
npm install
npm start
```

## Project Structure

```
bot-wa/
├── index.js           # Main entry point
├── package.json
├── connect/           # Connection & message handlers
│   └── handler.js
├── cmd/              # Command handlers
│   └── ping.js
├── system/           # Utilities & config
├── storage/          # Auth files (auto-generated)
│   └── auth/
└── .env.example
```

## Commands

- `!help` - Show available commands
- `!ping` - Check bot connection
- `!time` - Show current time
- `!about` - Bot information

## Requirements

- Node.js 17+
