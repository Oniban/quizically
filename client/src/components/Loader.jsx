import React from 'react';
import '../styles/loader.css';

const tips = {
  session: 'Your streak comes from completed quizzes, not signing in.',
  page: 'Browse quizzes on Home, or revisit your saved Past Attempts.',
  quiz: 'Read the whole question before choosing your answer.',
  stats: 'Completed attempts help you spot the topics to practise next.',
};

const Loader = ({ size = 'md', context = 'page', message, tip }) => (
  <figure className="skater-loader text-indigo-600 dark:text-indigo-400" role="status" aria-live="polite" aria-atomic="true">
    <svg className={`skater-scene skater-scene--${size}`} viewBox="0 0 280 190" aria-hidden="true" focusable="false">
      <ellipse cx="140" cy="165" rx="104" ry="13" fill="currentColor" opacity=".08" />
      <path d="M45 166 Q130 182 235 160 M65 174 Q135 185 207 174" fill="none" stroke="currentColor" strokeWidth="2" opacity=".25" />
      <g className="skater-figure" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="145" cy="43" r="12" fill="currentColor" stroke="none" />
        <path d="M135 31 Q149 19 158 36" fill="none" strokeWidth="5" />
        <path d="M143 61 L130 98 L155 105 L150 62 Z" fill="currentColor" strokeWidth="3" />
        <path d="M130 96 L112 119 Q139 131 164 116 L155 101" fill="currentColor" stroke="none" />
        <path d="M144 68 L114 78 L87 65 M149 67 L174 58 L194 38" fill="none" strokeWidth="7" />
        <path d="M135 123 L142 150 L163 155 M150 123 L174 127 L203 111" fill="none" strokeWidth="7" />
        <path d="M138 161 L170 161 M200 116 L212 103" fill="none" strokeWidth="3" />
      </g>
      <g className="skater-sparkle" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5">
        <path d="M57 83 v12 M51 89 h12 M222 65 v10 M217 70 h10" />
      </g>
    </svg>
    <figcaption className="text-center max-w-sm px-4">
      <p className="font-semibold">{message || (context === 'session' ? 'Checking your session...' : 'Loading...')}</p>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{tip || tips[context] || tips.page}</p>
    </figcaption>
  </figure>
);

export default Loader;
