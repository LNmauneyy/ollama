// Same-origin path — the Express server proxies these to the Python AI
// backend (see server/ai.js). Never call the Python API directly from the
// browser: it isn't reachable from outside the server's own host/network.
const API_URL = '/api';

/**
 * Analyze a portfolio PDF file using the FastAPI backend
 * @param {File} file - The uploaded PDF file
 * @returns {Promise<Object>} Structured review result
 */
export async function analyzePortfolio(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/analyze-portfolio`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        typeof errorData.detail === 'string'
          ? errorData.detail
          : `API error: ${response.status}`,
      );
    }

    const data = await response.json();
    return transformApiResponse(data);
  } catch (error) {
    console.error('API analysis error:', error);
    // Fallback result
    return {
      score: 75,
      summary: 'ไม่สามารถเชื่อมต่อ API ได้ — ' + error.message,
      strengths: ['รอการเชื่อมต่อ API'],
      weaknesses: ['รอการเชื่อมต่อ API'],
      recommendation: 'กรุณาลองใหม่อีกครั้ง หรือตรวจสอบว่าระบบวิเคราะห์ AI (Python backend) กำลังทำงานอยู่',
      role: 'ผู้สมัคร',
      student_name: '',
      education: {},
      projects: [],
    };
  }
}

/**
 * Fetch analysis history from the FastAPI backend and transform
 * each stored result into the review-card format used by the UI.
 * @param {number} limit - Max number of history items (newest first)
 * @returns {Promise<Array>} Review objects ready for <ReviewGrid />
 */
export async function fetchAnalysisHistory(limit = 50) {
  const res = await fetch(`${API_URL}/history?limit=${limit}`, { credentials: 'include' });
  if (!res.ok) throw new Error('โหลดประวัติการวิเคราะห์ไม่สำเร็จ');
  const summaries = await res.json();

  // Fetch each full result in parallel; skip ones that fail
  const records = await Promise.all(
    summaries.map((s) =>
      fetch(`${API_URL}/history/${s.analysis_id}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ),
  );

  return records.filter(Boolean).map((record) => {
    const t = transformApiResponse(record.result);
    const name = t.student_name || record.student_name || 'ไม่ระบุชื่อ';
    return {
      id: `hist-${record.analysis_id}`,
      analysis_id: record.analysis_id,
      name,
      role: t.role,
      avatar: null,
      initials: name.charAt(0).toUpperCase(),
      score: t.score,
      summary: t.summary,
      strengths: t.strengths,
      weaknesses: t.weaknesses,
      recommendation: t.recommendation,
      reviewedDate: (record.created_at || '').split(' ')[0] || '',
      color: 'from-emerald-500 to-green-500',
      rawScore: t.rawScore,
      education: t.education,
      projects: t.projects,
    };
  });
}

/**
 * Delete one stored analysis from the FastAPI history database
 * @param {number} analysisId
 */
export async function deleteAnalysis(analysisId) {
  const res = await fetch(`${API_URL}/history/${analysisId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('ลบประวัติการวิเคราะห์ไม่สำเร็จ');
  return res.json();
}

/**
 * Transform the backend API response into the frontend review format
 */
function transformApiResponse(data) {
  // Calculate score from readiness_score
  const readinessMap = {
    'ดีเยี่ยม': 92,
    'ดีมาก': 82,
    'ผ่านเกณฑ์': 70,
  };
  const score = readinessMap[data.expert_evaluation?.readiness_score] || 78;

  // Collect all strengths
  const techSkills = [
    ...(data.technical_skills_breakdown?.programming_languages || []),
    ...(data.technical_skills_breakdown?.hardware_and_robotics || []),
    ...(data.technical_skills_breakdown?.ai_and_software_platforms || []),
  ];
  const evalStrengths = data.expert_evaluation?.strengths || [];
  const softSkills = data.soft_skills_and_roles || [];

  const strengths = [...new Set([...evalStrengths, ...techSkills, ...softSkills])].slice(0, 8);

  // Build summary from education
  const eduParts = [
    data.student_name ? `📋 ${data.student_name}` : '',
    data.education?.school ? `🏫 ${data.education.school}` : '',
    data.education?.program ? `📚 ${data.education.program}` : '',
    data.education?.gpa_overall ? `⭐ GPA ${data.education.gpa_overall}` : '',
  ].filter(Boolean);

  const summary = eduParts.length > 0
    ? eduParts.join(' | ')
    : 'วิเคราะห์พอร์ตโฟลิโอเรียบร้อย';

  // Build project list description
  const projectCount = data.key_projects_analysis?.length || 0;
  const projectSummary = projectCount > 0
    ? `มีโปรเจกต์เด่น ${projectCount} โปรเจกต์`
    : '';

  return {
    score,
    summary: [summary, projectSummary].filter(Boolean).join(' — '),
    strengths,
    weaknesses: [],
    recommendation: data.expert_evaluation?.final_recommendation || 'วิเคราะห์เสร็จสมบูรณ์',
    role: 'นักเรียน',
    student_name: data.student_name || '',
    education: data.education || {},
    projects: data.key_projects_analysis || [],
    rawScore: data.expert_evaluation?.readiness_score || '',
    analysis_id: data.analysis_id ?? null,
  };
}