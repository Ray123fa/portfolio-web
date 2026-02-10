/**
 * Server-side API proxy for projects
 * Token + upstream API details stay on server, never exposed to client
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchProjects } from "@/lib/api/portfolio";
import { ApiError } from "@/lib/api/types";

export const dynamic = "force-dynamic"; // Don't cache, always fetch fresh

export async function GET(request: NextRequest) {
  try {
    // Validate environment on request
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be >= 1" },
        { status: 400 }
      );
    }

    const data = await fetchProjects(page);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Projects API error:", error);

    // Normalize error response (never expose internal details)
    const apiError = error as ApiError | Error;
    const message =
      "message" in apiError ? apiError.message : "Failed to fetch projects";

    // Determine status code
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes("Network")) statusCode = 503;
      if (error.message.includes("timeout")) statusCode = 504;
    }

    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}
