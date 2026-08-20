import { useState, useCallback, useRef, useEffect } from 'react';
import Hero from './components/Hero';
import UploadSection from './components/UploadSection';
import ReviewGrid from './components/ReviewGrid';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import { analyzePortfolio, fetchAnalysisHistory, deleteAnalysis } from './services/aiService';
import { api } from './services/api';

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Review state
  const [reviews, setReviews] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const abortRef = useRef(false);

  // Check session on mount
  useEffect(() => {
    api.getMe().then(u => {
      if (u) setUser(u);
    }).finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setShowAdmin(false);
    setReviews([]);
  };

  // โหลดประวัติผลการวิเคราะห์ที่เคยทำไว้จาก FastAPI ทุกครั้งหลัง login
  useEffect(() => {
    if (!user) return;
    fetchAnalysisHistory()
      .then(items => setReviews(items))
      .catch(err => console.error('โหลดประวัติการวิเคราะห์ไม่สำเร็จ:', err));
  }, [user]);

  // ลบผลวิเคราะห์ออกจากประวัติ (ทั้งใน FastAPI DB และ state หน้าเว็บ)
  const handleDeleteReview = useCallback(async (review) => {
    if (!window.confirm(`ลบผลการวิเคราะห์ของ "${review.name}" ออกจากประวัติ?`)) return;
    try {
      if (review.analysis_id != null) {
        await deleteAnalysis(review.analysis_id);
      }
      setReviews(prev => prev.filter(r => r.id !== review.id));
      setToastMsg('ลบรายการเรียบร้อย');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      alert(err.message);
    }
  }, []);

  const handleFilesUpload = useCallback(async (files) => {
    setIsAnalyzing(true);
    abortRef.current = false;
    const total = files.length;
    let completed = 0;

    setUploadProgress({ total, completed: 0, currentFile: 'กำลังเริ่มต้น...' });

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;
      const file = files[i];
      setUploadProgress(prev => ({
        ...prev,
        currentFile: file.name,
      }));

      try {
        const result = await analyzePortfolio(file);

        const newReview = {
          id: result.analysis_id != null ? `hist-${result.analysis_id}` : Date.now() + i,
          analysis_id: result.analysis_id ?? null,
          name: result.student_name || file.name.replace(/\.[^/.]+$/, ''),
          role: result.role || 'นักเรียน',
          avatar: null,
          initials: (result.student_name || file.name).charAt(0).toUpperCase(),
          score: result.score,
          summary: result.summary,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendation: result.recommendation,
          reviewedDate: new Date().toISOString().split('T')[0],
          color: 'from-emerald-500 to-green-500',
          rawScore: result.rawScore,
          education: result.education,
          projects: result.projects,
        };

        setReviews(prev => [newReview, ...prev]);
        completed++;
        setUploadProgress(prev => ({ ...prev, completed }));
      } catch (error) {
        console.error(`Error analyzing ${file.name}:`, error);
        completed++;
        setUploadProgress(prev => ({ ...prev, completed }));
      }
    }

    setIsAnalyzing(false);
    setUploadProgress(null);

    if (completed > 0) {
      setToastMsg(`วิเคราะห์เสร็จ ${completed} จาก ${total} ไฟล์`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, []);

  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <div className="animate-pulse text-emerald-600 font-semibold">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show admin panel
  if (showAdmin) {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  // Main PortfolioAI app
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo/fte_Green.png" alt="FTE" className="h-8" />
            <span className="text-gray-900 font-bold hidden sm:inline">PortfolioAI</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAdmin(true)}
              className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              จัดการเอกสาร
            </button>
            <a href="#reviews" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors hidden sm:block">
              ผลการตรวจสอบ
            </a>
            <button
              onClick={scrollToUpload}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              อัปโหลด
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="ออกจากระบบ"
            >
              {user.username} ✕
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <Hero onStart={scrollToUpload} />

      {/* Upload */}
      <UploadSection
        onFilesUpload={handleFilesUpload}
        isAnalyzing={isAnalyzing}
        uploadProgress={uploadProgress}
      />

      {/* Reviews */}
      <ReviewGrid reviews={reviews} onDelete={handleDeleteReview} />

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-lg">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-emerald-700">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;