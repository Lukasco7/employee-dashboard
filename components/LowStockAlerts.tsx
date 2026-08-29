'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: number;
  name: string;
  stock: number;
  reorder_threshold: number;
  category: string | null;
}

type Severity = 'Warning' | 'Critical';
type Filter = 'All' | Severity;

interface AlertItem extends Product {
  severity: Severity;
}

const makeReadableError = (err: unknown) => {
  if (!err) {
    return 'Unknown database error.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  try {
    const serialized = JSON.stringify(
      err,
      Object.getOwnPropertyNames(err),
      2
    );

    if (
      serialized &&
      serialized !== '{}' &&
      serialized !== 'null'
    ) {
      return serialized;
    }
  } catch {
    // Ignore serialization errors.
  }

  return String(err);
};

export default function LowStockAlerts({
  onBack,
  onInventory,
  onProducts,
}: {
  onBack: () => void;
  onInventory: () => void;
  onProducts: () => void;
}) {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [filter, setFilter] =
    useState<Filter>('All');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const loadProducts = async (
    background = false
  ) => {
    try {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      console.log(
        '[LowStockAlerts] Starting product query...'
      );

      // Confirm that the browser still has a Supabase session.
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `Authentication error: ${makeReadableError(
            sessionError
          )}`
        );
      }

      if (!sessionData.session) {
        throw new Error(
          'No active Supabase session. Please log out and log in again.'
        );
      }

      console.log(
        '[LowStockAlerts] Authenticated as:',
        sessionData.session.user.email
      );

      const {
        data,
        error: productsError,
        status,
        statusText,
      } = await supabase
        .from('products')
        .select(
          'id, name, stock, reorder_threshold, category'
        )
        .order('name', {
          ascending: true,
        });

      if (productsError) {
        const readable =
          makeReadableError(
            productsError
          );

        console.error(
          '[LowStockAlerts] Supabase error:',
          readable,
          {
            code: productsError.code,
            message: productsError.message,
            details: productsError.details,
            hint: productsError.hint,
            status,
            statusText,
          }
        );

        throw new Error(
          `Products query failed${
            productsError.code
              ? ` (${productsError.code})`
              : ''
          }: ${
            productsError.message ||
            readable
          }`
        );
      }

      console.log(
        '[LowStockAlerts] Products loaded:',
        data
      );

      const loadedProducts: Product[] =
        (data || []).map(
          (product) => ({
            id: Number(product.id),
            name:
              product.name ||
              'Unnamed Product',
            stock:
              Number(product.stock) || 0,
            reorder_threshold:
              Number(
                product.reorder_threshold ??
                  10
              ),
            category:
              product.category ||
              null,
          })
        );

      setProducts(
        loadedProducts
      );
    } catch (err) {
      console.error(
        '[LowStockAlerts] Load failed:',
        makeReadableError(err),
        err
      );

      setError(
        makeReadableError(err)
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();

    const channel =
      supabase
        .channel(
          'low-stock-alerts'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
          },
          () => {
            loadProducts(true);
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  const alerts = useMemo<
    AlertItem[]
  >(() => {
    return products
      .filter(
        (product) =>
          product.stock <=
          product.reorder_threshold
      )
      .map((product) => ({
        ...product,
        severity:
          product.stock <= 0 ||
          product.stock <=
            Math.max(
              1,
              Math.floor(
                product.reorder_threshold /
                  2
              )
            )
            ? 'Critical'
            : 'Warning',
      }));
  }, [products]);

  const visibleAlerts = useMemo(
    () =>
      filter === 'All'
        ? alerts
        : alerts.filter(
            (alert) =>
              alert.severity ===
              filter
          ),
    [alerts, filter]
  );

  const warningCount =
    alerts.filter(
      (alert) =>
        alert.severity ===
        'Warning'
    ).length;

  const criticalCount =
    alerts.filter(
      (alert) =>
        alert.severity ===
        'Critical'
    ).length;

  const severityClass = (
    severity: Severity
  ) =>
    severity === 'Critical'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';

  const cardClass = (
    severity: Severity
  ) =>
    severity === 'Critical'
      ? 'border-red-200 bg-red-50/40'
      : 'border-yellow-200 bg-yellow-50/40';

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">
                Low Stock Alerts
              </h1>

              {alerts.length > 0 && (
                <span className="min-w-7 h-7 px-2 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-1">
              Monitor products that need attention
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                loadProducts(true)
              }
              disabled={refreshing}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 cursor-pointer"
            >
              {refreshing
                ? 'Refreshing...'
                : '🔄 Refresh'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-800 rounded-xl p-5 mb-6">
            <p className="font-bold">
              Low Stock Alerts could not load
            </p>

            <p className="text-sm mt-2 whitespace-pre-wrap break-words">
              {error}
            </p>

            <div className="mt-4 bg-white/70 rounded-lg p-4 text-sm">
              <p className="font-semibold">
                Check these in Supabase:
              </p>

              <p className="mt-2">
                1. The <code>products</code> table exists.
              </p>

              <p className="mt-1">
                2. The <code>reorder_threshold</code> column exists.
              </p>

              <p className="mt-1">
                3. Your logged-in user has permission to read <code>products</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadProducts()
              }
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">
              Active Alerts
            </p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {alerts.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Products at or below threshold
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setFilter('Warning')
            }
            className={`text-left rounded-2xl shadow-sm border p-6 transition cursor-pointer ${
              filter === 'Warning'
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-100 bg-white hover:shadow-md'
            }`}
          >
            <p className="text-sm text-gray-500">
              Warning
            </p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {warningCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Below reorder point
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter('Critical')
            }
            className={`text-left rounded-2xl shadow-sm border p-6 transition cursor-pointer ${
              filter === 'Critical'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-100 bg-white hover:shadow-md'
            }`}
          >
            <p className="text-sm text-gray-500">
              Critical
            </p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {criticalCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Very low or out of stock
            </p>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Alert Inbox
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {visibleAlerts.length} active alert
                {visibleAlerts.length === 1
                  ? ''
                  : 's'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'All',
                'Warning',
                'Critical',
              ].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setFilter(
                      option as Filter
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${
                    filter === option
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <p className="text-gray-600">
                Checking stock levels...
              </p>
            </div>
          ) : visibleAlerts.length ===
            0 ? (
            <div className="p-12 text-center bg-green-50 rounded-2xl border border-green-100">
              <div className="text-5xl mb-4">
                ✅
              </div>

              <p className="font-bold text-green-800">
                No low-stock alerts
              </p>

              <p className="text-sm text-green-700 mt-1">
                All products are currently above their reorder thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAlerts.map(
                (alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-5 ${cardClass(
                      alert.severity
                    )}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-2xl shrink-0">
                          {alert.severity ===
                          'Critical'
                            ? '🔴'
                            : '⚠️'}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-gray-800 text-lg">
                              {alert.name}
                            </h3>

                            <span
                              className={`px-3 py-1 rounded-full border text-xs font-bold ${severityClass(
                                alert.severity
                              )}`}
                            >
                              {alert.severity}
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 mt-1">
                            {alert.category || 'Uncategorized'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white/80 rounded-xl border border-gray-200 px-4 py-3">
                          <p className="text-xs text-gray-500">
                            Current Stock
                          </p>
                          <p
                            className={`text-xl font-bold mt-1 ${
                              alert.stock <= 0
                                ? 'text-red-600'
                                : 'text-gray-800'
                            }`}
                          >
                            {alert.stock}
                          </p>
                        </div>

                        <div className="bg-white/80 rounded-xl border border-gray-200 px-4 py-3">
                          <p className="text-xs text-gray-500">
                            Reorder At
                          </p>
                          <p className="text-xl font-bold text-gray-800 mt-1">
                            {alert.reorder_threshold}
                          </p>
                        </div>

                        <div className="bg-white/80 rounded-xl border border-gray-200 px-4 py-3">
                          <p className="text-xs text-gray-500">
                            Units Below
                          </p>
                          <p className="text-xl font-bold text-red-600 mt-1">
                            {Math.max(
                              0,
                              alert.reorder_threshold -
                                alert.stock
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 mt-5 pt-5 border-t border-gray-200/80">
                      <button
                        type="button"
                        onClick={onProducts}
                        className="bg-white text-blue-700 border border-blue-200 px-5 py-2.5 rounded-lg hover:bg-blue-50 transition font-semibold cursor-pointer"
                      >
                        View Product
                      </button>

                      <button
                        type="button"
                        onClick={onInventory}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold cursor-pointer"
                      >
                        Open Inventory
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
