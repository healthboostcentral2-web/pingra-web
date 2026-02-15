import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'text' }) => {
  const baseClasses = "animate-pulse bg-slate-800";
  
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
};