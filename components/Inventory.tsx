'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  reorder_threshold: number;
}

interface InventoryMovement {
  id: number;
  product_id: number;
  change_quantity: number;
  movement_type: string;
  reason: string | null;
  previous_stock: number;
  new_stock: number;
  created_by: string | null;
  created_at: string | null;
  product?: Product | null;
}

type MovementType =
  | 'Restock'
  | 'Adjustment'
  | 'Damaged'
  | 'Return';

const DEFAULT_REORDER_THRESHOLD = 10;

export default function Inventory({
  onBack,
}: {
  onBack: () => void;
}) {
  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [movements, setMovements] = useState<
    InventoryMovement[]
  >([]);

  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] =
    useState<MovementType>('Restock');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thresholdSavingId, setThresholdSavingId] =
    useState<number | null>(null);

  const [thresholdDrafts, setThresholdDrafts] =
    useState<Record<number, string>>({});

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [productsResult, movementsResult] =
        await Promise.all([
          supabase
            .from('products')
            .select(
              'id, name, category, price, stock, reorder_threshold'
            )
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('inventory_movements')
            .select(
              'id, product_id, change_quantity, movement_type, reason, previous_stock, new_stock, created_by, created_at'
            )
            .order('created_at', {
              ascending: false,
            }),
        ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (movementsResult.error) {
        throw movementsResult.error;
      }

      const loadedProducts: Product[] =
        (productsResult.data || []).map(
          (product) => ({
            id: Number(product.id),
            name:
              product.name || 'Unnamed Product',
            category:
              product.category ||
              'Uncategorized',
            price:
              Number(product.price) || 0,
            stock:
              Number(product.stock) || 0,
            reorder_threshold:
              Number(
                product.reorder_threshold
              ) ||
              DEFAULT_REORDER_THRESHOLD,
          })
        );

      const loadedMovements: InventoryMovement[] =
        (movementsResult.data || []).map(
          (movement) => ({
            id: Number(movement.id),
            product_id:
              Number(movement.product_id),
            change_quantity:
              Number(
                movement.change_quantity
              ),
            movement_type:
              movement.movement_type,
            reason:
              movement.reason || null,
            previous_stock:
              Number(
                movement.previous_stock
              ),
            new_stock:
              Number(movement.new_stock),
            created_by:
              movement.created_by ||
              null,
            created_at:
              movement.created_at ||
              null,
            product:
              loadedProducts.find(
                (product) =>
                  product.id ===
                  Number(
                    movement.product_id
                  )
              ) || null,
          })
        );

      setProducts(loadedProducts);
      setThresholdDrafts(
        Object.fromEntries(
          loadedProducts.map((product) => [
            product.id,
            String(product.reorder_threshold),
          ])
        )
      );
      setMovements(loadedMovements);
    } catch (err) {
      console.error(
        'Error loading inventory:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to load inventory: ${err.message}`
        );
      } else {
        setError(
          'Unable to load inventory.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SELECTED PRODUCT
  // =========================

  const selectedProduct =
    products.find(
      (product) =>
        product.id ===
        Number(productId)
    ) || null;

  // =========================
  // CALCULATE CHANGE
  // =========================

  const enteredQuantity =
    Number(quantity) || 0;

  const getChangeQuantity = () => {
    switch (movementType) {
      case 'Restock':
      case 'Return':
        return enteredQuantity;

      case 'Damaged':
        return -enteredQuantity;

      case 'Adjustment':
        return enteredQuantity;

      default:
        return 0;
    }
  };

  const changeQuantity =
    getChangeQuantity();

  const projectedStock =
    selectedProduct
      ? selectedProduct.stock +
        changeQuantity
      : 0;

  // =========================
  // RECORD MOVEMENT
  // =========================

  const handleRecordMovement = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedProduct) {
      setError(
        'Please select a product.'
      );
      return;
    }

    if (
      !quantity ||
      !Number.isFinite(
        enteredQuantity
      ) ||
      enteredQuantity <= 0 ||
      !Number.isInteger(
        enteredQuantity
      )
    ) {
      setError(
        'Please enter a valid whole-number quantity.'
      );
      return;
    }

    if (
      movementType ===
        'Damaged' &&
      enteredQuantity >
        selectedProduct.stock
    ) {
      setError(
        `Only ${selectedProduct.stock} unit${
          selectedProduct.stock ===
          1
            ? ''
            : 's'
        } available.`
      );
      return;
    }

    if (
      movementType ===
        'Adjustment' &&
      projectedStock < 0
    ) {
      setError(
        'The adjustment would make stock negative.'
      );
      return;
    }

    if (
      movementType ===
        'Adjustment' &&
      enteredQuantity === 0
    ) {
      setError(
        'Please enter a non-zero adjustment.'
      );
      return;
    }

    try {
      setSaving(true);

      const { data, error: rpcError } =
        await supabase.rpc(
          'record_inventory_movement',
          {
            p_product_id:
              selectedProduct.id,
            p_change_quantity:
              changeQuantity,
            p_movement_type:
              movementType,
            p_reason:
              reason.trim() || null,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const result =
        Array.isArray(data)
          ? data[0]
          : data;

      const newStock =
        Number(
          result?.new_stock
        );

      setSuccess(
        `${selectedProduct.name} inventory updated successfully. New stock: ${
          Number.isFinite(newStock)
            ? newStock
            : projectedStock
        }.`
      );

      setProductId('');
      setQuantity('');
      setReason('');
      setMovementType('Restock');

      await loadData();
    } catch (err) {
      console.error(
        'Error recording inventory movement:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to update inventory: ${err.message}`
        );
      } else {
        setError(
          'Unable to update inventory.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // PRODUCTS FILTER
  // =========================

  const filteredProducts =
    useMemo(() => {
      const searchTerm =
        search
          .toLowerCase()
          .trim();

      return products.filter(
        (product) => {
          const matchesSearch =
            !searchTerm ||
            product.name
              .toLowerCase()
              .includes(
                searchTerm
              ) ||
            product.category
              .toLowerCase()
              .includes(
                searchTerm
              );

          let matchesStock = true;

          if (
            stockFilter ===
            'in-stock'
          ) {
            matchesStock =
              product.stock >
              product.reorder_threshold;
          }

          if (
            stockFilter ===
            'low-stock'
          ) {
            matchesStock =
              product.stock > 0 &&
              product.stock <=
                product.reorder_threshold;
          }

          if (
            stockFilter ===
            'out-of-stock'
          ) {
            matchesStock =
              product.stock <= 0;
          }

          return (
            matchesSearch &&
            matchesStock
          );
        }
      );
    }, [
      products,
      search,
      stockFilter,
    ]);

  // =========================
  // COUNTS
  // =========================

  const totalProducts =
    products.length;

  const totalUnits =
    products.reduce(
      (sum, product) =>
        sum +
        product.stock,
      0
    );

  const lowStockCount =
    products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <=
          product.reorder_threshold
    ).length;

  const outOfStockCount =
    products.filter(
      (product) =>
        product.stock <= 0
    ).length;

  // =========================
  // STOCK STATUS
  // =========================

  const getStockLabel = (
    stock: number,
    reorderThreshold: number
  ) => {
    if (stock <= 0) {
      return 'Out of Stock';
    }

    if (
      stock <=
      reorderThreshold
    ) {
      return 'Low Stock';
    }

    return 'In Stock';
  };

  const getStockClass = (
    stock: number,
    reorderThreshold: number
  ) => {
    if (stock <= 0) {
      return 'bg-red-100 text-red-800';
    }

    if (
      stock <=
      reorderThreshold
    ) {
      return 'bg-orange-100 text-orange-800';
    }

    return 'bg-green-100 text-green-800';
  };

  // =========================
  // REORDER THRESHOLD
  // =========================

  const handleThresholdChange = (
    productId: number,
    value: string
  ) => {
    setThresholdDrafts((previous) => ({
      ...previous,
      [productId]: value,
    }));
  };

  const saveReorderThreshold = async (
    product: Product
  ) => {
    setError('');
    setSuccess('');

    const rawValue =
      thresholdDrafts[product.id] ??
      String(product.reorder_threshold);

    const threshold = Number(rawValue);

    if (
      rawValue.trim() === '' ||
      !Number.isInteger(threshold) ||
      threshold < 0
    ) {
      setError(
        'Reorder threshold must be a whole number greater than or equal to 0.'
      );
      return;
    }

    try {
      setThresholdSavingId(product.id);

      const { error: updateError } =
        await supabase
          .from('products')
          .update({
            reorder_threshold: threshold,
          })
          .eq('id', product.id);

      if (updateError) {
        throw updateError;
      }

      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                reorder_threshold: threshold,
              }
            : item
        )
      );

      setThresholdDrafts((previous) => ({
        ...previous,
        [product.id]: String(threshold),
      }));

      setSuccess(
        `${product.name} reorder threshold updated to ${threshold}.`
      );
    } catch (err) {
      console.error(
        'Error updating reorder threshold:',
        err
      );

      setError(
        err instanceof Error
          ? `Unable to update reorder threshold: ${err.message}`
          : 'Unable to update reorder threshold.'
      );
    } finally {
      setThresholdSavingId(null);
    }
  };

  // =========================
  // PAGE
  // =========================

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-white shadow">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Inventory Management
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage stock and track
              inventory movements
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
          >
            ← Back to Dashboard
          </button>

        </div>

      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* SUMMARY */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Products
            </p>

            <p className="text-3xl font-bold text-gray-800 mt-1">
              {totalProducts}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Total Units
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-1">
              {totalUnits}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Low Stock
            </p>

            <p className="text-3xl font-bold text-orange-500 mt-1">
              {lowStockCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Out of Stock
            </p>

            <p className="text-3xl font-bold text-red-600 mt-1">
              {outOfStockCount}
            </p>
          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {/* RECORD MOVEMENT */}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Update Inventory
          </h2>

          <form
            onSubmit={
              handleRecordMovement
            }
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >

            {/* PRODUCT */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product
              </label>

              <select
                value={productId}
                onChange={(e) =>
                  setProductId(
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">
                  Select product
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {product.name}
                      {' — '}
                      Stock: {
                        product.stock
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* MOVEMENT */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Movement Type
              </label>

              <select
                value={
                  movementType
                }
                onChange={(e) =>
                  setMovementType(
                    e.target
                      .value as MovementType
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Restock">
                  Restock (+)
                </option>

                <option value="Adjustment">
                  Adjustment (+/-)
                </option>

                <option value="Damaged">
                  Damaged (-)
                </option>

                <option value="Return">
                  Return (+)
                </option>
              </select>
            </div>

            {/* QUANTITY */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                placeholder="Enter quantity"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* NEW STOCK */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projected Stock
              </label>

              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-semibold">
                {selectedProduct
                  ? projectedStock
                  : '—'}
              </div>
            </div>

            {/* REASON */}

            <div className="md:col-span-2 lg:col-span-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-1">
                <p className="text-sm font-semibold text-blue-800">
                  Low-stock threshold
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Set the reorder level for each product in the inventory table below. Low Stock Alerts will use that product-specific value.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-4">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason / Note
              </label>

              <input
                type="text"
                value={reason}
                onChange={(e) =>
                  setReason(
                    e.target.value
                  )
                }
                placeholder="e.g. New shipment, damaged item, stock correction..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* SAVE */}

            <div className="md:col-span-2 lg:col-span-4">

              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? 'Updating...'
                  : 'Update Inventory'}
              </button>

            </div>

          </form>

        </div>

        {/* PRODUCT FILTERS */}

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search products..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Status
              </label>

              <select
                value={
                  stockFilter
                }
                onChange={(e) =>
                  setStockFilter(
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  All
                </option>

                <option value="in-stock">
                  In Stock
                </option>

                <option value="low-stock">
                  Low Stock
                </option>

                <option value="out-of-stock">
                  Out of Stock
                </option>
              </select>
            </div>

          </div>

        </div>

        {/* CURRENT INVENTORY */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="text-lg font-bold text-gray-800">
              Current Inventory
            </h2>

          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-600">
              Loading inventory...
            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="p-10 text-center text-gray-600">
              No products found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px]">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Product
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Category
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Price
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Stock
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Reorder At
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredProducts.map(
                    (product) => (
                      <tr
                        key={
                          product.id
                        }
                        className="hover:bg-gray-50"
                      >

                        <td className="px-5 py-4 font-semibold text-gray-800">
                          {product.name}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            product.category
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatCurrency(
                            Number(product.price) || 0
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-800">
                          {
                            product.stock
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                thresholdDrafts[
                                  product.id
                                ] ??
                                String(
                                  product.reorder_threshold
                                )
                              }
                              onChange={(e) =>
                                handleThresholdChange(
                                  product.id,
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Reorder threshold for ${product.name}`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                saveReorderThreshold(
                                  product
                                )
                              }
                              disabled={
                                thresholdSavingId ===
                                product.id
                              }
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              {thresholdSavingId ===
                              product.id
                                ? 'Saving...'
                                : 'Save'}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStockClass(
                              product.stock,
                              product.reorder_threshold
                            )}`}
                          >
                            {getStockLabel(
                              product.stock,
                              product.reorder_threshold
                            )}
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* INVENTORY HISTORY */}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="text-lg font-bold text-gray-800">
              Inventory History
            </h2>

          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-600">
              Loading history...
            </div>
          ) : movements.length ===
            0 ? (
            <div className="p-10 text-center text-gray-600">
              No inventory movements yet.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Product
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Type
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Change
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Stock
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-gray-800">
                      Reason
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {movements.map(
                    (movement) => (
                      <tr
                        key={
                          movement.id
                        }
                        className="hover:bg-gray-50"
                      >

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {movement.created_at
                            ? new Date(
                                movement.created_at
                              ).toLocaleString()
                            : '—'}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-800">
                          {movement.product
                            ?.name ||
                            'Unknown Product'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            movement.movement_type
                          }
                        </td>

                        <td className="px-5 py-4 text-sm font-bold">
                          <span
                            className={
                              movement.change_quantity >=
                              0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {movement.change_quantity >
                            0
                              ? '+'
                              : ''}
                            {
                              movement.change_quantity
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            movement.previous_stock
                          }
                          {' → '}
                          {
                            movement.new_stock
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            movement.reason ||
                            '—'
                          }
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}