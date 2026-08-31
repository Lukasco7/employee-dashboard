'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string | null;
  loyalty_points: number;
  created_at: string;
}

interface Sale {
  id: number;
  product_id: number;
  amount: number;
  quantity: number;
  sale_date: string;
  product?: {
    name: string;
  } | null;
}

interface CustomerForm {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
}

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function Customers({
  onBack,
  onSales,
  onWishlist,
}: {
  onBack: () => void;
  onSales: () => void;
  onWishlist: (customerId: number) => void;
}) {
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [sales, setSales] =
    useState<Sale[]>([]);

  const [search, setSearch] =
    useState('');
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<number | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<CustomerForm>({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      notes: '',
    });

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

      const [customersResult, salesResult] =
        await Promise.all([
          supabase
            .from('customers')
            .select(
              'id, customer_code, first_name, last_name, phone, email, notes, loyalty_points, created_at'
            )
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('sales')
            .select(
              'id, product_id, amount, quantity, sale_date, products(name)'
            )
            .order('sale_date', {
              ascending: false,
            }),
        ]);

      if (customersResult.error) {
        throw new Error(
          `Customers: ${customersResult.error.message}`
        );
      }

      if (salesResult.error) {
        throw new Error(
          `Sales: ${salesResult.error.message}`
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
            notes:
              customer.notes || null,
            loyalty_points:
              Number(
                customer.loyalty_points || 0
              ),
            created_at:
              customer.created_at,
          })
        )
      );

      setSales(
        (salesResult.data || []).map(
          (sale: any) => ({
            id: Number(sale.id),
            product_id:
              Number(sale.product_id),
            amount:
              Number(sale.amount || 0),
            quantity:
              Number(sale.quantity || 0),
            sale_date:
              sale.sale_date,
            product:
              Array.isArray(sale.products)
                ? sale.products[0] || null
                : sale.products || null,
          })
        )
      );
    } catch (err) {
      console.error(
        'Error loading customer data:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load customer data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return customers;
    }

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
  }, [customers, search]);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === selectedCustomerId
    ) || null;

  const selectedCustomerSales =
    selectedCustomer
      ? sales.filter((sale) => {
          return false;
        })
      : [];

  const customerInitials = (
    customer: Customer
  ) => {
    const first =
      customer.first_name
        .charAt(0)
        .toUpperCase();

    const last =
      customer.last_name
        .charAt(0)
        .toUpperCase();

    return (
      `${first}${last}` || 'C'
    );
  };

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      notes: '',
    });
  };

  const generateCustomerCode = (
    existingCustomers: Customer[]
  ) => {
    const highestNumber =
      existingCustomers.reduce(
        (highest, customer) => {
          const match =
            /^CUST-(\\d+)$/i.exec(
              customer.customer_code || ''
            );

          if (!match) {
            return highest;
          }

          return Math.max(
            highest,
            Number(match[1])
          );
        },
        0
      );

    return `CUST-${String(
      highestNumber + 1
    ).padStart(6, '0')}`;
  };

  const handleCreateCustomer = async (
  event: FormEvent<HTMLFormElement>
) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const firstName =
      form.first_name.trim();
    const lastName =
      form.last_name.trim();
    const phone =
      form.phone.trim();
    const email =
      form.email.trim().toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !phone
    ) {
      setError(
        'First name, last name, and phone are required.'
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setError(
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setSaving(true);

      const customerCode =
        generateCustomerCode(customers);

      const { data, error: insertError } =
        await supabase
          .from('customers')
          .insert({
            customer_code: customerCode,
            first_name: firstName,
            last_name: lastName,
            phone,
            email: email || null,
            notes:
              form.notes.trim() || null,
          })
          .select(
            'id, customer_code, first_name, last_name, phone, email, notes, loyalty_points, created_at'
          )
          .single();

      if (insertError) {
        throw insertError;
      }

      const createdCustomer: Customer =
        {
          id: Number(data.id),
          customer_code:
            data.customer_code,
          first_name:
            data.first_name || '',
          last_name:
            data.last_name || '',
          phone:
            data.phone || '',
          email:
            data.email || '',
          notes:
            data.notes || null,
          loyalty_points:
            Number(
              data.loyalty_points || 0
            ),
          created_at:
            data.created_at,
        };

      setCustomers(
        (previous) => [
          createdCustomer,
          ...previous,
        ]
      );

      setSelectedCustomerId(
        createdCustomer.id
      );

      resetForm();
      setShowForm(false);

      setSuccess(
        `${createdCustomer.first_name} ${createdCustomer.last_name} was created successfully.`
      );
    } catch (err) {
      console.error(
        'CREATE CUSTOMER ERROR MESSAGE:',
        err instanceof Error
          ? err.message
          : 'No standard error message'
      );

      console.error(
        'CREATE CUSTOMER ERROR DETAILS:',
        (err as { details?: string })?.details ?? ''
      );

      console.error(
        'CREATE CUSTOMER ERROR HINT:',
        (err as { hint?: string })?.hint ?? ''
      );

      console.error(
        'CREATE CUSTOMER ERROR CODE:',
        (err as { code?: string })?.code ?? ''
      );

      console.error(
        'CREATE CUSTOMER ERROR FULL:',
        JSON.stringify(
          err,
          Object.getOwnPropertyNames(err),
          2
        )
      );

      setError(
        err instanceof Error
          ? `Unable to create customer: ${err.message}`
          : 'Unable to create customer.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Customers
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Create, search, and manage customer profiles
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setShowForm((value) => !value)
              }
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer"
            >
              {showForm
                ? 'Cancel'
                : '+ New Customer'}
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
              Customer Error
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

        {showForm && (
          <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Create New Customer
            </h2>

            <form
              onSubmit={handleCreateCustomer}
              className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  value={form.first_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      first_name:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="First name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  value={form.last_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      last_name:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Last name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Optional customer notes"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {saving
                    ? 'Creating...'
                    : 'Create Customer'}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Customer Directory
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredCustomers.length} customer
                    {filteredCustomers.length === 1
                      ? ''
                      : 's'}
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search name, phone, email, ID..."
                  className={`${inputClass} sm:max-w-sm`}
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-600">
                Loading customers...
              </div>
            ) : filteredCustomers.length ===
              0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">
                  👥
                </div>
                <p className="font-semibold text-gray-700">
                  No customers found.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Try another search or create a new customer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCustomers.map(
                  (customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        setSelectedCustomerId(
                          customer.id
                        )
                      }
                      className={`w-full text-left p-5 hover:bg-gray-50 transition cursor-pointer ${
                        selectedCustomerId ===
                        customer.id
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {customerInitials(
                            customer
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-gray-800">
                              {
                                customer.first_name
                              }{' '}
                              {
                                customer.last_name
                              }
                            </p>

                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {
                                customer.customer_code
                              }
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {customer.phone}
                            {customer.email
                              ? ` • ${customer.email}`
                              : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-yellow-600">
                            ⭐{' '}
                            {
                              customer.loyalty_points
                            }
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            points
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </section>

          <aside className="bg-white rounded-2xl shadow-sm p-6 h-fit">
            {!selectedCustomer ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">
                  👤
                </div>

                <p className="font-semibold text-gray-700">
                  Select a customer
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Choose a profile to see customer details.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 pb-5 border-b">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                    {customerInitials(
                      selectedCustomer
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {
                        selectedCustomer.first_name
                      }{' '}
                      {
                        selectedCustomer.last_name
                      }
                    </h2>

                    <p className="text-sm text-gray-500">
                      {
                        selectedCustomer.customer_code
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-5 mt-5">
                  <div>
                    <p className="text-xs uppercase font-semibold text-gray-500">
                      Phone
                    </p>
                    <p className="font-semibold text-gray-800 mt-1">
                      {
                        selectedCustomer.phone
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase font-semibold text-gray-500">
                      Email
                    </p>
                    <p className="font-semibold text-gray-800 mt-1 break-words">
                      {selectedCustomer.email ||
                        'Not provided'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4">
                    <p className="text-xs uppercase font-semibold text-yellow-700">
                      Loyalty Points
                    </p>
                    <p className="text-2xl font-bold text-yellow-800 mt-1">
                      {
                        selectedCustomer.loyalty_points
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase font-semibold text-gray-500">
                      Notes
                    </p>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {selectedCustomer.notes ||
                        'No notes'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase font-semibold text-gray-500">
                      Created
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {new Date(
                        selectedCustomer.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={onWishlist.bind(
                        null,
                        selectedCustomer.id
                      )}
                      className="w-full bg-pink-600 text-white px-5 py-3 rounded-lg hover:bg-pink-700 transition font-semibold cursor-pointer"
                    >
                      ❤️ Wishlists
                    </button>

                    <button
                      type="button"
                      onClick={onSales}
                      className="w-full bg-orange-600 text-white px-5 py-3 rounded-lg hover:bg-orange-700 transition font-semibold cursor-pointer"
                    >
                      🧾 View Sales
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
