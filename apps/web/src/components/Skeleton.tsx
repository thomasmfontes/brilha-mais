import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangle' | 'circle' | 'rounded';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangle' }) => {
    const variantClasses = {
        rectangle: 'rounded-md',
        circle: 'rounded-full',
        rounded: 'rounded-2xl',
    };

    return (
        <div 
            className={`
                bg-slate-200/60
                animate-shimmer 
                ${variantClasses[variant]} 
                ${className}
            `} 
        />
    );
};

export default Skeleton;
