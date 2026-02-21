import React, { useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = 'text', label, error, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';

        const togglePassword = () => {
            setShowPassword((prev) => !prev);
        };

        return (
            <div className={styles.container}>
                {label && <label className={styles.label} htmlFor={props.id}>{label}</label>}
                <div className={styles.inputWrapper}>
                    <input
                        ref={ref}
                        type={isPassword ? (showPassword ? 'text' : 'password') : type}
                        className={clsx(styles.input, error && styles.error, className)}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            className={styles.toggleButton}
                            onClick={togglePassword}
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                </div>
                {error && <span className={styles.errorMessage}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
