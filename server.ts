/**
 * @file server.ts - Development Static File Server
 * @description Simple Bun-based static file server for local development.
 * Serves files from the project root directory with basic security measures.
 *
 * @module Server
 * @author FarmXP Team
 * @requires bun
 *
 * @example
 * // Start the server
 * bun run server.ts
 *
 * @example
 * // Start with custom port
 * PORT=8080 bun run server.ts
 */

import { serve } from "bun";

/**
 * Server port number
 * Uses PORT environment variable or defaults to 3000
 * @type {number}
 */
const port = Number(process.env.PORT) || 3000;

/**
 * Start the Bun HTTP server
 * Handles static file serving with directory access protection
 */
serve({
  port,

  /**
   * Request handler function
   * Serves static files from the project root directory
   *
   * @param {Request} req - The incoming HTTP request
   * @returns {Promise<Response>} HTTP response with file content or error
   *
   * @security Blocks directory listing by rejecting paths ending with '/'
   * @security TODO: Add path traversal protection (see Issue #1)
   */
  async fetch(req) {
    const url = new URL(req.url);

    // Map root path to index.html, otherwise use requested path
    let path = url.pathname === "/" ? "/index.html" : url.pathname;

    console.log(`📁 Servindo: ${path}`);

    // Security: Prevent directory listing by blocking trailing slashes
    if (path.endsWith('/')) {
      return new Response("Directory access not allowed", { status: 403 });
    }

    try {
      // Attempt to read the requested file from project root
      const file = Bun.file(`.${path}`);

      if (await file.exists()) {
        // File exists, return it with auto-detected content type
        return new Response(file);
      } else {
        // File not found
        console.log(`❌ Arquivo não encontrado: ${path}`);
        return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      // Server error occurred
      console.error(`💥 Erro 500 em: ${path}`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

// Log server startup message
console.log(`🚀 Servidor rodando em http://localhost:${port}/`);