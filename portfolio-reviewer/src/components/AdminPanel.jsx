import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export default function AdminPanel({ user, onLogout }) {
  const [fileList, setFileList] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [resultModal, setResultModal] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      const files = await api.getFiles();
      setFileList(files);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await api.getAiStats();
      setAiStats(stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadStats();
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadFiles();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadFiles, loadStats]);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        await api.uploadFile(file, (pct) => setUploadProgress({ name: file.name, pct }));
      } catch (err) {
        console.error(err);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    e.target.value = '';
    loadFiles();
    loadStats();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        await api.uploadFile(file, (pct) => setUploadProgress({ name: file.name, pct }));
      } catch (err) {
        console.error(err);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    loadFiles();
    loadStats();
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบไฟล์นี้?')) return;
    try {
      await api.deleteFile(id);
      loadFiles();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAnalyzeAll = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      await api.analyzeAll();
      // Wait a bit then refresh
      setTimeout(() => {
        loadFiles();
        loadStats();
        setAnalyzing(false);
      }, 3000);
    } catch (err) {
      alert(err.message);
      setAnalyzing(false);
    }
  };

  const handleAnalyzeOne = async (id) => {
    try {
      await api.analyzeFile(id);
      loadFiles();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const viewResult = async (file) => {
    if (file.ai_status !== 'done') return;
    try {
      const data = await api.getAiStatus(file.id);
      setResultModal(data);
    } catch {
      // use stored result
      setResultModal({
        file_id: file.id,
        filename: file.original_name,
        status: file.ai_status,
        result: file.ai_result ? JSON.parse(file.ai_result) : null
      });
    }
  };

  const downloadFile = async (file) => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo/fte_Green.png" alt="FTE" className="h-10" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">ระบบจัดการเอกสาร</p>
              <p className="text-xs text-gray-400">งานอาคารสถานที่และยานพาหนะ</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              👤 {user?.username || 'admin'}
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'ไฟล์ทั้งหมด', value: aiStats?.total || 0, color: 'bg-blue-50 text-blue-600 border-blue-200' },
            { label: 'รอวิเคราะห์', value: aiStats?.pending || 0, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
            { label: 'วิเคราะห์แล้ว', value: aiStats?.done || 0, color: 'bg-green-50 text-green-600 border-green-200' },
            { label: 'มีปัญหา', value: aiStats?.error || 0, color: 'bg-red-50 text-red-600 border-red-200' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-1 opacity-75">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`mb-8 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-gray-600">
              {uploading ? `กำลังอัปโหลด: ${uploadProgress?.name || ''} (${uploadProgress?.pct || 0}%)` :
                'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
            </p>
            <p className="text-xs text-gray-400">รองรับ PDF, รูปภาพ, เอกสาร (สูงสุด 50MB)</p>
            <label className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold cursor-pointer hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
              {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* AI Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">รายการไฟล์</h2>
          <button
            onClick={handleAnalyzeAll}
            disabled={analyzing || !aiStats?.pending}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? '🤖 กำลังวิเคราะห์...' : '🤖 วิเคราะห์ทั้งหมด'}
          </button>
        </div>

        {/* File Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ชื่อไฟล์</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">ขนาด</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">วันที่</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">สถานะ AI</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {fileList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      ยังไม่มีไฟล์ที่อัปโหลด
                    </td>
                  </tr>
                ) : (
                  fileList.map((file) => (
                    <tr key={file.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {file.mime_type?.includes('pdf') ? '📄' :
                             file.mime_type?.includes('image') ? '🖼️' :
                             file.mime_type?.includes('text') ? '📝' : '📎'}
                          </span>
                          <span className="text-gray-800 font-medium truncate max-w-[200px]">
                            {file.original_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {file.file_size_formatted}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {new Date(file.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          file.ai_status === 'done' ? 'bg-green-100 text-green-700' :
                          file.ai_status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                          file.ai_status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {file.ai_status_th}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="ดาวน์โหลด"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                          </button>
                          {file.ai_status === 'pending' && (
                            <button
                              onClick={() => handleAnalyzeOne(file.id)}
                              className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600"
                              title="วิเคราะห์ด้วย AI"
                            >
                              🤖
                            </button>
                          )}
                          {file.ai_status === 'done' && (
                            <button
                              onClick={() => viewResult(file)}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600"
                              title="ดูผลวิเคราะห์"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"
                            title="ลบ"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.116m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back to main app link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
          >
            ← กลับไปหน้า PortfolioAI
          </a>
        </div>
      </div>

      {/* Result Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setResultModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">ผลวิเคราะห์: {resultModal.filename}</h3>
              <button onClick={() => setResultModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {resultModal.result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">สรุปภาพรวม</p>
                  <p className="text-sm text-gray-700">{resultModal.result.summary}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">คะแนนคุณภาพ:</p>
                  <span className={`text-lg font-bold ${
                    (resultModal.result.quality_score || 0) >= 80 ? 'text-green-600' :
                    (resultModal.result.quality_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {resultModal.result.quality_score}/100
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">ประเภทเอกสาร</p>
                  <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                    {resultModal.result.document_type}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">จุดเด่น/ประเด็นสำคัญ</p>
                  <ul className="list-disc list-inside space-y-1">
                    {(resultModal.result.key_points || []).map((pt, i) => (
                      <li key={i} className="text-sm text-gray-700">{pt}</li>
                    ))}
                  </ul>
                </div>
                {(resultModal.result.recommendations?.length > 0) && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">คำแนะนำ</p>
                    <ul className="list-disc list-inside space-y-1">
                      {resultModal.result.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-amber-700">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(resultModal.result.tags?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {resultModal.result.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 text-xs text-emerald-700 border border-emerald-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">ไม่มีข้อมูลผลวิเคราะห์</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}