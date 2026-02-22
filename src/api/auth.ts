export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5034/api';

export const authApi = {
    async register(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Registration failed');
        }

        return response.text();
    },

    async login(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Invalid credentials');
        }

        return response.json();
    },

    async forgotPassword(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to send reset link');
        }

        return response.text();
    },

    async resetPassword(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to reset password');
        }

        return response.text();
    }
};
