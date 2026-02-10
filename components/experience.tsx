"use client";

import React, { useState, useEffect } from "react";
import SectionHeading from "./section-heading";
import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { useSectionInView } from "@/lib/hooks";
import { useTheme } from "@/context/theme-context";
import { FaCircle } from "react-icons/fa";
import type { Experience as ExperienceType } from "@/lib/api/types";

export default function Experience() {
  const { ref } = useSectionInView("Experience");
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiencesData, setExperiencesData] = useState<ExperienceType[]>([]);

  useEffect(() => {
    async function loadExperiences() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/experiences");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch experiences: ${response.statusText}`
          );
        }

        const data = await response.json();
        setExperiencesData(Array.isArray(data) ? data : []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch experiences";
        setError(errorMessage);
        console.error("Failed to fetch experiences:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExperiences();
  }, []);
  return (
    <section id="experience" ref={ref} className="scroll-mt-28 mb-28 sm:mb-40">
      <SectionHeading>My experience</SectionHeading>
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
      {!loading && !error && experiencesData.length === 0 && (
        <div className="flex justify-center items-center">
          <p className="text-lg">No experiences found.</p>
        </div>
      )}
      {!loading && !error && experiencesData.length > 0 && (
        <VerticalTimeline lineColor="">
          {experiencesData.map((item, index) => (
            <React.Fragment key={index}>
              <VerticalTimelineElement
                contentStyle={{
                  background: theme === "light" ? "#f3f4f6" : "rgba(255, 255, 255, 0.05)",
                  boxShadow: "none",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  textAlign: "left",
                  padding: "1.3rem 2rem",
                }}
                contentArrowStyle={{
                  borderRight: theme === "light" ? "0.4rem solid #9ca3af" : "0.4rem solid rgba(255, 255, 255, 0.5)",
                }}
                date={item.date}
                icon={React.createElement(FaCircle)}
                iconStyle={{
                  background: theme === "light" ? "white" : "rgba(255, 255, 255, 0.15)",
                  fontSize: "1.5rem",
                }}
              >
                <h3 className="font-semibold capitalize">{item.title}</h3>
                <p className="font-normal !mt-0">{item.location}</p>
                <p className="!mt-1 !font-normal text-gray-700 dark:text-white/75">{item.description}</p>
              </VerticalTimelineElement>
            </React.Fragment>
          ))}
        </VerticalTimeline>
      )}
    </section>
  );
}
