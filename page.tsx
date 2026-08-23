'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import Products from '@/components/Products';

type Page = 'login' | 'dashboard' | 'products';

export default function Home() {
    const [currentPage, setCurrentPage] = useState<Page>('login');
    const [userEmail, setUserEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.loggedIn) {
                setUserEmail(user.email);
                setCurrentPage('dashboard');
            }
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (email: string) => {
        setUserEmail(email);
        setCurrentPage('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUserEmail('');
        setCurrentPage('login');
    };

    const handleViewProducts = () => {
        setCurrentPage('products');
    };

    const handleBackToDashboard = () => {
        setCurrentPage('dashboard');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <>
            {currentPage === 'login' && <Login onLogin={handleLogin} />}
            {currentPage === 'dashboard' && (
                <div>
                    <Dashboard user={userEmail} onLogout={handleLogout} />
                    <div
                        className="fixed bottom-8 right-8 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition"
                        onClick={handleViewProducts}
                    >
                        View Products
                    </div>
                </div>
            )}
            {currentPage === 'products' && (
                <Products onBack={handleBackToDashboard} />
            )}
        </>
    );
}