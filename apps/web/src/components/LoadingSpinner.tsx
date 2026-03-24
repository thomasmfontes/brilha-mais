import React from 'react';

interface LoadingSpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'white' | 'current';
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className = ''
}) => {
    const sizeClasses = {
        xs: 'h-3 w-3 border-2',
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-[3px]',
        xl: 'h-12 w-12 border-[4px]'
    };

    const variantClasses = {
        primary: 'border-primary border-t-transparent',
        white: 'border-white/30 border-t-white',
        current: 'border-current border-t-transparent'
    };

    return (
        <div
            className={`
                rounded-full 
                animate-spin 
                ${sizeClasses[size]} 
                ${variantClasses[variant]} 
                ${className}
            `}
            role="status"
            aria-label="Carregando"
        />
    );
};

export default LoadingSpinner;
