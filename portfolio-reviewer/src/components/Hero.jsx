import { useState, useEffect } from 'react';

export default function Hero({ onStart }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-blob" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px] animate-blob-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[150px] animate-pulse-glow" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-60" />

      {/* Floating orbs */}
      <div className="absolute top-20 right-20 w-20 h-20 rounded-full border border-emerald-300/40 animate-float" />
      <div className="absolute bottom-32 left-16 w-14 h-14 rounded-full border border-green-300/30 animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-10 h-10 rounded-full bg-emerald-400/10 blur-sm animate-float-slow" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-emerald-700 font-medium">พร้อมให้บริการด้วย AI</span>
        </div>

        {/* Title */}
        <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-gray-900">ตรวจสอบพอร์ตโฟลิโอ</span>
          <br />
          <span className="text-gradient">ด้วย AI</span>
        </h1>

        {/* Subtitle */}
        <p className={`text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          อัปโหลด Portfolio PDF ของนักเรียน ให้ AI วิเคราะห์ทุกหน้าอย่างละเอียด
          <br className="hidden md:block" />
          พร้อมประเมินศักยภาพและให้คำแนะนำในการพัฒนา
        </p>

        {/* CTA Button */}
        <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <button
            onClick={onStart}
            className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-lg font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span>เริ่มตรวจสอบพอร์ตโฟลิโอ</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Stats */}
        <div className={`mt-16 flex flex-wrap justify-center gap-8 md:gap-16 transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { value: '500+', label: 'พอร์ตที่ตรวจสอบ' },
            { value: '98%', label: 'ความแม่นยำ' },
            { value: '4.9★', label: 'คะแนนจากผู้ใช้' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-emerald-600">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}