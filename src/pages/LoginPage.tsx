import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { authApi } from '../api/auth';
import styles from './LoginPage.module.css';
import authLayoutStyles from '../layouts/AuthLayout.module.css';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
});

type LoginSchema = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginSchema) => {
        try {
            const response = await authApi.login({
                email: data.email,
                password: data.password
            });

            // Assuming response has { message, token } from the backend Login endpoint
            login(response.token, { id: 'unknown', email: data.email, name: 'User' }); // using placeholder info since it's not sent, can decode token later
            toast.success('Welcome back!');
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Login failed');
        }
    };

    return (
        <>
            <div className={authLayoutStyles.header}>
                <div className={authLayoutStyles.logo}>
                    {/* Logo Icon is in Layout, but we can repeat or customize header here if needed. 
                Layout handles the icon. We just add title. */}
                </div>
                <h1 className={authLayoutStyles.title}>Welcome back</h1>
                <p className={authLayoutStyles.subtitle}>
                    Sign in to your account
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <Input
                    label="Email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    error={errors.password?.message}
                    {...register('password')}
                />

                <div className={styles.row}>
                    <Checkbox
                        label="Remember me"
                        {...register('rememberMe')}
                    />
                    <Link to="/forgot-password" className={styles.forgotLink}>
                        Forgot password?
                    </Link>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isSubmitting}
                >
                    Sign in
                </Button>
            </form>

            <div className={styles.registerLink}>
                Don't have an account?{' '}
                <Link to="/register">Sign up</Link>
            </div>
        </>
    );
};
