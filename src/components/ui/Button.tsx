import React from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', fullWidth = false, isLoading = false, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(
                    styles.button,
                    styles[variant],
                    styles[size],
                    fullWidth && styles.wFull,
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
