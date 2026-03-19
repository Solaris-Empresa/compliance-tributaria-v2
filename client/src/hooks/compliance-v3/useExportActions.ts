import { useState } from "react";
import { trpc } from "@/lib/trpc";

export type UseExportActionsReturn = {
  exportCsv: () => Promise<void>;
  exportPdf: () => Promise<void>;
  isExporting: boolean;
  lastExportFilename?: string;
};

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportActions(projectId: number): UseExportActionsReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportFilename, setLastExportFilename] = useState<string | undefined>();

  const csvQuery = trpc.complianceV3.exportCsv.useQuery(
    { projectId },
    { enabled: false }
  );

  const pdfQuery = trpc.complianceV3.exportPdf.useQuery(
    { projectId },
    { enabled: false }
  );

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const result = await csvQuery.refetch();
      if (result.data) {
        downloadBlob(result.data.content, result.data.filename, result.data.contentType);
        setLastExportFilename(result.data.filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const result = await pdfQuery.refetch();
      if (result.data) {
        downloadBlob(result.data.content, result.data.filename, result.data.contentType);
        setLastExportFilename(result.data.filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCsv, exportPdf, isExporting, lastExportFilename };
}
