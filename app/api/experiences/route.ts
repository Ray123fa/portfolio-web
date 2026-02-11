/**
 * Server-side API proxy for experiences
 * Token + upstream API details stay on server, never exposed to client
 */

import { NextResponse } from "next/server";
import { fetchExperiences } from "@/lib/api/portfolio";
import { ApiError } from "@/lib/api/types";

export const revalidate = 300;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

export async function GET() {
  try {
    const data = await fetchExperiences();
    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Experiences API error:", error);

    // Normalize error response (never expose internal details)
    const apiError = error as ApiError | Error;
    const message =
      "message" in apiError ? apiError.message : "Failed to fetch experiences";

    // Determine status code
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes("Network")) statusCode = 503;
      if (error.message.includes("timeout")) statusCode = 504;
    }

    return NextResponse.json(
      { error: message },
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
