"use client";

import { Puck, Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck/config";

const darkPuckStyles = `
  /* Isolate Puck from Tailwind Preflight */
  .puck-wrapper {
    height: 700px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    background: #fff; /* Puck is natively light theme */
    color: #000;
  }
  
  /* Reset Tailwind borders that break third-party UIs */
  .puck-wrapper *, .puck-wrapper ::before, .puck-wrapper ::after {
    border-style: none;
    border-width: 0;
  }

  /* Reset lists and headings */
  .puck-wrapper ul, .puck-wrapper ol {
    list-style: revert;
    margin: revert;
    padding: revert;
  }
  
  .puck-wrapper h1, .puck-wrapper h2, .puck-wrapper h3, .puck-wrapper h4, .puck-wrapper h5, .puck-wrapper h6 {
    font-size: revert;
    font-weight: revert;
    margin: revert;
  }
`;

interface PuckBuilderProps {
  initialData: any;
  onPublish: (data: Data) => void;
}

export default function PuckBuilder({ initialData, onPublish }: PuckBuilderProps) {
  // Parse initial data if it's a string
  let data: Data = { content: [], root: {} };
  try {
    if (typeof initialData === 'string' && initialData.trim() !== '') {
      data = JSON.parse(initialData);
    } else if (typeof initialData === 'object' && initialData !== null) {
      data = initialData;
    }
  } catch (e) {
    console.error("Failed to parse Puck data", e);
  }

  return (
    <div className="puck-wrapper w-full flex flex-col">
      <style>{darkPuckStyles}</style>
      <Puck
        config={puckConfig}
        data={data}
        onPublish={onPublish}
      />
    </div>
  );
}
