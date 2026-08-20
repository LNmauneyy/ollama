import { useState, useRef, useCallback } from 'react';

export default function UploadSection({ onFilesUpload, isAnalyzing, uploadProgress }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter(
      f => f.name.endsWith('.pdf') || f.type === 'application/pdf'
    );
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleFolderSelect = (e) => {
    const selected = Array.from(e.target.files || []).filter(
      f => f.name.endsWith('.pdf') || f.type === 'application/pdf'
    );
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleSubmitAll = () => {
    if (files.length > 0 && onFilesUpload) {
      onFilesUpload(files);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <section id="upload" className="relative py-24 md:py-32 bg-gray-50">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            อัปโหลดพอร์ตโฟลิโอ
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            เลือก Folder หรือหลายไฟล์ PDF Portfolio ของนักเรียนให้ AI วิเคราะห์ทีละคน
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer
            transition-all duration-300 bg-white
            ${dragActive
              ? 'border-emerald-400 bg-emerald-50/50 scale-[1.02]'
              : files.length > 0
                ? 'border-green-300 bg-green-50/30'
                : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
            }
          `}
          onClick={() => !files.length && inputRef.current?.click()}
        >
          {/* Hidden inputs */}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".pdf"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderSelect}
            className="hidden"
          />

          {files.length === 0 ? (
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 border border-emerald-200 animate-border-glow">
                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>

              <div>
                <p className="text-lg text-gray-800 font-medium mb-1">
                  ลากไฟล์ PDF มาวางที่นี่
                </p>
                <p className="text-sm text-gray-400">
                  หรือคลิกเพื่อเลือกไฟล์
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PDF</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500">สูงสุด 15 หน้า</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500">ไม่เกิน 30 MB</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  เลือก Folder
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
              {/* File count */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>

              <div>
                <p className="text-gray-800 font-medium text-lg">
                  พบไฟล์ PDF {files.length} ไฟล์
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  รวม {formatFileSize(files.reduce((a, f) => a + f.size, 0))}
                </p>
              </div>

              {/* File list */}
              <div className="max-h-48 overflow-y-auto space-y-2 px-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 group hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(f.size)}</span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleSubmitAll}
                  disabled={isAnalyzing}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังวิเคราะห์...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      </svg>
                      วิเคราะห์ทั้งหมด {files.length} ไฟล์
                    </span>
                  )}
                </button>
                <button
                  onClick={clearAll}
                  disabled={isAnalyzing}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  disabled={isAnalyzing}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:text-gray-700 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + เพิ่มไฟล์
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isAnalyzing && uploadProgress && (
          <div className="mt-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">กำลังวิเคราะห์</h4>
                <span className="text-xs text-gray-400">
                  {uploadProgress.completed}/{uploadProgress.total} ไฟล์
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                  style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-gray-500 truncate">{uploadProgress.currentFile}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}