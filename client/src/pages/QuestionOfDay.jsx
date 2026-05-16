// Question of the Day placeholder page
import React from 'react';

const QuestionOfDay = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Question of the Day</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md space-y-6">
        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-l-4 border-indigo-600">
          <p className="text-xl font-medium italic">"Which 19th-century artist painted 'The Starry Night' while in an asylum in Saint-Rémy-de-Provence?"</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold">AI Explanation</h2>
          <p className="text-gray-600 dark:text-gray-400">
            The Anthropic Claude AI will explain the historical context, trivia, and logical steps to arrive at the answer for each daily question.
          </p>
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg italic">
            "To solve this, look for keywords like '19th-century', 'Starry Night', and 'asylum'..."
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionOfDay;
