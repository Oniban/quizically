// Loading spinner component with sprite animation
import React from 'react';
import '../styles/loader.css'; // New CSS file for sprite animation

const Loader = ({ size = 'md' }) => {
  const sizes = {
    sm: { width: '68px', height: '49px' },
    md: { width: '272px', height: '197px' },
    lg: { width: '408px', height: '295px' },
  };

  return (
    <div className="flex items-center justify-center py-10">
      <div 
        className="loader-sprite"
        style={sizes[size]}
      ></div>
    </div>
  );
};

export default Loader;