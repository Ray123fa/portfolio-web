"use client";

import React, { useState, useEffect } from "react";
import SectionHeading from "./section-heading";
import Project from "./project";
import { useSectionInView } from "@/lib/hooks";

type ProjectProps = {
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  webUrl: string;
};

export default function Projects() {
  const { ref } = useSectionInView("Projects", 0.5);
  const [projectsData, setProjectsData] = useState<ProjectProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchProjects(page: number) {
      setLoading(true);
      try {
        const env = process.env.NEXT_PUBLIC_ENV;
        let hostApi;
        if (env === "local") {
          hostApi = process.env.NEXT_PUBLIC_API_LOCAL;
        } else if (env === "prod") {
          hostApi = process.env.NEXT_PUBLIC_API_PROD;
        }

        const response = await fetch(`${hostApi}/api/v1/portos?page=${page}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        });
        const result = await response.json();

        if (result.success && result.data?.data) {
          const transformedData = result.data.data.map((item: any) => ({
            title: item.title,
            description: item.description,
            tags: item.tags.split(","),
            imageUrl: `/${item.image}`,
            webUrl: item.url,
          }));

          setProjectsData(transformedData);
          setTotalPages(result.data.last_page);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects(currentPage);
  }, [currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      setTimeout(() => {
        window.location.replace("#projects"); // Refresh halaman
      }, 500); // Delay untuk efek smooth scroll
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      setTimeout(() => {
        window.location.replace("#projects"); // Refresh halaman
      }, 500); // Delay untuk efek smooth scroll
    }
  };

  return (
    <section ref={ref} id="projects" className="scroll-mt-28 mb-28">
      <SectionHeading>My projects</SectionHeading>
      {loading && (
        <div className="flex justify-center items-center">
          <p className="text-lg">Loading...</p>
        </div>
      )}
      {!loading && projectsData.length === 0 && (
        <div className="flex justify-center items-center">
          <p className="text-lg">No projects found.</p>
        </div>
      )}
      {!loading && projectsData.length != 0 && (
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
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`mx-2 px-4 py-2 text-sm rounded transition ${
              currentPage === 1 ? "dark:bg-[#4A4A4A] bg-[#E0E0E0] dark:text-[#9E9E9E] text-[#BDBDBD] cursor-not-allowed" : "dark:bg-[#6C63FF] bg-[#6C63FF] text-white dark:hover:bg-[#4B47D1] hover:bg-[#4B47D1]"
            }`}
          >
            &lt;
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`mx-2 px-4 py-2 text-sm rounded transition ${
              currentPage === totalPages ? "dark:bg-[#4A4A4A] bg-[#E0E0E0] dark:text-[#9E9E9E] text-[#BDBDBD] cursor-not-allowed" : "dark:bg-[#6C63FF] bg-[#6C63FF] text-white dark:hover:bg-[#4B47D1] hover:bg-[#4B47D1]"
            }`}
          >
            &gt;
          </button>
        </div>
      )}
    </section>
  );
}
