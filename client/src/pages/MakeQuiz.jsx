// Make Quiz placeholder page
import React from 'react';

const MakeQuiz = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <p className="text-lg mb-6">Use this form to build a custom quiz for the club.</p>
        
        <div className="space-y-4 opacity-50 pointer-events-none">
          <div>
            <label className="block text-sm font-medium mb-1">Quiz Title</label>
            <input type="text" className="w-full p-2 border rounded-lg" placeholder="Enter title..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <select className="w-full p-2 border rounded-lg"><option>Select...</option></select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select className="w-full p-2 border rounded-lg"><option>Medium</option></select>
            </div>
          </div>
          <p className="text-gray-500 italic mt-8 text-center">
            Form logic for adding questions and saving to database coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MakeQuiz;
