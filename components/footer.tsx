import React from "react";

export default function Footer() {
  let currentYear = new Date().getFullYear();

  return (
    <footer className="mb-10 px-4 text-center text-gray-500">
      <small className="mb-2 block text-xs">&copy; {2024 == currentYear ? "2024" : `2024 - ${currentYear}`} Rayhan F. All rights reserved.</small>
      <small className="mb-2 block text-xs">
        Inspired by{" "}
        <a href="https://github.com/ByteGrad/portfolio-website" className="text-slate-700">
          Ricardo
        </a>
      </small>
    </footer>
  );
}
