#!/usr/bin/env node
import { startServer } from "../src/server";

startServer().catch((error) => {
  console.error("Failed to start LastGate MCP server:", error);
  process.exit(1);
});
