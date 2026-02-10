/**
 * Upstream API response types (from portfolio backend)
 */

export interface PortfolioProject {
  id: number;
  title: string;
  description: string;
  tags: string;
  image: string;
  url: string;
}

export interface PortfolioProjectsResponse {
  success: boolean;
  data: {
    data: PortfolioProject[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PortfolioExperience {
  id: number;
  title: string;
  location: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
}

export interface PortfolioExperiencesResponse {
  success: boolean;
  data: PortfolioExperience[];
}

/**
 * Domain models (UI layer)
 */

export interface Project {
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  webUrl: string;
}

export interface PaginatedProjects {
  projects: Project[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface Experience {
  title: string;
  location: string;
  description: string;
  date: string;
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
