/**
 * Portfolio API service layer
 * Single source of truth for portfolio data fetching and transformation
 */

import { fetchJson } from "./client";
import {
  PortfolioProjectsResponse,
  PortfolioExperiencesResponse,
  Project,
  PaginatedProjects,
  Experience,
} from "./types";
import { getApiConfig } from "@/lib/env.server";

/**
 * Transform upstream project data to UI domain model
 */
function transformProject(data: any): Project {
  return {
    title: data.title,
    description: data.description,
    tags: Array.isArray(data.tags) ? data.tags : data.tags.split(",").map((t: string) => t.trim()),
    imageUrl: `/${data.image}`,
    webUrl: data.url,
  };
}

/**
 * Fetch paginated projects from upstream API
 */
export async function fetchProjects(
  page: number = 1
): Promise<PaginatedProjects> {
  const { apiBaseUrl, apiToken } = getApiConfig();

  const response = await fetchJson<PortfolioProjectsResponse>(
    `${apiBaseUrl}/api/v1/portos?page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.success || !response.data?.data) {
    throw new Error("Invalid projects response format");
  }

  return {
    projects: response.data.data.map(transformProject),
    currentPage: response.data.current_page,
    lastPage: response.data.last_page,
    perPage: response.data.per_page,
    total: response.data.total,
  };
}

/**
 * Transform upstream experience data to UI domain model
 */
function transformExperience(data: any): Experience {
  const formatDate = (date: string | null): string => {
    if (!date) return "Present";
    const options = { month: "short", year: "numeric" } as const;
    return new Date(date).toLocaleDateString("id-ID", options);
  };

  return {
    title: data.title,
    location: data.location,
    description: data.description,
    date: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}`,
  };
}

/**
 * Fetch experiences from upstream API
 */
export async function fetchExperiences(): Promise<Experience[]> {
  const { apiBaseUrl, apiToken } = getApiConfig();

  const response = await fetchJson<PortfolioExperiencesResponse>(
    `${apiBaseUrl}/api/v1/experiences`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("Invalid experiences response format");
  }

  return response.data.map(transformExperience);
}
