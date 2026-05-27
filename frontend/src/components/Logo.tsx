import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <img
      src="/logo.png"
      alt="Vellune Logo"
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain', 
        borderRadius: '16%', 
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
      }}
    />
  );
};

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '', showText = true }) => {
  return (
    <div className={`logo-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <LogoIcon size={size} />
      {showText && <span className="logo-text">Vellune</span>}
    </div>
  );
};
