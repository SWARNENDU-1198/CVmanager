import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from '../services/api';

interface UploadZoneProps {
  onUploadSuccess: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndAddFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const validFiles: File[] = [];
    const invalidNames: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      // We check extension manually
      const isPdf = ext === '.pdf';
      const isDocx = ext === '.docx';
      const isTxt = ext === '.txt';
      const isCsv = ext === '.csv';
      const isPng = ext === '.png';
      const isJpg = ext === '.jpg';
      const isJpeg = ext === '.jpeg';

      if (isPdf || isDocx || isTxt || isCsv || isPng || isJpg || isJpeg ||
          file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.type === 'text/plain' ||
          file.type === 'text/csv' ||
          file.type === 'application/csv' ||
          file.type === 'image/png' ||
          file.type === 'image/jpeg') {
        validFiles.push(file);
      } else {
        invalidNames.push(file.name);
      }
    }

    if (invalidNames.length > 0) {
      setUploadStatus({
        type: 'error',
        message: `Unsupported file type(s): ${invalidNames.join(', ')}. Please upload PDF, DOCX, TXT, CSV, PNG, JPG, or JPEG.`
      });
    } else {
      setUploadStatus(null);
    }

    setFiles(prev => [...prev, ...validFiles]);
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      await api.uploadResumes(files);
      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${files.length} resume(s)!`
      });
      setFiles([]);
      onUploadSuccess();
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || "Failed to parse and index resumes."
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-6">
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 glass-card
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99] shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
          }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg"
          onChange={handleFileInput}
          className="hidden" 
        />
        
        <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-4 animate-pulse-slow">
          <Upload className="w-8 h-8" />
        </div>
        
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          Drag and drop resumes or CSVs here
        </h3>
        
        <p className="text-sm text-slate-400 text-center max-w-md">
          Support for <strong className="text-slate-300">PDF, Word (DOCX), TXT, CSV, and Images (PNG, JPG, JPEG)</strong>. Upload up to 10MB per file.
        </p>
      </div>

      {files.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
            <FileText className="w-4 h-4 text-indigo-400" />
            Selected Resumes ({files.length})
          </h4>
          
          <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-slate-925/80 border border-slate-900 rounded-xl"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setFiles([])}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-all"
              disabled={uploading}
            >
              Clear All
            </button>
            <button 
              onClick={uploadFiles}
              disabled={uploading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing & Indexing...
                </>
              ) : (
                'Process Resumes'
              )}
            </button>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in
          ${uploadStatus.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
};
