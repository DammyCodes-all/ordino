import { DocumentState } from "../contracts/document";

const newId = () => crypto.randomUUID();

export const professionalDocumentFixture = {
  schemaVersion: 1,
  documentId: newId(),
  version: 0,
  reviewRevision: 0,
  meta: {
    title: "Professional Fixture",
    documentType: "Report",
    audience: "Team",
    writingStyle: "professional" as const,
    instructions: "This document contains every node type for testing.",
    pageLimit: null,
  },
  nodes: [
    {
      id: newId(),
      type: "heading",
      level: 1,
      text: "Executive Summary",
      style: {
        spaceBefore: "md",
        spaceAfter: "sm",
        alignment: "left",
        keepWithNext: true,
      },
    },
    {
      id: newId(),
      type: "paragraph",
      text: "This is a sample paragraph used in the professional fixture.",
      style: {
        spaceBefore: "none",
        spaceAfter: "md",
        alignment: "justify",
        emphasis: "normal",
      },
    },
    {
      id: newId(),
      type: "list",
      ordered: true,
      items: ["First item", "Second item", "Third item"],
      style: { spaceBefore: "sm", spaceAfter: "sm", compact: false },
    },
    {
      id: newId(),
      type: "table",
      columns: [
        { header: "Name", widthPercent: null },
        { header: "Value", widthPercent: null },
      ],
      rows: [
        ["Alpha", "1"],
        ["Beta", "2"],
      ],
      style: {
        spaceBefore: "sm",
        spaceAfter: "sm",
        density: "comfortable",
        headerAlignment: "left",
        striped: false,
      },
    },
    {
      id: newId(),
      type: "quote",
      text: "This is a quoted excerpt for demonstration.",
      attribution: null,
      style: { spaceBefore: "sm", spaceAfter: "sm", alignment: "left" },
    },
    {
      id: newId(),
      type: "callout",
      title: "Note",
      text: "This callout highlights an important point.",
      style: { spaceBefore: "sm", spaceAfter: "sm", variant: "note" },
    },
    {
      id: newId(),
      type: "divider",
      style: { spaceBefore: "sm", spaceAfter: "sm", variant: "subtle" },
    },
  ],
} as DocumentState;

export default professionalDocumentFixture;
