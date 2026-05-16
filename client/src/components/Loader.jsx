// Loading spinner component
import React from 'react';

const Loader = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex justify-center items-center py-10">
      <div className={`${sizes[size]} animate-spin rounded-full border-indigo-600 border-t-transparent`}></div>
    </div>
  );
};

export default Loader;
