import { config as loadEnv } from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
loadEnv({ path: envPath });

/**
 * Server Configuration
 */
export const server = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "localhost",
  environment: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * CORS Configuration
 */
export const cors = {
  origins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : undefined,
};



/**
 * Project Configuration
 */
function resolveProjectRoot(): string {
  return process.env.BRAKIT_PROJECT_PATH || process.cwd();
}

export const project = {
  root: resolveProjectRoot(),
};

/**
 * Frontend/Overlay Configuration
 */
export const frontend = {
  backendUrl:
    process.env.BRAKIT_BACKEND_URL || `http://${server.host}:${server.port}`,
};

/**
 * Validation - Check required configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Warn about production CORS
  if (server.isProduction && !cors.origins) {
    errors.push(
      "CORS_ORIGINS must be explicitly set in production for security"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log current configuration (safe - no secrets)
 */
export function logConfig(): void {
  console.log("📋 Brakit Configuration:");
  console.log(`  Server: http://${server.host}:${server.port}`);
  console.log(`  Environment: ${server.environment}`);

  console.log(`  Project Root: ${project.root}`);

  if (cors.origins === undefined && server.isDevelopment) {
    console.log(`  CORS: Development mode - allowing all localhost ports`);
  } else if (cors.origins && cors.origins.length > 0) {
    console.log(`  CORS Origins: ${cors.origins.join(", ")}`);
  } else {
    console.warn(
      "  ⚠️  WARNING: No CORS origins configured. Set CORS_ORIGINS in production!"
    );
  }
}

// Export everything as default for convenience
export default {
  server,
  cors,

  project,
  frontend,
  validateConfig,
  logConfig,
};
