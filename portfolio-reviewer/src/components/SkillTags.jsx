const skillColors = {
  // UX / Design → green
  'UX Research': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Figma': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Design System': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Prototyping': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'User Testing': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // Frontend
  'React': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'TypeScript': 'bg-blue-50 text-blue-700 border-blue-200',
  // Backend
  'Node.js': 'bg-green-50 text-green-700 border-green-200',
  'PostgreSQL': 'bg-green-50 text-green-700 border-green-200',
  'API Design': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'DevOps': 'bg-red-50 text-red-700 border-red-200',
  // Data
  'Python': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Machine Learning': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'TensorFlow': 'bg-orange-50 text-orange-700 border-orange-200',
  'Data Visualization': 'bg-teal-50 text-teal-700 border-teal-200',
  'Statistics': 'bg-sky-50 text-sky-700 border-sky-200',
  // Design
  'Branding': 'bg-pink-50 text-pink-700 border-pink-200',
  'Typography': 'bg-rose-50 text-rose-700 border-rose-200',
  'Illustration': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Photoshop': 'bg-green-50 text-green-700 border-green-200',
  'After Effects': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // Product
  'Product Strategy': 'bg-amber-50 text-amber-700 border-amber-200',
  'Agile': 'bg-lime-50 text-lime-700 border-lime-200',
  'Data Analysis': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'User Stories': 'bg-sky-50 text-sky-700 border-sky-200',
  'Stakeholder Management': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // Mobile
  'Flutter': 'bg-sky-50 text-sky-700 border-sky-200',
  'React Native': 'bg-blue-50 text-blue-700 border-blue-200',
  'Swift': 'bg-orange-50 text-orange-700 border-orange-200',
  'Firebase': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'App Architecture': 'bg-green-50 text-green-700 border-green-200',
  // DevOps
  'Kubernetes': 'bg-blue-50 text-blue-700 border-blue-200',
  'Docker': 'bg-sky-50 text-sky-700 border-sky-200',
  'AWS': 'bg-orange-50 text-orange-700 border-orange-200',
  'Terraform': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Monitoring': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Security': 'bg-red-50 text-red-700 border-red-200',
  // Content
  'Content Writing': 'bg-pink-50 text-pink-700 border-pink-200',
  'SEO': 'bg-green-50 text-green-700 border-green-200',
  'Copywriting': 'bg-rose-50 text-rose-700 border-rose-200',
  'Content Strategy': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Social Media': 'bg-sky-50 text-sky-700 border-sky-200',
  // AI
  'Deep Learning': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'NLP': 'bg-green-50 text-green-700 border-green-200',
  'PyTorch': 'bg-red-50 text-red-700 border-red-200',
  'Computer Vision': 'bg-teal-50 text-teal-700 border-teal-200',
  'MLOps': 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const defaultColor = 'bg-gray-50 text-gray-600 border-gray-200';

export default function SkillTags({ skills, variant = 'strength' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, i) => (
        <span
          key={i}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
            transition-all duration-200 hover:scale-105
            ${skillColors[skill] || defaultColor}
          `}
        >
          {variant === 'strength' ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {skill}
        </span>
      ))}
    </div>
  );
}