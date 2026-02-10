"use client";

import React, { useState, useEffect } from "react";
import SectionHeading from "./section-heading";
import Project from "./project";
import { useSectionInView } from "@/lib/hooks";
import type { Project as ProjectType } from "@/lib/api/types";

export default function Projects() {
  const { ref } = useSectionInView("Projects", 0.5);
  const [projectsData, setProjectsData] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadProjects(page: number) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects?page=${page}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch projects: ${response.statusText}`
          );
        }

        const data = await response.json();

        setProjectsData(data.projects || []);
        setTotalPages(data.lastPage || 1);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch projects";
        setError(errorMessage);
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects(currentPage);
  }, [currentPage]);

  return (
    <section ref={ref} id="projects" className="scroll-mt-28 mb-28">
      <SectionHeading>My projects</SectionHeading>
      {loading && (
        <div className="flex justify-center items-center">
          <p className="text-lg">Loading...</p>
        </div>
      )}
      {error && (
        <div className="flex justify-center items-center">
          <p className="text-lg text-red-500">Error: {error}</p>
        </div>
      )}
      {!loading && !error && projectsData.length === 0 && (
        <div className="flex justify-center items-center">
          <p className="text-lg">No projects found.</p>
        </div>
      )}
      {!loading && !error && projectsData.length > 0 && (
        <div>
          {projectsData.map((project, index) => (
            <React.Fragment key={index}>
              <Project {...project} />
            </React.Fragment>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6">
          <button
            onClick={() => {
              if (currentPage > 1) {
                setCurrentPage((prev) => prev - 1);
                setTimeout(() => {
                  window.location.hash = "projects";
                }, 100);
              }
            }}
            disabled={currentPage === 1}
            className={`mx-2 px-4 py-2 text-sm rounded transition ${
              currentPage === 1
                ? "dark:bg-[#4A4A4A] bg-[#E0E0E0] dark:text-[#9E9E9E] text-[#BDBDBD] cursor-not-allowed"
                : "dark:bg-[#6C63FF] bg-[#6C63FF] text-white dark:hover:bg-[#4B47D1] hover:bg-[#4B47D1]"
            }`}
          >
            &lt;
          </button>
          <button
            onClick={() => {
              if (currentPage < totalPages) {
                setCurrentPage((prev) => prev + 1);
                setTimeout(() => {
                  window.location.hash = "projects";
                }, 100);
              }
            }}
            disabled={currentPage === totalPages}
            className={`mx-2 px-4 py-2 text-sm rounded transition ${
              currentPage === totalPages
                ? "dark:bg-[#4A4A4A] bg-[#E0E0E0] dark:text-[#9E9E9E] text-[#BDBDBD] cursor-not-allowed"
                : "dark:bg-[#6C63FF] bg-[#6C63FF] text-white dark:hover:bg-[#4B47D1] hover:bg-[#4B47D1]"
            }`}
          >
            &gt;
          </button>
        </div>
      )}
    </section>
  );
}
