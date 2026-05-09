'use client';

import { ReactNode, HTMLAttributes } from 'react';

interface GlowCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  goldBorder?: boolean;
}

/**
 * Enhanced GlowCard - Supports standard div props while maintaining
 * the neat UI style.
 */
export default function GlowCard({ children, className = '', goldBorder = false, ...props }: GlowCardProps) {
  return (
    <div
      className={`glow-card ${goldBorder ? 'border-primary-500/30' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
