import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-green-500 font-bold animate-pulse">Cargando CAF Funes...</p>
    </div>
  );
};

export default LoadingSpinner;