'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface DashboardProps {
  user: string;
  role: string;
  onLogout: () => void;
  onProducts: () => void;
  onCatalog: () => void;
  onEmployees: () => void;
  onAnalytics: () => void;
  onSales: () => void;
  onInventory: () => void;
  onBarcode: () => void;
  onCommunication: () => void;
  onCalendar: () => void;
  onSwap: () => void;
  onTimeOff: () => void;
  onLowStock: () => void;
  onCustomers: () => void;
}

export default function Dashboard({
  user,
  role,
  onLogout,
  onProducts,
  onCatalog,
  onEmployees,
  onAnalytics,
  onSales,
  onInventory,
  onBarcode,
  onCommunication,
  onCalendar,
  onSwap,
  onTimeOff,
  onLowStock,
  onCustomers,
}: DashboardProps) {
  const [productCount, setProductCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [totalUnitsSold, setTotalUnitsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setDashboardError('');

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Authentication: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error(
          'Your login session is no longer available. Please log in again.'
        );
      }

      console.log('Dashboard session user:', session.user.email);

      const {
        count: products,
        error: productsError,
      } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) {
        console.error('PRODUCTS ERROR MESSAGE:', productsError.message);
        console.error('PRODUCTS ERROR DETAILS:', productsError.details);
        console.error('PRODUCTS ERROR HINT:', productsError.hint);
        console.error('PRODUCTS ERROR CODE:', productsError.code);
        throw new Error(`Products: ${productsError.message}`);
      }

      const {
        count: employees,
        error: employeesError,
      } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      if (employeesError) {
        throw new Error(`Employees: ${employeesError.message}`);
      }

      const {
        data: sales,
        error: salesError,
      } = await supabase
        .from('sales')
        .select('amount, quantity');

      if (salesError) {
        throw new Error(`Sales: ${salesError.message}`);
      }

      const totalRevenue = (sales || []).reduce(
        (total, sale) => total + Number(sale.amount || 0),
        0
      );

      const unitsSold = (sales || []).reduce(
        (total, sale) => total + Number(sale.quantity || 0),
        0
      );

      setProductCount(products || 0);
      setEmployeeCount(employees || 0);
      setRevenue(totalRevenue);
      setTotalUnitsSold(unitsSold);
    } catch (error) {
      console.error('Error loading dashboard:', error);

      if (error instanceof Error) {
        setDashboardError(error.message);
      } else {
        setDashboardError('Unable to load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Employee Dashboard
            </h1>
            <p className="text-sm text-blue-600 font-semibold mt-1">
              Role: {role || 'Unknown Role'}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition cursor-pointer font-medium"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {dashboardError && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            <p className="font-semibold">Dashboard Error</p>
            <p className="text-sm mt-1">{dashboardError}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, {user}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Here's your dashboard overview for today.
          </p>
          <p className="text-sm text-blue-600 font-semibold mt-2">
            Signed in as: {role || 'Unknown Role'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            type="button"
            onClick={onProducts}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <div className="text-gray-500 text-sm font-semibold mb-2">
              PRODUCTS
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {loading ? '...' : productCount}
            </div>
            <p className="text-gray-600 text-sm mt-2">
              Products in inventory
            </p>
            <p className="text-blue-600 text-sm font-medium mt-4">
              View Products →
            </p>
          </button>

          <button
            type="button"
            onClick={onEmployees}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <div className="text-gray-500 text-sm font-semibold mb-2">
              EMPLOYEES
            </div>
            <div className="text-3xl font-bold text-green-600">
              {loading ? '...' : employeeCount}
            </div>
            <p className="text-gray-600 text-sm mt-2">Employees</p>
            <p className="text-green-600 text-sm font-medium mt-4">
              Manage Employees →
            </p>
          </button>

          <button
            type="button"
            onClick={onSales}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <div className="text-gray-500 text-sm font-semibold mb-2">
              TOTAL SALES
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {loading ? '...' : formatCurrency(revenue)}
            </div>
            <p className="text-gray-600 text-sm mt-2">
              Total sales revenue
            </p>
            <p className="text-purple-600 text-sm font-medium mt-4">
              View Sales →
            </p>
          </button>

          <button
            type="button"
            onClick={onSales}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <div className="text-gray-500 text-sm font-semibold mb-2">
              UNITS SOLD
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {loading ? '...' : totalUnitsSold}
            </div>
            <p className="text-gray-600 text-sm mt-2">
              Total products sold
            </p>
            <p className="text-orange-600 text-sm font-medium mt-4">
              View Sales →
            </p>
          </button>
        </div>

        {/* QUICK ACCESS */}

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Quick Access
              </p>

              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                Everything you need
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Quickly open your everyday tools and team functions.
              </p>
            </div>

            <span className="text-xs font-semibold text-gray-400">
              13 shortcuts
            </span>
          </div>

          {/* EVERYDAY WORK */}
          <div className="mb-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Everyday Work
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <button
                type="button"
                onClick={onCatalog}
                className="group text-left rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-cyan-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🛍️
                  </div>
                  <span className="text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Digital Catalog</h4>
                <p className="text-sm text-gray-500 mt-1">Browse products and availability quickly.</p>
              </button>

              <button
                type="button"
                onClick={onProducts}
                className="group text-left rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-sm">
                    📦
                  </div>
                  <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Products</h4>
                <p className="text-sm text-gray-500 mt-1">View product details and inventory status.</p>
              </button>

              <button
                type="button"
                onClick={onSales}
                className="group text-left rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-orange-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xl shadow-sm">
                    💰
                  </div>
                  <span className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Sales</h4>
                <p className="text-sm text-gray-500 mt-1">Record sales and review transactions.</p>
              </button>

              <button
                type="button"
                onClick={onCustomers}
                className="group text-left rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-sm">
                    👤
                  </div>
                  <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Customers</h4>
                <p className="text-sm text-gray-500 mt-1">Search profiles, notes, loyalty and wishlists.</p>
              </button>

              <button
                type="button"
                onClick={onBarcode}
                className="group text-left rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-sky-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xl shadow-sm">
                    📷
                  </div>
                  <span className="text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Barcode Scanner</h4>
                <p className="text-sm text-gray-500 mt-1">Find products instantly by barcode.</p>
              </button>
            </div>
          </div>

          {/* TEAM & SCHEDULE */}
          <div className="mb-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Team & Schedule
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <button
                type="button"
                onClick={onCommunication}
                className="group text-left rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-rose-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl shadow-sm">
                    📣
                  </div>
                  <span className="text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Communication</h4>
                <p className="text-sm text-gray-500 mt-1">Announcements and team scheduling tools.</p>
              </button>

              <button
                type="button"
                onClick={onCalendar}
                className="group text-left rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-violet-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🗓️
                  </div>
                  <span className="text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">My Schedule</h4>
                <p className="text-sm text-gray-500 mt-1">View upcoming shifts and your calendar.</p>
              </button>

              <button
                type="button"
                onClick={onSwap}
                className="group text-left rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-fuchsia-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🔄
                  </div>
                  <span className="text-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Shift Swap</h4>
                <p className="text-sm text-gray-500 mt-1">Request, accept and track shift swaps.</p>
              </button>

              <button
                type="button"
                onClick={onTimeOff}
                className="group text-left rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-amber-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🏖️
                  </div>
                  <span className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Time Off</h4>
                <p className="text-sm text-gray-500 mt-1">Submit and track leave requests.</p>
              </button>
            </div>
          </div>

          {/* MANAGEMENT */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Management
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <button
                type="button"
                onClick={onInventory}
                className="group text-left rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🏪
                  </div>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Inventory</h4>
                <p className="text-sm text-gray-500 mt-1">Monitor stock and inventory movements.</p>
              </button>

              <button
                type="button"
                onClick={onAnalytics}
                className="group text-left rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-purple-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-sm">
                    📊
                  </div>
                  <span className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Analytics</h4>
                <p className="text-sm text-gray-500 mt-1">Review sales performance and trends.</p>
              </button>

              <button
                type="button"
                onClick={onLowStock}
                className="group text-left rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-red-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center text-xl shadow-sm">
                    🚨
                  </div>
                  <span className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 mt-5">Low Stock Alerts</h4>
                <p className="text-sm text-gray-500 mt-1">Review products needing attention.</p>
              </button>

              {(role || '').trim().toLowerCase() === 'admin' ||
              (role || '').trim().toLowerCase() === 'manager' ||
              (role || '').trim().toLowerCase() === 'hr' ? (
                <button
                  type="button"
                  onClick={onEmployees}
                  className="group text-left rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-sm">
                      👥
                    </div>
                    <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mt-5">Employees</h4>
                  <p className="text-sm text-gray-500 mt-1">Manage employee profiles and account links.</p>
                </button>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center text-xl">
                    🔒
                  </div>
                  <h4 className="text-base font-bold text-gray-700 mt-5">Management Tools</h4>
                  <p className="text-sm text-gray-500 mt-1">Additional management tools are restricted by role.</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
