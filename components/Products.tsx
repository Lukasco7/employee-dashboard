'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export default function Products({
  onBack,
  userRole,
}: {
  onBack: () => void;
  userRole?: string;
}) {
  const normalizedRole =
    (userRole || '').trim().toLowerCase();

  const canEditProduct =
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'administrator';

  const canDeleteProduct =
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'administrator';
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  // Add product fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  // Edit product
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price, stock')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load products.');
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ADD PRODUCT
  // =========================

  const handleAddProduct = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (
      !name.trim() ||
      !category.trim() ||
      !price ||
      !stock
    ) {
      setError('Please fill in all product fields.');
      return;
    }

    const productPrice = Number(price);
    const productStock = Number(stock);

    if (
      Number.isNaN(productPrice) ||
      productPrice < 0
    ) {
      setError('Please enter a valid price.');
      return;
    }

    if (
      Number.isNaN(productStock) ||
      productStock < 0 ||
      !Number.isInteger(productStock)
    ) {
      setError('Stock must be a whole number.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('products')
        .insert([
          {
            name: name.trim(),
            category: category.trim(),
            price: productPrice,
            stock: productStock,
          },
        ]);

      if (error) {
        throw error;
      }

      setName('');
      setCategory('');
      setPrice('');
      setStock('');

      setShowAddForm(false);
      setSuccess('Product added successfully.');

      await fetchProducts();
    } catch (err) {
      console.error('Error adding product:', err);

      if (err instanceof Error) {
        setError(`Unable to add product: ${err.message}`);
      } else {
        setError('Unable to add product.');
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // START EDITING
  // =========================

  const startEditing = (product: Product) => {
    setEditingProduct(product);

    setEditName(product.name);
    setEditCategory(product.category);
    setEditPrice(String(product.price));
    setEditStock(String(product.stock));

    setError('');
    setSuccess('');
  };

  // =========================
  // CANCEL EDITING
  // =========================

  const cancelEditing = () => {
    setEditingProduct(null);

    setEditName('');
    setEditCategory('');
    setEditPrice('');
    setEditStock('');

    setError('');
  };

  // =========================
  // UPDATE PRODUCT
  // =========================

  const handleUpdateProduct = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!canEditProduct) {
      setError(
        'You do not have permission to edit products.'
      );
      return;
    }

    if (!editingProduct) {
      return;
    }

    setError('');
    setSuccess('');

    if (
      !editName.trim() ||
      !editCategory.trim() ||
      !editPrice ||
      !editStock
    ) {
      setError('Please fill in all product fields.');
      return;
    }

    const updatedPrice = Number(editPrice);
    const updatedStock = Number(editStock);

    if (
      Number.isNaN(updatedPrice) ||
      updatedPrice < 0
    ) {
      setError('Please enter a valid price.');
      return;
    }

    if (
      Number.isNaN(updatedStock) ||
      updatedStock < 0 ||
      !Number.isInteger(updatedStock)
    ) {
      setError('Stock must be a whole number.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('products')
        .update({
          name: editName.trim(),
          category: editCategory.trim(),
          price: updatedPrice,
          stock: updatedStock,
        })
        .eq('id', editingProduct.id);

      if (error) {
        throw error;
      }

      setSuccess('Product updated successfully.');

      cancelEditing();

      await fetchProducts();
    } catch (err) {
      console.error('Error updating product:', err);

      if (err instanceof Error) {
        setError(
          `Unable to update product: ${err.message}`
        );
      } else {
        setError('Unable to update product.');
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE PRODUCT
  // =========================

  const handleDeleteProduct = async (
    product: Product
  ) => {
    if (!canDeleteProduct) {
      setError(
        'You do not have permission to delete products.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${product.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error } =
        await supabase
          .from('products')
          .delete()
          .eq('id', product.id);

      if (error) {
        console.error(
          'SUPABASE DELETE PRODUCT ERROR:',
          JSON.stringify(
            error,
            Object.getOwnPropertyNames(error),
            2
          )
        );

        throw new Error(
          error.message ||
            error.details ||
            error.hint ||
            'Supabase rejected the product deletion.'
        );
      }

      if (
        editingProduct?.id ===
        product.id
      ) {
        cancelEditing();
      }

      setSuccess(
        `"${product.name}" was deleted successfully.`
      );

      await fetchProducts();
    } catch (err) {
      const readableError =
        err instanceof Error
          ? err.message
          : typeof err === 'object' &&
            err !== null
          ? JSON.stringify(
              err,
              Object.getOwnPropertyNames(err),
              2
            )
          : String(err);

      console.error(
        'Error deleting product:',
        readableError
      );

      setError(
        `Unable to delete product: ${readableError}`
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase();

    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <h1 className="text-2xl font-bold text-gray-800">
            Products
          </h1>

          <button
            type="button"
            onClick={onBack}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer font-medium"
          >
            ← Back to Dashboard
          </button>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* SEARCH + ADD */}
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingProduct(null);
              setError('');
              setSuccess('');
            }}
            className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition cursor-pointer font-semibold"
          >
            {showAddForm ? 'Cancel' : '+ Add Product'}
          </button>

        </div>

        {/* SUCCESS */}
        {success && (
          <div className="bg-green-100 text-green-700 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* ========================= */}
        {/* ADD PRODUCT FORM */}
        {/* ========================= */}

        {showAddForm && !editingProduct && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">

            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Add New Product
            </h2>

            <form
              onSubmit={handleAddProduct}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="e.g. Laptop"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>

                <input
                  type="text"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  placeholder="e.g. Electronics"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  placeholder="e.g. 750.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value)
                  }
                  placeholder="e.g. 10"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Product'}
                </button>

              </div>

            </form>

          </div>
        )}

        {/* ========================= */}
        {/* EDIT PRODUCT FORM */}
        {/* ========================= */}

        {editingProduct && canEditProduct && (
          <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-blue-600">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-xl font-semibold text-gray-800">
                Edit Product
              </h2>

              <span className="text-sm text-gray-500">
                Product ID: {editingProduct.id}
              </span>

            </div>

            <form
              onSubmit={handleUpdateProduct}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>

                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) =>
                    setEditPrice(e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editStock}
                  onChange={(e) =>
                    setEditStock(e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3">

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition cursor-pointer font-semibold disabled:opacity-50"
                >
                  {saving
                    ? 'Updating...'
                    : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

        {/* ========================= */}
        {/* LOADING */}
        {/* ========================= */}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              Loading products...
            </p>
          </div>
        )}

        {/* ========================= */}
        {/* PRODUCT TABLE */}
        {/* ========================= */}

        {!loading && (
          <>
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">
                  No products found.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                          Name
                        </th>

                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                          Category
                        </th>

                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                          Price
                        </th>

                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                          Stock
                        </th>

                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-200">

                      {filteredProducts.map((product) => (

                        <tr
                          key={product.id}
                          className="hover:bg-gray-50"
                        >

                          <td className="px-6 py-4 text-sm font-medium text-gray-800">
                            {product.name}
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-600">
                            {product.category}
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatCurrency(product.price)}
                          </td>

                          <td className="px-6 py-4 text-sm">

                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                product.stock > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {product.stock}
                            </span>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex flex-wrap gap-2">
                              {canEditProduct ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditing(product)
                                  }
                                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition cursor-pointer font-semibold"
                                >
                                  ✏️ Edit
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold">
                                  🔒 View only
                                </span>
                              )}

                              {canDeleteProduct && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteProduct(
                                      product
                                    )
                                  }
                                  disabled={saving}
                                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition cursor-pointer font-semibold disabled:opacity-50"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}