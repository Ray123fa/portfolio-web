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

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("https://showporto.rfaridh.my.id/api/v1/portos");
        const result = await response.json();

        if (result.success && result.data?.data) {
          const transformedData = result.data.data.map((item: any) => ({
            title: item.title,
            description: item.description,
            tags: item.tags.split(", "),
            imageUrl: `/${item.image}`,
            webUrl: item.url,
          }));

          setProjectsData(transformedData);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    }

    fetchProjects();
  }, []);

  return (
    <section ref={ref} id="projects" className="scroll-mt-28 mb-28">
      <SectionHeading>My projects</SectionHeading>
      {loading && (
        <div className="flex justify-center items-center">
          <p className="text-lg">Loading...</p>
        </div>
      )}
      <div>
        {projectsData.map((project, index) => (
          <React.Fragment key={index}>
            <Project {...project} />
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
