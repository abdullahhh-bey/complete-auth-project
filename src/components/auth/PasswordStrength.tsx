import React from 'react';
import clsx from 'clsx';
import styles from './PasswordStrength.module.css';

interface PasswordStrengthProps {
    score: 0 | 1 | 2 | 3 | 4; // 0: None, 1: Weak, 2: Fair, 3: Good, 4: Strong (Example mapping)
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ score }) => {
    // Logic to determine level based on score (0-4)
    // Let's simplify: 0=empty, 1-2=weak, 3=medium, 4=strong

    let strengthClass = '';
    let label = '';

    if (score === 0) {
        label = '';
    } else if (score < 3) {
        strengthClass = styles.weak;
        label = 'Weak';
    } else if (score === 3) {
        strengthClass = styles.medium;
        label = 'Medium';
    } else {
        strengthClass = styles.strong;
        label = 'Strong';
    }

    return (
        <div className={clsx(styles.container, strengthClass)}>
            <div className={styles.bars}>
                {[1, 2, 3, 4].map((index) => (
                    <div
                        key={index}
                        className={clsx(styles.bar, index <= score && styles.active)}
                    />
                ))}
            </div>
            {label && <span className={styles.text}>{label}</span>}
        </div>
    );
};
