# Setup Guide

This guide covers how to install and run FarmXP Browser locally.

## Prerequisites

### Bun Runtime

FarmXP Browser uses [Bun](https://bun.sh/) as its JavaScript runtime and development server. Bun v1.2.21 or higher is required.

**Install Bun:**

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify installation:**

```bash
bun --version
# Should output 1.2.21 or higher
```

## Installation

1. **Clone or download the repository**

2. **Install dependencies:**
   ```bash
   cd FarmXP_Browser
   bun install
   ```

## Running the Game

### Development Server

Start the development server:

```bash
bun run server.ts
```

The server will start on `http://localhost:3000/` by default.

**Custom port:**

```bash
PORT=8080 bun run server.ts
```

### Server Features

The development server (`server.ts`) provides:
- Static file serving for HTML, CSS, JS, and assets
- Directory traversal protection (returns 403 for directory requests)
- Console logging of served files
- Automatic MIME type detection

## Project Files

| File | Purpose |
|------|---------|
| `server.ts` | Bun development server |
| `index.html` | Main game HTML |
| `style/` | CSS stylesheets (modular) |
| `scripts/` | JavaScript modules |
| `assets/` | Sprites, portraits, images |

## Troubleshooting

### Port Already in Use

If port 3000 is occupied:

```bash
PORT=3001 bun run server.ts
```

### Assets Not Loading

Ensure you're accessing through the server (`localhost:3000`) rather than opening `index.html` directly. ES modules require HTTP serving.

### Mobile Testing

For mobile device testing on your local network:

1. Find your local IP: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)
2. Start server: `bun run server.ts`
3. Access from mobile: `http://YOUR_LOCAL_IP:3000`

## Production Deployment

For production, the game can be served by any static file server. The `server.ts` is for development convenience only.

**Example with nginx:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/FarmXP_Browser;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
