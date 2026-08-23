
'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import Products from '@/components/Products';
import Employees from '@/components/Employees';
import Analytics from '@/components/Analytics';

type Page = 'login' | 'dashboard' | 'products' | 'employees' | 'analytics';

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
        <Dashboard
          user={userEmail}
          onLogout={handleLogout}
          onViewProducts={() => setCurrentPage('products')}
          onViewEmployees={() => setCurrentPage('employees')}
          onViewAnalytics={() => setCurrentPage('analytics')}
        />
      )}
      {currentPage === 'products' && (
        <Products onBack={handleBackToDashboard} />
      )}
      {currentPage === 'employees' && (
        <Employees onBack={handleBackToDashboard} />
      )}
      {currentPage === 'analytics' && (
        <Analytics onBack={handleBackToDashboard} />
      )}
    </>
  );
}
