'use client';

import { useState } from 'react';

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Laptop', category: 'Electronics', price: '$899', stock: 15 },
  { id: 2, name: 'Mouse', category: 'Electronics', price: '$25', stock: 120 },
  { id: 3, name: 'Keyboard', category: 'Electronics', price: '$75', stock: 45 },
  { id: 4, name: 'Monitor', category: 'Electronics', price: '$299', stock: 8 },
  { id: 5, name: 'Desk Chair', category: 'Furniture', price: '$199', stock: 22 },
  { id: 6, name: 'Desk Lamp', category: 'Furniture', price: '$45', stock: 60 },
];

export default function Products({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('');

  const filteredProducts = SAMPLE_PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                {product.name}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{product.category}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xl font-bold text-blue-600">
                  {product.price}
                </span>
                <span className="text-sm text-gray-600">
                  Stock: {product.stock}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No products found</p>
          </div>
        )}
      </main>
    </div>
  );
}