import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileToArrayBuffer } from "@/lib/pdf";
import * as pdfjsLib from "pdfjs-dist";

// CRITICAL: Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export function PdfReader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pageInput, setPageInput] = useState("1");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadPdf = async (fileToLoad: File) => {
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageNum(1);
    setPageInput("1");
    setScale(1.2);

    try {
      const arrayBuffer = await fileToArrayBuffer(fileToLoad);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setFile(fileToLoad);
    } catch (err) {
      console.error(err);
      setError("Failed to open PDF. It may be corrupted or password protected.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  };

  useEffect(() => {
    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const handleFiles = (files: FileList | File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }
    
    loadPdf(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const changePage = (offset: number) => {
    setPageNum(prev => {
      const next = Math.max(1, Math.min(numPages, prev + offset));
      setPageInput(next.toString());
      return next;
    });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pageInput, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      setPageNum(val);
    } else {
      setPageInput(pageNum.toString());
    }
  };

  const adjustScale = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  const fitToWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth - 32; // padding
      const newScale = containerWidth / viewport.width;
      setScale(Math.min(newScale, 2.0)); // cap at 2.0
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 flex flex-col h-[calc(100vh-12rem)] min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!pdfDoc && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">PDF Reader</h2>
            <p className="text-slate-500 dark:text-slate-400">View and read your PDF documents directly in the browser.</p>
          </div>

          <div
            className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-16 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' 
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-pdf"
          >
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
              <FileText className="w-10 h-10" />
            </div>
            <div>
              <p className="text-xl font-medium text-slate-700 dark:text-slate-200">
                Drag and drop a PDF file here
              </p>
              <p className="text-sm text-slate-500 mt-2">
                or click to browse files
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              accept="application/pdf"
              className="hidden"
              data-testid="input-pdf-file"
            />
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3 w-full max-w-2xl" data-testid="error-message">
              <FileWarning className="w-5 h-5 text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          <p>Loading document...</p>
        </div>
      )}

      {pdfDoc && (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-2 max-w-[200px] md:max-w-xs truncate">
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-sm font-medium truncate" title={file?.name}>
                {file?.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => changePage(-1)}
                disabled={pageNum <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className="w-14 h-9 text-center"
                  data-testid="input-page-number"
                />
                <span className="text-sm text-slate-500">/ {numPages}</span>
              </form>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => changePage(1)}
                disabled={pageNum >= numPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => adjustScale(-0.1)}
                data-testid="button-zoom-out"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-500 w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => adjustScale(0.1)}
                data-testid="button-zoom-in"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fitToWidth}
                data-testid="button-fit-width"
                title="Fit to Width"
              >
                <Maximize className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setPdfDoc(null)}
                data-testid="button-close-pdf"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Document Viewer Area */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start custom-scrollbar"
          >
            <div className="bg-white dark:bg-slate-950 shadow-md transition-transform duration-200">
              <canvas ref={canvasRef} id="pdf-canvas" className="max-w-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
