import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

// Helper to parse JWT
const parseJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

const extractUserFromToken = (token: string, fallbackUser?: User): User => {
    const claims = parseJwt(token);
    if (!claims) return fallbackUser || { id: '', email: '', name: 'Unknown' };

    const id = claims.nameid || claims.sub || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || fallbackUser?.id || "";
    const name = claims.name || claims.unique_name || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || fallbackUser?.name || "User";
    const email = claims.email || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || fallbackUser?.email || "";

    return { id, email, name };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token and user on mount
        const token = Cookies.get('authToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                let parsedUser = JSON.parse(storedUser);
                // If it's the old 'unknown' id, try to fix it from token
                if (parsedUser.id === 'unknown' || !parsedUser.id) {
                    parsedUser = extractUserFromToken(token, parsedUser);
                    localStorage.setItem('user', JSON.stringify(parsedUser));
                }
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user data", e);
                logout();
            }
        }
        setIsLoading(false);

        // Listen for 401 events from Axios/Fetch
        const handleUnauthorized = () => logout();
        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    const login = (token: string, userData: User) => {
        // Decode token to get real ID
        const realUserData = extractUserFromToken(token, userData);

        // Store token in cookie with domain parameter stripped, so it defaults to the current domain (localhost) 
        // which shares it across ports. We set a standard name 'authToken'.
        Cookies.set('authToken', token, { path: '/' });

        // Let's also store in localStorage as a fallback just in case other things use it
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(realUserData));
        setUser(realUserData);
    };

    const logout = () => {
        Cookies.remove('authToken', { path: '/' });
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
