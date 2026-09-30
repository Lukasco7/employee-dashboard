'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

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

  const [productToAdd, setProductToAdd] = useState<{
    id: number;
    name: string;
    category: string;
    price: number | string;
    stock: number;
    barcode: string | null;
  } | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSavedUser = async () => {
      try {
        const savedUser =
          localStorage.getItem('user');

        if (!savedUser) {
          return;
        }

        const savedUserData =
          JSON.parse(savedUser);

        if (
          !savedUserData?.loggedIn ||
          cancelled
        ) {
          return;
        }

        /*
         * Do not trust the role stored in localStorage.
         *
         * The browser can contain an old role after an
         * administrator changes the user's role.
         *
         * Instead, get the currently authenticated
         * Supabase user and load the current role from:
         *
         * auth user -> users.role_id -> roles.name
         */

        const {
          data: {
            user: authenticatedUser,
          },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!authenticatedUser) {
          localStorage.removeItem('user');

          if (!cancelled) {
            setUserEmail('');
            setUserRole('');
            setCurrentPage('login');
          }

          return;
        }

        const {
          data: userData,
          error: userError,
        } = await supabase
          .from('users')
          .select('id, email, role_id')
          .eq('id', authenticatedUser.id)
          .maybeSingle();

        if (userError) {
          throw userError;
        }

        if (!userData?.role_id) {
          await supabase.auth.signOut();

          localStorage.removeItem('user');

          if (!cancelled) {
            setUserEmail('');
            setUserRole('');
            setCurrentPage('login');
          }

          return;
        }

        const {
          data: roleData,
          error: roleError,
        } = await supabase
          .from('roles')
          .select('id, name')
          .eq('id', userData.role_id)
          .maybeSingle();

        if (roleError) {
          throw roleError;
        }

        if (!roleData?.name) {
          await supabase.auth.signOut();

          localStorage.removeItem('user');

          if (!cancelled) {
            setUserEmail('');
            setUserRole('');
            setCurrentPage('login');
          }

          return;
        }

        if (cancelled) {
          return;
        }

        const currentEmail =
          authenticatedUser.email ||
          userData.email ||
          savedUserData.email ||
          '';

        const currentRole =
          roleData.name;

        setUserEmail(currentEmail);
        setUserRole(currentRole);

        /*
         * Update localStorage with the CURRENT role.
         * This prevents the old role from remaining in
         * the browser after the database role changes.
         */
        localStorage.setItem(
          'user',
          JSON.stringify({
            email: currentEmail,
            role: currentRole,
            loggedIn: true,
          })
        );

        setCurrentPage('dashboard');
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Unable to restore authenticated user:',
          error
        );

        localStorage.removeItem('user');
        setUserEmail('');
        setUserRole('');
        setCurrentPage('login');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void restoreSavedUser();

    return () => {
      cancelled = true;
    };
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
    void supabase.auth.signOut();

    localStorage.removeItem('user');

    setUserEmail('');
    setUserRole('');
    setProductToAdd(null);
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

  const handleSales = () => {
    setProductToAdd(null);
    setCurrentPage('sales');
  };

  const handleInventory = () =>
    setCurrentPage('inventory');

  const handleBarcode = () =>
    setCurrentPage('barcode');

  const handleAddScannedProductToSale = (
    product: {
      id: number;
      name: string;
      category: string;
      price: number | string;
      stock: number;
      barcode: string | null;
    }
  ) => {
    setProductToAdd(product);
    setCurrentPage('sales');
  };

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
          onBarcode={handleBarcode}
          userRole={userRole}
          userEmail={userEmail}
          productToAdd={productToAdd}
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
          onAddToSale={
            handleAddScannedProductToSale
          }
          autoStartCamera
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