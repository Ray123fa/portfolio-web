"use client";

import React, { useState, useEffect } from "react";
import SectionHeading from "./section-heading";
import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { useSectionInView } from "@/lib/hooks";
import { useTheme } from "@/context/theme-context";
import { FaCircle } from "react-icons/fa";

type ExperienceProps = {
  title: string;
  location: string;
  description: string;
  date: string;
};

export default function Experience() {
  const { ref } = useSectionInView("Experience");
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [experiencesData, setExperiencesData] = useState<ExperienceProps[]>([]);

  useEffect(() => {
    async function fetchExperiences() {
      setLoading(true);
      try {
        const env = process.env.NEXT_PUBLIC_ENV;
        let hostApi;
        if (env === "local") {
          hostApi = process.env.NEXT_PUBLIC_API_LOCAL;
        } else if (env === "prod") {
          hostApi = process.env.NEXT_PUBLIC_API_PROD;
        }

        const response = await fetch(`${hostApi}/api/v1/experiences`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        });
        const result = await response.json();

        if (result.success) {
          const transformedData = result.data.map((item: any) => {
            const formatDate = (date: string | null) => {
              if (!date) return "Present";
              const options = { month: "short", year: "numeric" } as const;
              return new Date(date).toLocaleDateString("id-ID", options);
            };

            return {
              title: item.title,
              location: item.location,
              description: item.description,
              date: `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`,
            };
          });

          setExperiencesData(transformedData);
        }
      } catch (error) {
        console.error("Failed to fetch experiences:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExperiences();
  }, []);

  return (
    <section id="experience" ref={ref} className="scroll-mt-28 mb-28 sm:mb-40">
      <SectionHeading>My experience</SectionHeading>
      {loading && (
        <div className="flex justify-center items-center">
          <p className="text-lg">Loading...</p>
        </div>
      )}
      {!loading && experiencesData.length === 0 && (
        <div className="flex justify-center items-center">
          <p className="text-lg">No experiences found.</p>
        </div>
      )}
      {!loading && experiencesData.length != 0 && (
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
