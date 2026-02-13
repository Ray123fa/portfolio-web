/**
 * Server-side API proxy for projects
 * Token + upstream API details stay on server, never exposed to client
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchProjects } from "@/lib/api/portfolio";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const revalidate = 300;

const MAX_PAGE = 100;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(`projects:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (isNaN(page) || page < 1 || page > MAX_PAGE) {
      return NextResponse.json(
        { error: `Page must be between 1 and ${MAX_PAGE}` },
        { status: 400 }
      );
    }

    const data = await fetchProjects(page);

    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Projects API error:", error);

    // Determine status code without leaking internal details
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes("Network")) statusCode = 503;
      if (error.message.includes("timeout")) statusCode = 504;
    }

    // Generic error messages only - never forward upstream details
    const clientMessages: Record<number, string> = {
      503: "Service temporarily unavailable. Please try again later.",
      504: "Request timed out. Please try again later.",
      500: "An unexpected error occurred. Please try again later.",
    };

    return NextResponse.json(
      { error: clientMessages[statusCode] || clientMessages[500] },
      { status: statusCode, headers: CACHE_HEADERS }
    );
  }
}
