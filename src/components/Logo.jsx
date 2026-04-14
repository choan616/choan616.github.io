import React from 'react';

/**
 * Mmtm Logo Component
 * PC: logo.png (logo + text), Mobile: logo_m.png (logo only)
 */
export function Logo({ className = '' }) {
  return (
    <div className={`logo-container ${className}`}>
      <img src="/logo.png" alt="MMTM" className="logo-pc" />
      <img src="/logo_m.png" alt="MMTM" className="logo-mobile" />
    </div>
  );
}
