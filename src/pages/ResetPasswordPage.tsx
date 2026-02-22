import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authApi } from '../api/auth';
import styles from './LoginPage.module.css'; // Reuse login styles
import authLayoutStyles from '../layouts/AuthLayout.module.css';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetSchema = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            // In a real app, maybe redirect or show error
            toast.error('Invalid or missing reset token/email.');
        }
    }, [token, email]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetSchema>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetSchema) => {
        if (!token || !email) return;
        try {
            await authApi.resetPassword({
                email,
                resetToken: token,
                password: data.password
            });
            toast.success('Password reset successfully! Please login with your new password.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password.');
        }
    };

    return (
        <>
            <div className={authLayoutStyles.header}>
                <h1 className={authLayoutStyles.title}>Set new password</h1>
                <p className={authLayoutStyles.subtitle}>
                    Your new password must be different from previous used passwords.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <Input
                    label="New Password"
                    type="password"
                    placeholder="New password"
                    error={errors.password?.message}
                    {...register('password')}
                />

                <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={!token}
                >
                    Reset Password
                </Button>
            </form>

            <div className={styles.registerLink}>
                <Link to="/login">Back to Sign in</Link>
            </div>
        </>
    );
};
