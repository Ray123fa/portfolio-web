/**
 * Centralized client fetch utility with error handling
 * Used by server-side API routes to talk to upstream API
 */

import { ApiError } from "./types";

const DEFAULT_TIMEOUT = 10000; // 10 seconds

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Type-safe fetch with automatic JSON parsing and error handling
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `API request failed: ${response.statusText}`,
        statusCode: response.status,
      };

      // Try to parse error response body
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          error.message = errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors in error response
      }

      throw error;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      // Network error
      throw {
        message: "Network error: unable to reach API",
        code: "NETWORK_ERROR",
      } as ApiError;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw {
        message: `Request timeout after ${timeout}ms`,
        code: "TIMEOUT",
      } as ApiError;
    }

    // Re-throw if already ApiError
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }

    // Generic error fallback
    throw {
      message: error instanceof Error ? error.message : "Unknown error",
      code: "UNKNOWN_ERROR",
    } as ApiError;
  } finally {
    clearTimeout(timeoutId);
  }
}
