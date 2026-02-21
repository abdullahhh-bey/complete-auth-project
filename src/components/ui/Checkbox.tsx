import React from 'react';
import clsx from 'clsx';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, ...props }, ref) => {
        return (
            <label className={clsx(styles.label, className)}>
                <input
                    type="checkbox"
                    ref={ref}
                    className={styles.input}
                    {...props}
                />
                {label}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
