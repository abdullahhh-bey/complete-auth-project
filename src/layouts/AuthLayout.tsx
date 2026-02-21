import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import styles from './AuthLayout.module.css';

export const AuthLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className={styles.container}>
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
                <ThemeToggle />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className={styles.card}
                >
                    <div className={styles.header}>
                        <div className={styles.logo}>
                            <ShieldCheck size={28} />
                        </div>
                    </div>
                    <Outlet />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
