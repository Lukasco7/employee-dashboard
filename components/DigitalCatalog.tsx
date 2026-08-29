'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  barcode: string | null;
}

type StockFilter = '' | 'available' | 'low' | 'out';

const LOW_STOCK_THRESHOLD = 10;

export default function DigitalCatalog({
  onBack,
}: {
  onBack: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, price, stock, barcode')
        .order('name', { ascending: true });

      if (productsError) {
        throw productsError;
      }

      setProducts(
        (data || []).map((product) => ({
          id: Number(product.id),
          name: product.name?.toString().trim() || 'Unnamed Product',
          category:
            product.category?.toString().trim() || 'Uncategorized',
          price:
            Number(
              String(product.price ?? '').replace('$', '').trim()
            ) || 0,
          stock: Number(product.stock) || 0,
          barcode:
            product.barcode?.toString().trim() || null,
        }))
      );
    } catch (err) {
      console.error('Digital catalog error:', err);
      setError(
        err instanceof Error
          ? `Unable to load catalog: ${err.message}`
          : 'Unable to load catalog.'
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.category))
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        String(product.id).includes(term) ||
        (product.barcode || '').toLowerCase().includes(term);

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      let matchesStock = true;

      if (stockFilter === 'available') {
        matchesStock = product.stock > LOW_STOCK_THRESHOLD;
      }

      if (stockFilter === 'low') {
        matchesStock =
          product.stock > 0 &&
          product.stock <= LOW_STOCK_THRESHOLD;
      }

      if (stockFilter === 'out') {
        matchesStock = product.stock <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const formatPrice = (value: number | string) => {
    const numericValue = Number(
      String(value).replace('$', '').trim()
    );

    return Number.isFinite(numericValue)
      ? numericValue.toFixed(2)
      : '0.00';
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return {
        label: 'Out of Stock',
        className: 'bg-red-100 text-red-800',
      };
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
      return {
        label: 'Low Stock',
        className: 'bg-orange-100 text-orange-800',
      };
    }

    return {
      label: 'Available',
      className: 'bg-green-100 text-green-800',
    };
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStockFilter('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Digital Product Catalog
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse products, prices and availability
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={fetchProducts}
              disabled={loading}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 cursor-pointer"
            >
              🔄 Refresh
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
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            <p className="font-semibold">Catalog Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, category, ID or barcode..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select
                value={stockFilter}
                onChange={(e) =>
                  setStockFilter(e.target.value as StockFilter)
                }
                className={inputClass}
              >
                <option value="">All Products</option>
                <option value="available">Available</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-800">
                {filteredProducts.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-800">
                {products.length}
              </span>{' '}
              products
            </p>

            {(search || categoryFilter || stockFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-gray-600">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-800">
              No products found
            </h2>
            <p className="text-gray-500 mt-2">
              Try a different search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const status = getStockStatus(product.stock);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                      {product.name.charAt(0).toUpperCase()}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mt-4 line-clamp-2">
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {product.category}
                  </p>

                  <div className="flex items-end justify-between gap-3 mt-5">
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(product.price)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className="font-bold text-gray-800">
                        {product.stock}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedProduct && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onMouseDown={() => setSelectedProduct(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-sm text-blue-600 font-semibold">
                    PRODUCT DETAILS
                  </p>
                  <h2 className="text-2xl font-bold text-gray-800 mt-1">
                    {selectedProduct.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none cursor-pointer"
                  aria-label="Close product details"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-semibold text-gray-800 mt-1">
                    {selectedProduct.category}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-semibold text-purple-600 mt-1">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className="font-semibold text-gray-800 mt-1">
                    {selectedProduct.stock}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Barcode</p>
                  <p className="font-semibold text-gray-800 mt-1 break-all">
                    {selectedProduct.barcode || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-semibold ${getStockStatus(
                    selectedProduct.stock
                  ).className}`}
                >
                  {getStockStatus(selectedProduct.stock).label}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-full mt-6 bg-gray-100 text-gray-800 px-5 py-3 rounded-lg hover:bg-gray-200 transition font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
