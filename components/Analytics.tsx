'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
}

interface SaleRow {
  id: number;
  product_id: number;
  amount: number | string;
  quantity: number | string;
  sale_date: string;
}

interface Sale extends SaleRow {
  product: Product | null;
}

export default function Analytics({
  onBack,
}: {
  onBack: () => void;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =========================
  // LOAD SALES + PRODUCTS
  // =========================

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');

      // Load sales WITHOUT embedding products.
      // This avoids the duplicate-relationship problem
      // that exists between sales and products.
      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from('sales')
        .select(
          'id, product_id, amount, quantity, sale_date'
        )
        .order('sale_date', {
          ascending: false,
        });

      if (salesError) {
        throw salesError;
      }

      const salesRows: SaleRow[] =
        (salesData || []).map((sale) => ({
          id: Number(sale.id),
          product_id: Number(sale.product_id),
          amount: sale.amount,
          quantity: sale.quantity,
          sale_date: sale.sale_date,
        }));

      // =========================
      // GET UNIQUE PRODUCT IDS
      // =========================

      const productIds = Array.from(
        new Set(
          salesRows
            .map((sale) => sale.product_id)
            .filter((id) =>
              Number.isFinite(id)
            )
        )
      );

      let products: Product[] = [];

      // =========================
      // LOAD PRODUCTS SEPARATELY
      // =========================

      if (productIds.length > 0) {
        const {
          data: productsData,
          error: productsError,
        } = await supabase
          .from('products')
          .select(
            'id, name, category'
          )
          .in('id', productIds);

        if (productsError) {
          throw productsError;
        }

        products =
          (productsData || []).map(
            (product) => ({
              id: Number(product.id),
              name:
                product.name ||
                'Unknown Product',
              category:
                product.category ||
                'No category',
            })
          );
      }

      // =========================
      // COMBINE LOCALLY
      // =========================

      const combinedSales: Sale[] =
        salesRows.map((sale) => ({
          ...sale,
          product:
            products.find(
              (product) =>
                product.id ===
                sale.product_id
            ) || null,
        }));

      setSales(combinedSales);
    } catch (err) {
      console.error(
        'Error fetching sales:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to load sales data: ${err.message}`
        );
      } else {
        setError(
          'Unable to load sales data.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // TOTAL REVENUE
  // =========================

  const totalRevenue = sales.reduce(
    (total, sale) =>
      total + Number(sale.amount || 0),
    0
  );

  // =========================
  // TOTAL UNITS
  // =========================

  const totalUnits = sales.reduce(
    (total, sale) =>
      total + Number(sale.quantity || 0),
    0
  );

  // =========================
  // TOTAL TRANSACTIONS
  // =========================

  const totalTransactions =
    sales.length;

  // =========================
  // AVERAGE SALE
  // =========================

  const averageSale =
    totalTransactions > 0
      ? totalRevenue / totalTransactions
      : 0;

  // =========================
  // TOP PRODUCTS
  // =========================

  const productSales: Record<
    string,
    {
      name: string;
      category: string;
      quantity: number;
      revenue: number;
    }
  > = {};

  sales.forEach((sale) => {
    const name =
      sale.product?.name ||
      'Unknown Product';

    const category =
      sale.product?.category ||
      'No category';

    const key =
      sale.product
        ? String(sale.product.id)
        : `unknown-${sale.product_id}`;

    if (!productSales[key]) {
      productSales[key] = {
        name,
        category,
        quantity: 0,
        revenue: 0,
      };
    }

    productSales[key].quantity +=
      Number(sale.quantity || 0);

    productSales[key].revenue +=
      Number(sale.amount || 0);
  });

  const topProducts =
    Object.values(productSales).sort(
      (a, b) =>
        b.quantity - a.quantity
    );

  // =========================
  // DAILY REVENUE
  // =========================

  const dailyRevenue: Record<
    string,
    number
  > = {};

  sales.forEach((sale) => {
    const date = new Date(
      sale.sale_date
    ).toLocaleDateString();

    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0;
    }

    dailyRevenue[date] +=
      Number(sale.amount || 0);
  });

  const dailyRevenueList =
    Object.entries(dailyRevenue).sort(
      (a, b) => {
        const dateA = new Date(
          a[0]
        ).getTime();

        const dateB = new Date(
          b[0]
        ).getTime();

        return dateB - dateA;
      }
    );

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Analytics
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Sales performance and product insights
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={fetchSales}
              disabled={loading}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Refresh
            </button>

            <button
              type="button"
              onClick={onBack}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium"
            >
              ← Back to Dashboard
            </button>

          </div>
        </div>
      </header>

      {/* ========================= */}
      {/* MAIN */}
      {/* ========================= */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ERROR */}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            <p className="font-semibold">
              Analytics Error
            </p>

            <p className="text-sm mt-1">
              {error}
            </p>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-gray-600">
              Loading analytics...
            </p>
          </div>
        ) : (
          <>

            {/* ========================= */}
            {/* SUMMARY */}
            {/* ========================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm font-semibold">
                  TOTAL REVENUE
                </p>

                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm font-semibold">
                  UNITS SOLD
                </p>

                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {totalUnits}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm font-semibold">
                  TRANSACTIONS
                </p>

                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {totalTransactions}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm font-semibold">
                  AVERAGE SALE
                </p>

                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(averageSale)}
                </p>
              </div>

            </div>

            {/* ========================= */}
            {/* TOP PRODUCTS */}
            {/* ========================= */}

            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                🏆 Top-Selling Products
              </h2>

              {topProducts.length === 0 ? (
                <p className="text-gray-600">
                  No sales data available.
                </p>
              ) : (
                <div className="space-y-4">

                  {topProducts
                    .slice(0, 10)
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-center justify-between gap-4 border-b pb-4"
                        >

                          <div className="flex items-center gap-4 min-w-0">

                            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                              {index + 1}
                            </div>

                            <div className="min-w-0">

                              <p className="font-semibold text-gray-800 truncate">
                                {item.name}
                              </p>

                              <p className="text-sm text-gray-500 truncate">
                                {item.category}
                              </p>

                            </div>

                          </div>

                          <div className="text-right shrink-0">

                            <p className="font-bold text-blue-600">
                              {item.quantity} units
                            </p>

                            <p className="text-sm text-purple-600">
                              {formatCurrency(item.revenue)}
                            </p>

                          </div>

                        </div>
                      )
                    )}

                </div>
              )}

            </div>

            {/* ========================= */}
            {/* DAILY REVENUE */}
            {/* ========================= */}

            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                💰 Daily Revenue
              </h2>

              {dailyRevenueList.length === 0 ? (
                <p className="text-gray-600">
                  No revenue data available.
                </p>
              ) : (
                <div className="space-y-4">

                  {dailyRevenueList.map(
                    ([date, revenue]) => (
                      <div
                        key={date}
                        className="flex items-center justify-between gap-4 border-b pb-4"
                      >

                        <p className="font-medium text-gray-700">
                          {date}
                        </p>

                        <p className="font-bold text-purple-600">
                          {formatCurrency(revenue)}
                        </p>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* ========================= */}
            {/* RECENT SALES */}
            {/* ========================= */}

            <div className="bg-white rounded-xl shadow-sm p-6">

              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                📋 Recent Sales
              </h2>

              {sales.length === 0 ? (
                <p className="text-gray-600">
                  No sales recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[700px]">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Product
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Category
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Quantity
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Amount
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Date
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {sales
                        .slice(0, 10)
                        .map(
                          (sale) => (
                            <tr
                              key={
                                sale.id
                              }
                              className="hover:bg-gray-50"
                            >

                              <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                {sale.product?.name ||
                                  'Unknown Product'}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {sale.product?.category ||
                                  'No category'}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {
                                  sale.quantity
                                }
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-purple-600">
                                {formatCurrency(
                                  sale.amount || 0
                                )}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-600">
                                {sale.sale_date
                                  ? new Date(
                                      sale.sale_date
                                    ).toLocaleString()
                                  : '-'}
                              </td>

                            </tr>
                          )
                        )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </>
        )}

      </main>

    </div>
  );
}
