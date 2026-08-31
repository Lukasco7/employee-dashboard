'use client';

import { useEffect, useState } from 'react';

import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import Products from '@/components/Products';
import DigitalCatalog from '@/components/DigitalCatalog';
import Employees from '@/components/Employees';
import Analytics from '@/components/Analytics';
import Sales from '@/components/Sales';
import Inventory from '@/components/Inventory';
import BarcodeScanner from '@/components/BarcodeScanner';
import CommunicationScheduling from '@/components/communicationScheduling';
import ShiftCalendar from '@/components/ShiftCalendar';
import ShiftSwap from '@/components/ShiftSwap';
import TimeOffRequests from '@/components/TimeOffRequests';
import LowStockAlerts from '@/components/LowStockAlerts';
import Customers from '@/components/Customers';

type Page =
  | 'login'
  | 'dashboard'
  | 'products'
  | 'catalog'
  | 'employees'
  | 'analytics'
  | 'sales'
  | 'inventory'
  | 'barcode'
  | 'communication'
  | 'calendar'
  | 'swap'
  | 'timeoff'
  | 'lowstock'
  | 'customers';

export default function Home() {
  const [currentPage, setCurrentPage] =
    useState<Page>('login');

  const [userEmail, setUserEmail] =
    useState('');

  const [userRole, setUserRole] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem('user');

      if (savedUser) {
        const user = JSON.parse(savedUser);

        if (user?.loggedIn) {
          setUserEmail(user.email || '');
          setUserRole(user.role || '');
          setCurrentPage('dashboard');
        }
      }
    } catch (error) {
      console.error(
        'Invalid saved user:',
        error
      );
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (
    email: string,
    role: string
  ) => {
    setUserEmail(email);
    setUserRole(role);

    localStorage.setItem(
      'user',
      JSON.stringify({
        email,
        role,
        loggedIn: true,
      })
    );

    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUserEmail('');
    setUserRole('');
    setCurrentPage('login');
  };

  const handleBackToDashboard = () =>
    setCurrentPage('dashboard');

  const handleProducts = () =>
    setCurrentPage('products');

  const handleCatalog = () =>
    setCurrentPage('catalog');

  const handleEmployees = () =>
    setCurrentPage('employees');

  const handleAnalytics = () =>
    setCurrentPage('analytics');

  const handleSales = () =>
    setCurrentPage('sales');

  const handleInventory = () =>
    setCurrentPage('inventory');

  const handleBarcode = () =>
    setCurrentPage('barcode');

  const handleCommunication = () =>
    setCurrentPage('communication');

  const handleCalendar = () =>
    setCurrentPage('calendar');

  const handleSwap = () =>
    setCurrentPage('swap');

  const handleTimeOff = () =>
    setCurrentPage('timeoff');

  const handleLowStock = () =>
    setCurrentPage('lowstock');

  const handleCustomers = () =>
    setCurrentPage('customers');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <>
      {currentPage === 'login' && (
        <Login onLogin={handleLogin} />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          user={userEmail}
          role={userRole}
          onLogout={handleLogout}
          onProducts={handleProducts}
          onCatalog={handleCatalog}
          onEmployees={handleEmployees}
          onAnalytics={handleAnalytics}
          onSales={handleSales}
          onInventory={handleInventory}
          onBarcode={handleBarcode}
          onCommunication={handleCommunication}
          onCalendar={handleCalendar}
          onSwap={handleSwap}
          onTimeOff={handleTimeOff}
          onLowStock={handleLowStock}
          onCustomers={handleCustomers}
        />
      )}

      {currentPage === 'products' && (
        <Products
          onBack={handleBackToDashboard}
          userRole={userRole}
        />
      )}

      {currentPage === 'catalog' && (
        <DigitalCatalog
          onBack={handleBackToDashboard}
        />
      )}

      {currentPage === 'employees' && (
        <Employees
          onBack={handleBackToDashboard}
          userRole={userRole}
        />
      )}

      {currentPage === 'analytics' && (
        <Analytics
          onBack={handleBackToDashboard}
        />
      )}

      {currentPage === 'sales' && (
        <Sales
          onBack={handleBackToDashboard}
          userRole={userRole}
          userEmail={userEmail}
        />
      )}

      {currentPage === 'inventory' && (
        <Inventory
          onBack={handleBackToDashboard}
        />
      )}

      {currentPage === 'barcode' && (
        <BarcodeScanner
          onBack={handleBackToDashboard}
          onProducts={handleProducts}
        />
      )}

      {currentPage === 'communication' && (
        <CommunicationScheduling
          onBack={handleBackToDashboard}
        />
      )}

      {currentPage === 'calendar' && (
        <ShiftCalendar
          onBack={handleBackToDashboard}
          userRole={userRole}
          userEmail={userEmail}
        />
      )}

      {currentPage === 'swap' && (
        <ShiftSwap
          onBack={handleBackToDashboard}
          userRole={userRole}
          userEmail={userEmail}
        />
      )}

      {currentPage === 'timeoff' && (
        <TimeOffRequests
          onBack={handleBackToDashboard}
          userRole={userRole}
          userEmail={userEmail}
        />
      )}

      {currentPage === 'lowstock' && (
        <LowStockAlerts
          onBack={handleBackToDashboard}
          onInventory={handleInventory}
          onProducts={handleProducts}
        />
      )}

      {currentPage === 'customers' && (
        <Customers
          onBack={handleBackToDashboard}
          onSales={handleSales}
        />
      )}
    </>
  );
}
