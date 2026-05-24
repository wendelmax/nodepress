import type { Config } from "@measured/puck";
import React from "react";
import { FormEmbed } from "@/components/FormEmbed";

type Props = {
  Hero: { title: string; subtitle: string; align: "left" | "center" | "right"; padding: number };
  Heading: { title: string; level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; align: "left" | "center" | "right" };
  Text: { text: string; align: "left" | "center" | "right" };
  Button: { label: string; href: string; variant: "primary" | "secondary" | "outline"; align: "left" | "center" | "right" };
  Spacer: { size: number };
  Image: { url: string; alt: string; objectFit: "cover" | "contain" | "fill" };
  Form: { formId: string };
};

export const puckConfig: Config<Props> = {
  components: {
    Hero: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        align: {
          type: "radio",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        padding: {
          type: "number",
          label: "Vertical Padding (px)",
        },
      },
      defaultProps: {
        title: "Hero Title",
        subtitle: "This is the subtitle of the hero section.",
        align: "center",
        padding: 64,
      },
      render: ({ title, subtitle, align, padding }) => (
        <div style={{ textAlign: align, padding: `${padding}px 20px` }} className="w-full bg-surface-elevated text-text">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white leading-tight">{title}</h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>
      ),
    },
    Heading: {
      fields: {
        title: { type: "text" },
        level: {
          type: "select",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
            { label: "H5", value: "h5" },
            { label: "H6", value: "h6" },
          ],
        },
        align: {
          type: "radio",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: {
        title: "Heading",
        level: "h2",
        align: "left",
      },
      render: ({ title, level, align }) => {
        const Tag = level as any;
        const sizeClass = {
          h1: "text-4xl font-extrabold",
          h2: "text-3xl font-bold",
          h3: "text-2xl font-bold",
          h4: "text-xl font-bold",
          h5: "text-lg font-semibold",
          h6: "text-base font-semibold",
        }[level];
        return <Tag style={{ textAlign: align }} className={`text-white my-4 ${sizeClass}`}>{title}</Tag>;
      },
    },
    Text: {
      fields: {
        text: { type: "textarea" },
        align: {
          type: "radio",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: {
        text: "Lorem ipsum dolor sit amet...",
        align: "left",
      },
      render: ({ text, align }) => (
        <p style={{ textAlign: align, whiteSpace: "pre-wrap" }} className="text-text-secondary my-4 leading-relaxed">
          {text}
        </p>
      ),
    },
    Button: {
      fields: {
        label: { type: "text" },
        href: { type: "text" },
        variant: {
          type: "select",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Outline", value: "outline" },
          ],
        },
        align: {
          type: "radio",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: {
        label: "Click Here",
        href: "#",
        variant: "primary",
        align: "left",
      },
      render: ({ label, href, variant, align }) => {
        const baseClass = "inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all duration-200";
        const variantClass = {
          primary: "bg-primary-gradient text-white hover:shadow-neon",
          secondary: "bg-white/10 text-white hover:bg-white/20",
          outline: "border border-border text-text hover:border-primary/50 hover:text-white",
        }[variant];
        return (
          <div style={{ textAlign: align }} className="my-4 w-full">
            <a href={href} className={`${baseClass} ${variantClass} no-underline`}>
              {label}
            </a>
          </div>
        );
      },
    },
    Image: {
      fields: {
        url: { type: "text" },
        alt: { type: "text" },
        objectFit: {
          type: "select",
          options: [
            { label: "Cover", value: "cover" },
            { label: "Contain", value: "contain" },
            { label: "Fill", value: "fill" },
          ],
        },
      },
      defaultProps: {
        url: "https://via.placeholder.com/800x400",
        alt: "Placeholder",
        objectFit: "cover",
      },
      render: ({ url, alt, objectFit }) => (
        <div className="w-full my-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <img src={url} alt={alt} style={{ objectFit }} className="w-full h-auto" />
        </div>
      ),
    },
    Spacer: {
      fields: {
        size: { type: "number", label: "Height (px)" },
      },
      defaultProps: { size: 32 },
      render: ({ size }) => <div style={{ height: size, width: "100%" }} aria-hidden="true" />,
    },
    Form: {
      fields: {
        formId: { type: "text", label: "Formulário ID" },
      },
      defaultProps: { formId: "" },
      render: ({ formId }) => (
        <div className="my-8">
          <FormEmbed formId={formId} />
        </div>
      )
    }
  },
};
