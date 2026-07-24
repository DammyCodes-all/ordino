"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AnalysisDocument,
  DocumentAnalysisSummary,
  DocumentHighlight,
  DocumentState,
  InternalRenderResult,
  NarrationPlaylist,
  OutlineItem,
} from "@/contracts";
import { fromGeneratedPdf, fromUploadedPdf } from "@/pdf-analysis/adapters";
import { analyzeAnalysisDocument } from "@/pdf-analysis/client-analyze";
import { exportAnnotatedPdf } from "@/pdf-analysis/export-annotated";
import { ingestAnalyzablePdf } from "@/pdf-analysis/ingest.browser";
import {
  BrowserNarrationPlayer,
  type NarrationStatus,
} from "@/tts/browser-narration";

export type AnalysisStage =
  | "idle"
  | "ingesting"
  | "analyzing"
  | "ready"
  | "failed";

type PdfAnalysisContextValue = {
  open: boolean;
  stage: AnalysisStage;
  statusMessage: string;
  targetLanguage: string;
  userGoal: string;
  analysis: AnalysisDocument | null;
  highlights: DocumentHighlight[];
  summary: DocumentAnalysisSummary | null;
  narration: NarrationPlaylist | null;
  selectedHighlightId: string | null;
  currentPage: number;
  narrationStatus: NarrationStatus;
  errorMessage: string | null;
  setOpen: (open: boolean) => void;
  setTargetLanguage: (language: string) => void;
  setUserGoal: (goal: string) => void;
  setCurrentPage: (page: number) => void;
  setSelectedHighlightId: (id: string | null) => void;
  startFromUpload: (file: File) => Promise<void>;
  startFromGenerated: (
    document: DocumentState,
    render: InternalRenderResult,
    outline: OutlineItem[],
  ) => Promise<void>;
  exportAnnotated: () => Promise<void>;
  playNarration: (highlightId?: string | null) => void;
  pauseNarration: () => void;
  resumeNarration: () => void;
  stopNarration: () => void;
  reanalyze: () => Promise<void>;
  closeWorkspace: () => void;
};

const PdfAnalysisContext = createContext<PdfAnalysisContextValue | null>(null);

export function PdfAnalysisProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to analyze a PDF.");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [userGoal, setUserGoal] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisDocument | null>(null);
  const [highlights, setHighlights] = useState<DocumentHighlight[]>([]);
  const [summary, setSummary] = useState<DocumentAnalysisSummary | null>(null);
  const [narration, setNarration] = useState<NarrationPlaylist | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [narrationStatus, setNarrationStatus] =
    useState<NarrationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sourceBlobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<BrowserNarrationPlayer | null>(null);

  if (!playerRef.current) {
    playerRef.current = new BrowserNarrationPlayer(setNarrationStatus);
  }

  const resetResults = useCallback(() => {
    setHighlights([]);
    setSummary(null);
    setNarration(null);
    setSelectedHighlightId(null);
    setCurrentPage(1);
    setErrorMessage(null);
    playerRef.current?.stop();
  }, []);

  const runPipeline = useCallback(
    async (input: ReturnType<typeof fromUploadedPdf>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      sourceBlobRef.current = input.pdfBlob;
      resetResults();
      setOpen(true);
      setStage("ingesting");
      setStatusMessage("Extracting pages and text…");

      const ingested = await ingestAnalyzablePdf(input, controller.signal, {
        maxPages: 8,
      });
      if (!ingested.success) {
        setStage("failed");
        setErrorMessage(ingested.error.message);
        setStatusMessage("Ingest failed.");
        return;
      }

      setAnalysis(ingested.data);
      setStage("analyzing");
      setStatusMessage("Sending pages to Google AI Studio…");

      const analyzed = await analyzeAnalysisDocument(
        ingested.data,
        targetLanguage,
        userGoal.trim() || null,
        controller.signal,
      );

      if (!analyzed.success) {
        setStage("failed");
        setErrorMessage(analyzed.error.message);
        setStatusMessage("Analysis failed.");
        return;
      }

      setHighlights(analyzed.data.highlights);
      setSummary(analyzed.data.summary);
      setNarration(analyzed.data.narration);
      setSelectedHighlightId(analyzed.data.highlights[0]?.id ?? null);
      setCurrentPage(analyzed.data.highlights[0]?.pageNumber ?? 1);
      setStage("ready");
      setStatusMessage(
        analyzed.data.highlights.length > 0
          ? `Found ${analyzed.data.highlights.length} highlight(s).`
          : "Analysis complete — no highlights found.",
      );
    },
    [resetResults, targetLanguage, userGoal],
  );

  const startFromUpload = useCallback(
    async (file: File) => {
      try {
        const input = fromUploadedPdf(file);
        await runPipeline(input);
      } catch {
        setOpen(true);
        setStage("failed");
        setErrorMessage("Only PDF files are supported.");
        setStatusMessage("Upload failed.");
      }
    },
    [runPipeline],
  );

  const startFromGenerated = useCallback(
    async (
      document: DocumentState,
      render: InternalRenderResult,
      outline: OutlineItem[],
    ) => {
      const input = fromGeneratedPdf(document, render, outline);
      await runPipeline(input);
    },
    [runPipeline],
  );

  const exportAnnotated = useCallback(async () => {
    if (!analysis || !sourceBlobRef.current) return;
    const result = await exportAnnotatedPdf(
      sourceBlobRef.current,
      analysis,
      highlights,
    );
    if (!result.success) {
      setErrorMessage(result.error.message);
      return;
    }
    const url = URL.createObjectURL(result.data.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.data.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [analysis, highlights]);

  const playNarration = useCallback(
    (highlightId?: string | null) => {
      if (!narration) return;
      playerRef.current?.play(narration, highlightId);
    },
    [narration],
  );

  const pauseNarration = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const resumeNarration = useCallback(() => {
    playerRef.current?.resume();
  }, []);

  const stopNarration = useCallback(() => {
    playerRef.current?.stop();
  }, []);

  const reanalyze = useCallback(async () => {
    if (!analysis || stage === "ingesting" || stage === "analyzing") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    playerRef.current?.stop();
    setStage("analyzing");
    setStatusMessage("Re-analyzing with updated language/goal…");
    setErrorMessage(null);

    const analyzed = await analyzeAnalysisDocument(
      analysis,
      targetLanguage,
      userGoal.trim() || null,
      controller.signal,
    );

    if (!analyzed.success) {
      setStage("failed");
      setErrorMessage(analyzed.error.message);
      setStatusMessage("Re-analysis failed.");
      return;
    }

    setHighlights(analyzed.data.highlights);
    setSummary(analyzed.data.summary);
    setNarration(analyzed.data.narration);
    setSelectedHighlightId(analyzed.data.highlights[0]?.id ?? null);
    setCurrentPage(analyzed.data.highlights[0]?.pageNumber ?? 1);
    setStage("ready");
    setStatusMessage(
      analyzed.data.highlights.length > 0
        ? `Found ${analyzed.data.highlights.length} highlight(s).`
        : "Analysis complete — no highlights found.",
    );
  }, [analysis, stage, targetLanguage, userGoal]);

  const closeWorkspace = useCallback(() => {
    abortRef.current?.abort();
    playerRef.current?.stop();
    setOpen(false);
    setStage("idle");
    setStatusMessage("Ready to analyze a PDF.");
  }, []);

  const value = useMemo<PdfAnalysisContextValue>(
    () => ({
      open,
      stage,
      statusMessage,
      targetLanguage,
      userGoal,
      analysis,
      highlights,
      summary,
      narration,
      selectedHighlightId,
      currentPage,
      narrationStatus,
      errorMessage,
      setOpen,
      setTargetLanguage,
      setUserGoal,
      setCurrentPage,
      setSelectedHighlightId,
      startFromUpload,
      startFromGenerated,
      exportAnnotated,
      playNarration,
      pauseNarration,
      resumeNarration,
      stopNarration,
      reanalyze,
      closeWorkspace,
    }),
    [
      open,
      stage,
      statusMessage,
      targetLanguage,
      userGoal,
      analysis,
      highlights,
      summary,
      narration,
      selectedHighlightId,
      currentPage,
      narrationStatus,
      errorMessage,
      startFromUpload,
      startFromGenerated,
      exportAnnotated,
      playNarration,
      pauseNarration,
      resumeNarration,
      stopNarration,
      reanalyze,
      closeWorkspace,
    ],
  );

  return (
    <PdfAnalysisContext.Provider value={value}>
      {children}
    </PdfAnalysisContext.Provider>
  );
}

export function usePdfAnalysis() {
  const context = useContext(PdfAnalysisContext);
  if (!context) {
    throw new Error("usePdfAnalysis must be used within PdfAnalysisProvider");
  }
  return context;
}
