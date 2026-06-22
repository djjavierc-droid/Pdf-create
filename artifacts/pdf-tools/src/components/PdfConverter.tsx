import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileType, CheckCircle2, GripVertical, X, ArrowUp, ArrowDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { imagesToPdf } from "@/lib/pdf";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

export function PdfConverter() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedPdfBlob, setConvertedPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  const handleFiles = (files: FileList | File[]) => {
    setError(null);
    setConvertedPdfBlob(null);
    
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith("image/") && 
      ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"].includes(file.type)
    );

    if (validFiles.length !== files.length) {
      setError("Some files were not valid images and were skipped.");
    }

    if (validFiles.length === 0) return;

    const newImages = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
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

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setConvertedPdfBlob(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const newImages = [...prev];
      if (direction === 'up' && index > 0) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === 'down' && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      }
      return newImages;
    });
    setConvertedPdfBlob(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    
    setIsConverting(true);
    setError(null);
    setProgress(10); // Fake initial progress
    
    try {
      // Simulate progress updates for better UX since jspdf is synchronous blocking
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 90));
      }, 200);

      const files = images.map(i => i.file);
      const blob = await imagesToPdf(files);
      
      clearInterval(progressInterval);
      setProgress(100);
      setConvertedPdfBlob(blob);
      
      // Auto-trigger download
      triggerDownload(blob);
      
    } catch (err) {
      console.error(err);
      setError("Failed to convert images to PDF. Please try again.");
    } finally {
      setIsConverting(false);
    }
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "converted.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Image to PDF</h2>
        <p className="text-slate-500 dark:text-slate-400">Convert your images into a single, cohesive PDF document.</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dropzone-image"
      >
        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
            Drag and drop images here
          </p>
          <p className="text-sm text-slate-500 mt-1">
            or click to browse files (JPG, PNG, WebP)
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
          className="hidden"
          data-testid="input-image-file"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3" data-testid="error-message">
          <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Selected Images ({images.length})
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setImages([]); setConvertedPdfBlob(null); }}
              data-testid="button-clear-all"
            >
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <Card key={img.id} className="group overflow-hidden border-slate-200 dark:border-slate-800" data-testid={`card-image-${index}`}>
                <CardContent className="p-0 relative">
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white text-slate-700 shadow-sm"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white text-slate-700 shadow-sm disabled:opacity-50"
                      onClick={(e) => { e.stopPropagation(); moveImage(index, 'up'); }}
                      disabled={index === 0}
                      data-testid={`button-move-up-${index}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white text-slate-700 shadow-sm disabled:opacity-50"
                      onClick={(e) => { e.stopPropagation(); moveImage(index, 'down'); }}
                      disabled={index === images.length - 1}
                      data-testid={`button-move-down-${index}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative">
                    <img 
                      src={img.previewUrl} 
                      alt={img.file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <p className="text-white font-medium truncate text-sm">
                        {img.file.name}
                      </p>
                      <p className="text-white/80 text-xs">
                        {formatFileSize(img.file.size)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center pt-6 border-t border-slate-200 dark:border-slate-800">
            {isConverting ? (
              <div className="w-full max-w-md space-y-4">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Converting images...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : convertedPdfBlob ? (
              <div className="w-full max-w-md space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <p className="font-medium">Successfully converted to PDF</p>
                </div>
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg gap-2"
                  onClick={() => triggerDownload(convertedPdfBlob)}
                  data-testid="button-download-pdf"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </Button>
              </div>
            ) : (
              <Button 
                size="lg" 
                className="w-full max-w-md h-14 text-lg"
                onClick={handleConvert}
                data-testid="button-convert-pdf"
              >
                Convert to PDF
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
