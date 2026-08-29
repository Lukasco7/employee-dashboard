'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  category: string | null;
  price: number | string;
  stock: number;
}

interface WishlistItem {
  id: number;
  customer_id: number;
  product_id: number;
  note: string | null;
  status:
    | 'Interested'
    | 'Quote Sent'
    | 'Purchased'
    | 'Lost Sale';
  original_price: number;
  follow_up_date: string | null;
  created_at: string;
}

const STATUSES: WishlistItem['status'][] = [
  'Interested',
  'Quote Sent',
  'Purchased',
  'Lost Sale',
];

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500';

export default function WishlistFollowUp({
  onBack,
  customerId,
}: {
  onBack: () => void;
  customerId?: number | null;
}) {
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [products, setProducts] =
    useState<Product[]>([]);
  const [items, setItems] =
    useState<WishlistItem[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] =
    useState<number | null>(
      customerId ?? null
    );

  const [selectedItemId, setSelectedItemId] =
    useState<number | null>(null);

  const [customerSearch, setCustomerSearch] =
    useState('');
  const [activeOnly, setActiveOnly] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [productId, setProductId] =
    useState('');
  const [note, setNote] =
    useState('');
  const [status, setStatus] =
    useState<WishlistItem['status']>(
      'Interested'
    );
  const [followUpDate, setFollowUpDate] =
    useState('');

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState('');
  const [success, setSuccess] =
    useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        customersResult,
        productsResult,
        itemsResult,
      ] = await Promise.all([
        supabase
          .from('customers')
          .select(
            'id, customer_code, first_name, last_name, phone, email'
          )
          .order('first_name', {
            ascending: true,
          }),

        supabase
          .from('products')
          .select(
            'id, name, category, price, stock'
          )
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('customer_wishlist_items')
          .select(
            'id, customer_id, product_id, note, status, original_price, follow_up_date, created_at'
          )
          .order('created_at', {
            ascending: false,
          }),
      ]);

      if (customersResult.error) {
        throw new Error(
          `Customers: ${customersResult.error.message}`
        );
      }

      if (productsResult.error) {
        throw new Error(
          `Products: ${productsResult.error.message}`
        );
      }

      if (itemsResult.error) {
        throw new Error(
          `Wishlists: ${itemsResult.error.message}`
        );
      }

      setCustomers(
        (customersResult.data || []).map(
          (customer) => ({
            id: Number(customer.id),
            customer_code:
              customer.customer_code,
            first_name:
              customer.first_name || '',
            last_name:
              customer.last_name || '',
            phone:
              customer.phone || '',
            email:
              customer.email || '',
          })
        )
      );

      setProducts(
        (productsResult.data || []).map(
          (product) => ({
            id: Number(product.id),
            name:
              product.name ||
              'Unnamed Product',
            category:
              product.category ||
              null,
            price:
              Number(product.price) || 0,
            stock:
              Number(product.stock) || 0,
          })
        )
      );

      setItems(
        (itemsResult.data || []).map(
          (item) => ({
            id: Number(item.id),
            customer_id:
              Number(item.customer_id),
            product_id:
              Number(item.product_id),
            note:
              item.note || null,
            status:
              item.status || 'Interested',
            original_price:
              Number(
                item.original_price || 0
              ),
            follow_up_date:
              item.follow_up_date ||
              null,
            created_at:
              item.created_at,
          })
        )
      );
    } catch (err) {
      console.error(
        'Wishlist load error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load wishlist data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCustomer = (
    id: number
  ) =>
    customers.find(
      (customer) =>
        customer.id === id
    ) || null;

  const getProduct = (
    id: number
  ) =>
    products.find(
      (product) =>
        product.id === id
    ) || null;

  const selectedCustomer =
    selectedCustomerId
      ? getCustomer(
          selectedCustomerId
        )
      : null;

  const customerList = useMemo(() => {
    const term =
      customerSearch
        .trim()
        .toLowerCase();

    if (!term) return customers;

    return customers.filter(
      (customer) =>
        `${customer.first_name} ${customer.last_name}`
          .toLowerCase()
          .includes(term) ||
        customer.phone
          .toLowerCase()
          .includes(term) ||
        customer.email
          .toLowerCase()
          .includes(term) ||
        customer.customer_code
          .toLowerCase()
          .includes(term)
    );
  }, [customers, customerSearch]);

  const customerItems = useMemo(() => {
    if (!selectedCustomerId) {
      return [];
    }

    const filtered = items.filter(
      (item) =>
        item.customer_id ===
        selectedCustomerId
    );

    if (!activeOnly) {
      return filtered;
    }

    return filtered.filter(
      (item) =>
        item.status === 'Interested' ||
        item.status === 'Quote Sent'
    );
  }, [
    items,
    selectedCustomerId,
    activeOnly,
  ]);

  const activeFollowUps = useMemo(
    () =>
      items.filter(
        (item) =>
          item.follow_up_date &&
          (item.status === 'Interested' ||
            item.status === 'Quote Sent')
      ),
    [items]
  );

  const dueFollowUps = useMemo(() => {
    const today =
      new Date(
        `${new Date()
          .toISOString()
          .slice(0, 10)}T00:00:00`
      );

    return activeFollowUps.filter(
      (item) => {
        if (!item.follow_up_date) {
          return false;
        }

        return (
          new Date(
            `${item.follow_up_date}T00:00:00`
          ) <= today
        );
      }
    );
  }, [activeFollowUps]);

  const priceDropItems = useMemo(() => {
    return items.filter((item) => {
      const product =
        getProduct(item.product_id);

      return (
        product &&
        item.original_price > 0 &&
        Number(product.price) <
          item.original_price &&
        item.status !== 'Purchased' &&
        item.status !== 'Lost Sale'
      );
    });
  }, [items, products]);

  const backInStockItems = useMemo(() => {
    return items.filter((item) => {
      const product =
        getProduct(item.product_id);

      return (
        product &&
        product.stock > 0 &&
        item.status !== 'Purchased' &&
        item.status !== 'Lost Sale'
      );
    });
  }, [items, products]);

  const resetForm = () => {
    setProductId('');
    setNote('');
    setStatus('Interested');
    setFollowUpDate('');
  };

  const openNewWishlistForm = () => {
    setError('');
    setSuccess('');

    if (!selectedCustomerId) {
      setError(
        'Select a customer before adding a wishlist item.'
      );
      return;
    }

    resetForm();
    setShowForm(true);
  };

  const handleAddItem = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedCustomerId) {
      setError(
        'Please select a customer.'
      );
      return;
    }

    if (!productId) {
      setError(
        'Please select a product.'
      );
      return;
    }

    if (followUpDate) {
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      if (followUpDate < today) {
        setError(
          'Follow-up date cannot be in the past.'
        );
        return;
      }
    }

    const product =
      getProduct(
        Number(productId)
      );

    if (!product) {
      setError(
        'Selected product could not be found.'
      );
      return;
    }

    try {
      setSaving(true);

      const { data, error: insertError } =
        await supabase
          .from('customer_wishlist_items')
          .insert({
            customer_id:
              selectedCustomerId,
            product_id:
              Number(productId),
            note:
              note.trim() || null,
            status,
            original_price:
              Number(product.price) || 0,
            follow_up_date:
              followUpDate || null,
          })
          .select(
            'id, customer_id, product_id, note, status, original_price, follow_up_date, created_at'
          )
          .single();

      if (insertError) {
        throw insertError;
      }

      const newItem: WishlistItem =
        {
          id: Number(data.id),
          customer_id:
            Number(data.customer_id),
          product_id:
            Number(data.product_id),
          note:
            data.note || null,
          status:
            data.status || 'Interested',
          original_price:
            Number(
              data.original_price || 0
            ),
          follow_up_date:
            data.follow_up_date ||
            null,
          created_at:
            data.created_at,
        };

      setItems(
        (previous) => [
          newItem,
          ...previous,
        ]
      );

      setShowForm(false);
      resetForm();

      setSuccess(
        'Wishlist item added successfully.'
      );
    } catch (err) {
      console.error(
        'Add wishlist item error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to add wishlist item.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    item: WishlistItem,
    nextStatus: WishlistItem['status']
  ) => {
    setError('');
    setSuccess('');

    try {
      setSaving(true);

      const { error: updateError } =
        await supabase
          .from('customer_wishlist_items')
          .update({
            status: nextStatus,
          })
          .eq(
            'id',
            item.id
          );

      if (updateError) {
        throw updateError;
      }

      setItems(
        (previous) =>
          previous.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status:
                    nextStatus,
                }
              : current
          )
      );

      setSuccess(
        `Wishlist status updated to ${nextStatus}.`
      );
    } catch (err) {
      console.error(
        'Wishlist status update error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update wishlist status.'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (
    value: number
  ) =>
    `GH₵ ${value.toFixed(2)}`;

  const statusClass = (
    value: WishlistItem['status']
  ) => {
    if (value === 'Purchased') {
      return 'bg-green-100 text-green-800';
    }

    if (value === 'Lost Sale') {
      return 'bg-gray-100 text-gray-700';
    }

    if (value === 'Quote Sent') {
      return 'bg-purple-100 text-purple-800';
    }

    return 'bg-blue-100 text-blue-800';
  };

  const selectCustomer = (
    id: number
  ) => {
    setSelectedCustomerId(id);
    setSelectedItemId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Wishlist & Follow-up
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track customer interests and follow up on opportunities
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadData}
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
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            <p className="font-semibold">
              Wishlist Error
            </p>
            <p className="text-sm mt-1">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-xl p-4 mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Active Wishlist Items
            </p>
            <p className="text-3xl font-bold text-pink-600 mt-2">
              {activeFollowUps.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Follow-ups Due
            </p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {dueFollowUps.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Price Drops
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {priceDropItems.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Back in Stock
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {backInStockItems.length}
            </p>
          </div>
        </div>

        {(dueFollowUps.length > 0 ||
          priceDropItems.length > 0 ||
          backInStockItems.length > 0) && (
          <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Follow-up Alerts
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              {dueFollowUps.length >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveOnly(true)
                  }
                  className="text-left rounded-xl border border-orange-200 bg-orange-50 p-4 hover:shadow-md transition cursor-pointer"
                >
                  <p className="font-bold text-orange-800">
                    ⏰ Follow-up due
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    {dueFollowUps.length}{' '}
                    item
                    {dueFollowUps.length ===
                    1
                      ? ''
                      : 's'}{' '}
                    need attention.
                  </p>
                </button>
              )}

              {priceDropItems.length >
                0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="font-bold text-green-800">
                    💲 Price drop
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {priceDropItems.length}{' '}
                    wishlist item
                    {priceDropItems.length ===
                    1
                      ? ''
                      : 's'}{' '}
                    became cheaper.
                  </p>
                </div>
              )}

              {backInStockItems.length >
                0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-bold text-blue-800">
                    📦 Back in stock
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {backInStockItems.length}{' '}
                    wishlist item
                    {backInStockItems.length ===
                    1
                      ? ''
                      : 's'}{' '}
                    are available again.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                Customers
              </h2>

              <input
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(
                    event.target.value
                  )
                }
                placeholder="Search customers..."
                className={`${inputClass} mt-4`}
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading...
              </div>
            ) : customerList.length ===
              0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold text-gray-700">
                  No customers found.
                </p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto divide-y">
                {customerList.map(
                  (customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        selectCustomer(
                          customer.id
                        )
                      }
                      className={`w-full text-left p-4 hover:bg-gray-50 transition cursor-pointer ${
                        selectedCustomerId ===
                        customer.id
                          ? 'bg-pink-50'
                          : ''
                      }`}
                    >
                      <p className="font-semibold text-gray-800">
                        {
                          customer.first_name
                        }{' '}
                        {
                          customer.last_name
                        }
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {
                          customer.customer_code
                        }
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {customer.phone}
                      </p>
                    </button>
                  )
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              {!selectedCustomer ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Select a customer
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Choose a customer to view and manage their wishlist.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-pink-600">
                      Customer Wishlist
                    </p>

                    <h2 className="text-xl font-bold text-gray-800 mt-1">
                      {
                        selectedCustomer.first_name
                      }{' '}
                      {
                        selectedCustomer.last_name
                      }
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      {
                        selectedCustomer.customer_code
                      }
                      {' • '}
                      {
                        selectedCustomer.phone
                      }
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveOnly(
                          !activeOnly
                        )
                      }
                      className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                    >
                      {activeOnly
                        ? 'Show All'
                        : 'Active Only'}
                    </button>

                    <button
                      type="button"
                      onClick={
                        openNewWishlistForm
                      }
                      className="bg-pink-600 text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 transition font-semibold cursor-pointer"
                    >
                      + Add to Wishlist
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedCustomer &&
              showForm && (
                <div className="p-6 bg-pink-50 border-b border-pink-100">
                  <h3 className="font-bold text-gray-800">
                    Add Wishlist Item
                  </h3>

                  <form
                    onSubmit={
                      handleAddItem
                    }
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product
                      </label>

                      <select
                        value={productId}
                        onChange={(event) =>
                          setProductId(
                            event.target.value
                          )
                        }
                        className={inputClass}
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
                              {
                                product.name
                              }{' '}
                              —{' '}
                              {formatCurrency(
                                Number(
                                  product.price
                                )
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>

                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(
                            event.target.value as WishlistItem['status']
                          )
                        }
                        className={inputClass}
                      >
                        {STATUSES.map(
                          (value) => (
                            <option
                              key={value}
                              value={
                                value
                              }
                            >
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date
                      </label>

                      <input
                        type="date"
                        value={
                          followUpDate
                        }
                        onChange={(event) =>
                          setFollowUpDate(
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note
                      </label>

                      <input
                        value={note}
                        onChange={(event) =>
                          setNote(
                            event.target.value
                          )
                        }
                        placeholder="e.g. Interested in the black model"
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2 flex gap-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {saving
                          ? 'Saving...'
                          : 'Save Wishlist Item'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowForm(false)
                        }
                        className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

            {!selectedCustomer ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">
                  ❤️
                </div>
                <p className="font-semibold text-gray-700">
                  No customer selected
                </p>
              </div>
            ) : customerItems.length ===
              0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">
                  ❤️
                </div>
                <p className="font-semibold text-gray-700">
                  No wishlist items
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Add a product the customer is interested in.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {customerItems.map(
                  (item) => {
                    const product =
                      getProduct(
                        item.product_id
                      );

                    const priceDrop =
                      product &&
                      item.original_price >
                        0 &&
                      Number(
                        product.price
                      ) <
                        item.original_price;

                    const backInStock =
                      product &&
                      product.stock > 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-6 ${
                          selectedItemId ===
                          item.id
                            ? 'bg-gray-50'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-800">
                                {product?.name ||
                                  'Product unavailable'}
                              </h3>

                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                                  item.status
                                )}`}
                              >
                                {
                                  item.status
                                }
                              </span>

                              {priceDrop && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  💲 Price Drop
                                </span>
                              )}

                              {backInStock && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  📦 In Stock
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                              <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">
                                  Current Price
                                </p>
                                <p className="font-bold text-gray-800 mt-1">
                                  {product
                                    ? formatCurrency(
                                        Number(
                                          product.price
                                        )
                                      )
                                    : '—'}
                                </p>
                              </div>

                              <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">
                                  Stock
                                </p>
                                <p className="font-bold text-gray-800 mt-1">
                                  {product
                                    ? product.stock
                                    : '—'}
                                </p>
                              </div>

                              <div className="bg-white rounded-xl border border-gray-200 p-3">
                                <p className="text-xs text-gray-500">
                                  Follow-up
                                </p>
                                <p className="font-bold text-gray-800 mt-1">
                                  {item.follow_up_date
                                    ? new Date(
                                        `${item.follow_up_date}T00:00:00`
                                      ).toLocaleDateString()
                                    : 'Not set'}
                                </p>
                              </div>
                            </div>

                            {item.original_price >
                              0 && (
                              <p className="text-xs text-gray-500 mt-3">
                                Original price:{' '}
                                {formatCurrency(
                                  item.original_price
                                )}
                              </p>
                            )}

                            {item.note && (
                              <p className="text-sm text-gray-600 mt-3">
                                <span className="font-semibold">
                                  Note:
                                </span>{' '}
                                {item.note}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row xl:flex-col gap-2">
                            <select
                              value={
                                item.status
                              }
                              onChange={(event) =>
                                handleUpdateStatus(
                                  item,
                                  event.target
                                    .value as WishlistItem['status']
                                )
                              }
                              disabled={saving}
                              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold cursor-pointer"
                            >
                              {STATUSES.map(
                                (
                                  value
                                ) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {value}
                                  </option>
                                )
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedItemId(
                                  item.id
                                )
                              }
                              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        </div>

                        {selectedItemId ===
                          item.id && (
                          <div className="mt-5 border-t pt-5">
                            <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">
                              Follow-up Summary
                            </p>

                            <p className="text-sm text-gray-700 mt-2">
                              Customer:{' '}
                              {
                                selectedCustomer.first_name
                              }{' '}
                              {
                                selectedCustomer.last_name
                              }
                            </p>

                            <p className="text-sm text-gray-700 mt-1">
                              Product:{' '}
                              {product?.name ||
                                'Unavailable'}
                            </p>

                            {priceDrop && (
                              <p className="text-sm text-green-700 font-semibold mt-2">
                                Price dropped from{' '}
                                {formatCurrency(
                                  item.original_price
                                )}{' '}
                                to{' '}
                                {formatCurrency(
                                  Number(
                                    product?.price ||
                                      0
                                  )
                                )}
                                .
                              </p>
                            )}

                            {backInStock && (
                              <p className="text-sm text-blue-700 font-semibold mt-2">
                                This product currently has stock available.
                              </p>
                            )}

                            {item.follow_up_date && (
                              <p className="text-sm text-orange-700 font-semibold mt-2">
                                Follow up on{' '}
                                {new Date(
                                  `${item.follow_up_date}T00:00:00`
                                ).toLocaleDateString()}
                                .
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
