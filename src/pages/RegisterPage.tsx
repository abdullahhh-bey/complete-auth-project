import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { PasswordStrength } from '../components/auth/PasswordStrength';
import styles from './RegisterPage.module.css';
import authLayoutStyles from '../layouts/AuthLayout.module.css';

const registerSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterSchema = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [pwdScore, setPwdScore] = useState<0 | 1 | 2 | 3 | 4>(0);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
    });

    const password = watch('password');

    // Simple password strength calculator
    React.useEffect(() => {
        if (!password) {
            setPwdScore(0);
            return;
        }
        let score = 0;
        if (password.length > 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        // Cap at 4
        setPwdScore(Math.min(4, Math.max(1, score)) as any);
    }, [password]);

    const onSubmit = async (data: RegisterSchema) => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // Simulate API call
            console.log('Registering', data);
            toast.success('Account created successfully!');
            navigate('/login');
        } catch (error) {
            toast.error('Registration failed. Please try again.');
        }
    };

    return (
        <>
            <div className={authLayoutStyles.header}>
                <h1 className={authLayoutStyles.title}>Create an account</h1>
                <p className={authLayoutStyles.subtitle}>
                    Enter your details to get started
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <Input
                    label="Full Name"
                    placeholder="John Doe"
                    error={errors.fullName?.message}
                    {...register('fullName')}
                />

                <Input
                    label="Email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <div>
                    <Input
                        label="Password"
                        type="password"
                        placeholder="Create a password"
                        error={errors.password?.message}
                        {...register('password')}
                    />
                    <PasswordStrength score={pwdScore} />
                </div>

                <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm your password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                <div style={{ marginBottom: errors.terms ? '0' : '0.5rem' }}>
                    <Checkbox
                        label={<span className={styles.termsLabel}>I agree to the Terms and Conditions</span>}
                        className={styles.terms}
                        {...register('terms')}
                    />
                </div>

                {errors.terms && <span style={{ color: 'var(--color-destructive)', fontSize: '0.75rem', marginTop: '-0.25rem', display: 'block' }}>{errors.terms.message}</span>}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                >
                    Sign up
                </Button>
            </form>

            <div className={styles.loginLink}>
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
            </div>
        </>
    );
};
