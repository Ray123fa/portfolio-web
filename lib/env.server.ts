/**
 * Server-side environment variable validation
 * Ensures required env vars are set before app initialization
 */

export function getApiConfig() {
  const apiEnv = process.env.NEXT_PUBLIC_ENV || "prod";
  
  let apiBaseUrl: string;
  if (apiEnv === "local") {
    apiBaseUrl = process.env.API_BASE_URL_LOCAL || "";
  } else {
    apiBaseUrl = process.env.API_BASE_URL_PROD || "";
  }

  const apiToken = process.env.API_TOKEN || "";

  if (!apiBaseUrl) {
    throw new Error(
      `Missing API_BASE_URL_${apiEnv === "local" ? "LOCAL" : "PROD"} environment variable`
    );
  }

  if (!apiToken) {
    throw new Error("Missing API_TOKEN environment variable");
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), // Remove trailing slash
    apiToken,
    environment: apiEnv as "local" | "prod",
  };
}

/**
 * Validate env on module load (server-only)
 * This will fail early if critical env vars are missing
 */
export function validateServerEnv() {
  try {
    getApiConfig();
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    throw error;
  }
}
