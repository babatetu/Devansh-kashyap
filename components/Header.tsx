
import React from 'react';

interface HeaderProps {
  onLogoClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition" 
            onClick={onLogoClick}
          >
            <div className="bg-indigo-600 p-2 rounded-lg">
              <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              AdGenius<span className="text-indigo-600">AI</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
