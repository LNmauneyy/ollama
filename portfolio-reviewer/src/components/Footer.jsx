export default function Footer() {
  return (
    <footer className="relative py-12 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <span className="text-gray-900 font-bold text-lg">PortfolioAI</span>
            </div>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
              ระบบตรวจสอบพอร์ตโฟลิโอด้วย AI ที่ช่วยให้คุณเข้าใจจุดแข็งและโอกาสในการพัฒนาของพอร์ตโฟลิโอของคุณ
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4 text-sm">เมนู</h4>
            <ul className="space-y-2">
              {['หน้าแรก', 'อัปโหลด', 'ผลการตรวจสอบ'].map((item, i) => (
                <li key={i}>
                  <a href={i === 0 ? '#' : i === 1 ? '#upload' : '#reviews'} className="text-gray-500 text-sm hover:text-emerald-600 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4 text-sm">ติดต่อ</h4>
            <ul className="space-y-2">
              {['อีเมล', 'โทรศัพท์', 'Line'].map((item, i) => (
                <li key={i}>
                  <span className="text-gray-500 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8" />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            © 2026 PortfolioAI. สงวนลิขสิทธิ์.
          </p>
          <div className="flex items-center gap-4">
            {['นโยบายความเป็นส่วนตัว', 'ข้อกำหนดการใช้งาน'].map((item, i) => (
              <a key={i} href="#" className="text-gray-500 text-sm hover:text-emerald-600 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}