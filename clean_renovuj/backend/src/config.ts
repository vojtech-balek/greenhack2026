import process from "node:process";
import crypto from "node:crypto";

export interface ServerConfig {
  nodeEnv: string;
  databaseUrl?: string;
  jwtSecret: string;
}

/**
 * Retrieves server-side configurations.
 * Enforces secure fallback strategies for environment secrets to avoid hardcoded credentials.
 */
export function getServerConfig(): ServerConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const databaseUrl = process.env.DATABASE_URL;

  // Multi-tiered fallback strategy for JWT_SECRET:
  // 1. Read from Environment
  // 2. In Production: Error out if missing
  // 3. In Dev/Test: Generate secure ephemeral key and log warning
  let jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    if (nodeEnv === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is required in production mode.");
    } else {
      console.warn("WARNING: JWT_SECRET was not provided. Generating an ephemeral secret key for this session.");
      // Generate a secure instance-isolated fallback key
      jwtSecret = crypto.randomBytes(32).toString("hex");
    }
  }

  return {
    nodeEnv,
    databaseUrl,
    jwtSecret,
  };
}
