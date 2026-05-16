// Performance placeholder page
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Business', score: 85 },
  { name: 'Sci-Tech', score: 72 },
  { name: 'India', score: 90 },
  { name: 'Sports', score: 65 },
  { name: 'Literature', score: 45 },
];

const Performance = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Performance</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
          Visualize your strengths and weaknesses across different genres.
        </p>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-sm text-gray-500 mt-8 italic text-center">
          More detailed analysis across difficulty levels and formats coming soon!
        </p>
      </div>
    </div>
  );
};

export default Performance;
