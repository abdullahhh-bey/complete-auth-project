import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authApi } from '../api/auth';
import styles from './LoginPage.module.css'; // Reuse login styles
import authLayoutStyles from '../layouts/AuthLayout.module.css';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordSchema>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordSchema) => {
        try {
            await authApi.forgotPassword({ email: data.email });
            toast.success('If an account exists, a reset email has been sent.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send request.');
        }
    };

    return (
        <>
            <div className={authLayoutStyles.header}>
                <h1 className={authLayoutStyles.title}>Forgot password?</h1>
                <p className={authLayoutStyles.subtitle}>
                    No worries, we'll send you reset instructions.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <Input
                    label="Email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                >
                    Send Reset Link
                </Button>
            </form>

            <div className={styles.registerLink}>
                <Link to="/login">Back to Sign in</Link>
            </div>
        </>
    );
};
