import React from 'react';

interface NomaticLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const NomaticLogo: React.FC<NomaticLogoProps> = ({ 
  size = 'md', 
  className = '',
  withGlow = true
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div 
      className={`rounded-full bg-[#1ed760] flex items-center justify-center text-black flex-shrink-0 select-none transition-transform duration-200 ${sizeMap[size]} ${
        withGlow ? 'shadow-lg shadow-[#1ed760]/25' : ''
      } ${className}`}
      aria-label="Nomatic Music logo"
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-[58%] h-[58%] fill-none stroke-current" 
        strokeWidth="15" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M27 73 V27 L73 73 V27" />
      </svg>
    </div>
  );
};
