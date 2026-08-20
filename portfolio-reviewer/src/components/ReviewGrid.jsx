import { useState, useMemo } from 'react';
import ReviewCard from './ReviewCard';

export default function ReviewGrid({ reviews, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score-desc');

  const filtered = useMemo(() => {
    let result = [...reviews];

    // Filter
    if (filter === 'high') result = result.filter(r => r.score >= 90);
    else if (filter === 'medium') result = result.filter(r => r.score >= 80 && r.score < 90);
    else if (filter === 'low') result = result.filter(r => r.score < 80);

    // Sort
    if (sortBy === 'score-desc') result.sort((a, b) => b.score - a.score);
    else if (sortBy === 'score-asc') result.sort((a, b) => a.score - b.score);
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    else if (sortBy === 'date') result.sort((a, b) => new Date(b.reviewedDate) - new Date(a.reviewedDate));

    return result;
  }, [reviews, filter, sortBy]);

  const filters = [
    { key: 'all', label: 'ทั้งหมด', count: reviews.length },
    { key: 'high', label: 'ยอดเยี่ยม', count: reviews.filter(r => r.score >= 90).length },
    { key: 'medium', label: 'ดีมาก', count: reviews.filter(r => r.score >= 80 && r.score < 90).length },
    { key: 'low', label: 'ปรับปรุง', count: reviews.filter(r => r.score < 80).length },
  ];

  return (
    <section id="reviews" className="relative py-24 md:py-32 bg-white">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            รายชื่อผู้ที่ถูกตรวจสอบ
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            รายการพอร์ตโฟลิโอที่ผ่านการวิเคราะห์ด้วย AI เรียงตามคะแนนและความสามารถ
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-10 mb-10 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${filter === f.key
                    ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }
                `}
              >
                {f.label}
                <span className="ml-1.5 opacity-60">({f.count})</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="score-desc" className="bg-white">คะแนนสูงสุด</option>
              <option value="score-asc" className="bg-white">คะแนนต่ำสุด</option>
              <option value="name" className="bg-white">ชื่อ A-Z</option>
              <option value="date" className="bg-white">วันที่ล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            {reviews.length === 0 ? (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-200 mb-6">
                  <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">ยังไม่มีผลการตรวจสอบ</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  อัปโหลด Portfolio PDF ของนักเรียนเพื่อให้ AI วิเคราะห์และแสดงผลที่นี่
                </p>
                <button
                  onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  อัปโหลดพอร์ตโฟลิโอ
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">ไม่พบผลลัพธ์ที่ตรงกับเงื่อนไข</p>
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 text-sm text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((review, i) => (
              <ReviewCard key={review.id} review={review} index={i} onDelete={onDelete} />
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'ทั้งหมด', value: reviews.length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-500' },
            { label: 'คะแนนเฉลี่ย', value: reviews.length > 0 ? Math.round(reviews.reduce((a, r) => a + r.score, 0) / reviews.length) : '-', icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color: 'text-yellow-500' },
            { label: 'ความถนัดสูงสุด', value: '—', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-emerald-500' },
            { label: 'ตำแหน่งยอดนิยม', value: '—', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5', color: 'text-green-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200">
              <svg className={`w-5 h-5 ${stat.color} mx-auto mb-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
              </svg>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}