
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface Sale {
  id: number;
  product_id: number;
  amount: number;
  quantity: number;
  sale_date: string;
  product?: Product | null;
}

export default function Sales({
  onBack,
  userRole,
  userEmail,
}: {
  onBack: () => void;
  userRole?: string;
  userEmail?: string;
}) {
  const normalizedRole =
    (userRole || '').trim().toLowerCase();

  const canDeleteSales =
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'administrator';
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // =========================
  // CHANGE CALCULATOR
  // =========================

  const [amountDue, setAmountDue] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  // =========================
  // RECEIPT
  // =========================
  const [receiptSale, setReceiptSale] =
    useState<Sale | null>(null);
  const [receiptAmountReceived, setReceiptAmountReceived] =
    useState<number | null>(null);
  const [receiptChange, setReceiptChange] =
    useState<number | null>(null);

  // =========================
  // LOAD PRODUCTS
  // =========================

  const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, price, stock')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    const formattedProducts: Product[] = (data || []).map(
      (product) => ({
        id: Number(product.id),
        name: product.name || 'Unnamed Product',
        category: product.category || 'No category',
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
      })
    );

    setProducts(formattedProducts);

    return formattedProducts;
  };

  // =========================
  // LOAD SALES
  // =========================

  const fetchSales = async (
    currentProducts?: Product[]
  ) => {
    const { data, error } = await supabase
      .from('sales')
      .select(
        'id, product_id, amount, quantity, sale_date'
      )
      .order('sale_date', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    const productsToUse =
      currentProducts ?? products;

    const formattedSales: Sale[] =
      (data || []).map((sale) => ({
        id: Number(sale.id),
        product_id: Number(sale.product_id),
        amount: Number(sale.amount) || 0,
        quantity: Number(sale.quantity) || 0,
        sale_date: sale.sale_date,

        product:
          productsToUse.find(
            (product) =>
              Number(product.id) ===
              Number(sale.product_id)
          ) || null,
      }));

    setSales(formattedSales);
  };

  // =========================
  // LOAD EVERYTHING
  // =========================

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const loadedProducts =
        await fetchProducts();

      await fetchSales(loadedProducts);
    } catch (err) {
      console.error(
        'Error loading sales data:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to load sales: ${err.message}`
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
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // SELECTED PRODUCT
  // =========================

  const selectedProduct =
    products.find(
      (product) =>
        product.id === Number(productId)
    ) || null;

  // =========================
  // CALCULATE AMOUNT
  // =========================

  const saleQuantity =
    Number(quantity) || 0;

  const calculatedAmount =
    selectedProduct
      ? Number(selectedProduct.price) *
        saleQuantity
      : 0;

  // =========================
  // RECORD SALE
  // =========================

  const handleRecordSale = async (
  e: FormEvent
) => {
  e.preventDefault();

  setError('');
  setSuccess('');

  if (!productId) {
    setError('Please select a product.');
    return;
  }

  if (
    !quantity ||
    Number(quantity) <= 0 ||
    !Number.isInteger(Number(quantity))
  ) {
    setError(
      'Please enter a valid whole-number quantity.'
    );
    return;
  }

  if (!selectedProduct) {
    setError('Selected product not found.');
    return;
  }

  const newQuantity = Number(quantity);

  if (newQuantity > selectedProduct.stock) {
    setError(
      `Only ${selectedProduct.stock} unit${
        selectedProduct.stock === 1 ? '' : 's'
      } of ${selectedProduct.name} available in stock.`
    );
    return;
  }

  try {
    setSaving(true);

    const amount =
      Number(selectedProduct.price) * newQuantity;

    console.log('==============================');
    console.log('RECORDING SALE');
    console.log('Product ID:', selectedProduct.id);
    console.log('Product:', selectedProduct.name);
    console.log('Price:', selectedProduct.price);
    console.log('Quantity:', newQuantity);
    console.log('Amount:', amount);
    console.log('Current Stock:', selectedProduct.stock);
    console.log('==============================');

    // =========================
    // RECORD SALE + UPDATE STOCK
    // =========================
    //
    // Stock changes are performed by the database RPC.
    // Employees do not need direct UPDATE permission on
    // the products table to record a sale.
    //
    let saleResult: unknown = null;

    // Employees use the existing secure RPC signature:
    // (p_amount, p_employee_id, p_product_id, p_quantity).
    // Admin/Manager accounts can use their existing direct permissions.
    if (
      normalizedRole === 'employee' ||
      normalizedRole === 'staff' ||
      normalizedRole === 'cashier'
    ) {
      // Get the real authenticated email from Supabase first.
      // The parent prop is only a fallback, because localStorage/UI
      // state can be empty after navigation or refresh.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          authError.message ||
            'Unable to determine the authenticated account.'
        );
      }

      const cleanEmail = (
        user?.email ||
        userEmail ||
        ''
      )
        .trim()
        .toLowerCase();

      if (!cleanEmail) {
        throw new Error(
          'Your authenticated account has no email address.'
        );
      }

      const {
        data: employee,
        error: employeeError,
      } = await supabase
        .from('employees')
        .select('id, email, status')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (employeeError) {
        throw employeeError;
      }

      if (!employee) {
        throw new Error(
          'Your account is not linked to an employee record.'
        );
      }

      if (
        String(employee.status || '')
          .trim()
          .toLowerCase() !== 'active'
      ) {
        throw new Error(
          'Your employee account is not active.'
        );
      }

      const {
        data,
        error: saleError,
      } = await supabase.rpc(
        'record_sale_and_update_stock',
        {
          p_amount: amount,
          p_employee_id:
            Number(employee.id),
          p_product_id:
            Number(selectedProduct.id),
          p_quantity:
            Number(newQuantity),
        }
      );

      if (saleError) {
        console.error(
          'SUPABASE RECORD SALE RPC ERROR:',
          JSON.stringify(
            saleError,
            Object.getOwnPropertyNames(
              saleError
            ),
            2
          )
        );

        throw new Error(
          saleError.message ||
            saleError.details ||
            saleError.hint ||
            'Unable to record the sale.'
        );
      }

      saleResult = data;
    } else {
      // Admin/Manager: retain their existing direct database permissions.
      const {
        data: insertedSale,
        error: saleError,
      } = await supabase
        .from('sales')
        .insert({
          product_id:
            selectedProduct.id,
          amount,
          quantity:
            newQuantity,
          sale_date:
            new Date().toISOString(),
        })
        .select()
        .single();

      if (saleError) {
        console.error(
          'SUPABASE SALE ERROR:',
          JSON.stringify(
            saleError,
            Object.getOwnPropertyNames(
              saleError
            ),
            2
          )
        );

        throw new Error(
          saleError.message ||
            saleError.details ||
            saleError.hint ||
            'Unable to record the sale.'
        );
      }

      const {
        data: updatedProduct,
        error: stockError,
      } = await supabase
        .from('products')
        .update({
          stock:
            selectedProduct.stock -
            newQuantity,
        })
        .eq(
          'id',
          selectedProduct.id
        )
        .select()
        .single();

      if (stockError) {
        console.error(
          'SUPABASE STOCK ERROR:',
          JSON.stringify(
            stockError,
            Object.getOwnPropertyNames(
              stockError
            ),
            2
          )
        );

        // Do not claim the stock update succeeded.
        throw new Error(
          stockError.message ||
            stockError.details ||
            stockError.hint ||
            'Sale was recorded, but stock could not be updated.'
        );
      }

      saleResult = {
        sale: insertedSale,
        product:
          updatedProduct,
      };
    }

    console.log(
      'Sale recorded successfully:',
      saleResult
    );

    // =========================
    // RESET FORM
    // =========================

    setProductId('');
    setQuantity('');

    const recordedSale: Sale = {
      id: Number(
        (
          saleResult as {
            sale_id?: number;
            id?: number;
            sale?: { id?: number };
          }
        )?.sale_id ??
          (
            saleResult as {
              sale?: { id?: number };
              id?: number;
            }
          )?.sale?.id ??
          (
            saleResult as {
              id?: number;
            }
          )?.id ??
          Date.now()
      ),
      product_id: Number(selectedProduct.id),
      amount,
      quantity: newQuantity,
      sale_date: new Date().toISOString(),
      product: selectedProduct,
    };

    setReceiptSale(recordedSale);
    setReceiptAmountReceived(
      validAmountReceived
        ? parsedAmountReceived
        : null
    );
    setReceiptChange(
      validAmountDue && validAmountReceived
        ? Math.max(changeDue, 0)
        : null
    );

    setSuccess(
      `Sale recorded successfully. ${newQuantity} unit${
        newQuantity === 1 ? '' : 's'
      } of ${selectedProduct.name} sold.`
    );

    // =========================
    // REFRESH DATA
    // =========================

    await loadData();

  } catch (err) {
    console.error(
      'ERROR RECORDING SALE:',
      err
    );

    if (err instanceof Error) {
      setError(
        `Unable to record sale: ${err.message}`
      );
    } else {
      setError(
        'Unable to record sale. Check the browser console for details.'
      );
    }
  } finally {
    setSaving(false);
  }
};

  // =========================
  // PRINT RECEIPT
  // =========================
  const printReceipt = (
    sale: Sale,
    amountReceivedValue: number | null = null,
    changeValue: number | null = null
  ) => {
    setReceiptSale(sale);
    setReceiptAmountReceived(amountReceivedValue);
    setReceiptChange(changeValue);

    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  // =========================
  // DELETE SALE
  // =========================

  const handleDeleteSale = async (
    sale: Sale
  ) => {
    if (!canDeleteSales) {
      setError(
        'Employees cannot delete sales. Only Admin or Manager accounts can delete sales.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete this sale of ${
          sale.product?.name ??
          'Unknown Product'
        }?`
      );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      setSaving(true);

      // =========================
      // RESTORE STOCK
      // =========================

      const product =
        products.find(
          (item) =>
            Number(item.id) ===
            Number(sale.product_id)
        );

      if (product) {
        const restoredStock =
          Number(product.stock) +
          Number(sale.quantity);

        const { error: stockError } =
          await supabase
            .from('products')
            .update({
              stock: restoredStock,
            })
            .eq(
              'id',
              product.id
            );

        if (stockError) {
          throw stockError;
        }
      }

      // =========================
      // DELETE SALE
      // =========================

      const { error: deleteError } =
        await supabase
          .from('sales')
          .delete()
          .eq(
            'id',
            sale.id
          );

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        'Sale deleted successfully and stock restored.'
      );

      await loadData();
    } catch (err) {
      console.error(
        'Error deleting sale:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to delete sale: ${err.message}`
        );
      } else {
        setError(
          'Unable to delete sale.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredSales =
    sales.filter((sale) => {
      const searchTerm =
        search.toLowerCase().trim();

      const productName =
        sale.product?.name
          ?.toLowerCase() || '';

      const category =
        sale.product?.category
          ?.toLowerCase() || '';

      return (
        productName.includes(
          searchTerm
        ) ||
        category.includes(
          searchTerm
        ) ||
        String(
          sale.amount
        ).includes(searchTerm)
      );
    });

  // =========================
  // TOTALS
  // =========================

  const totalRevenue =
    sales.reduce(
      (total, sale) =>
        total +
        Number(sale.amount || 0),
      0
    );

  const totalUnits =
    sales.reduce(
      (total, sale) =>
        total +
        Number(sale.quantity || 0),
      0
    );

  // =========================
  // CHANGE CALCULATOR
  // =========================

  const parsedAmountDue = Number(amountDue);
  const parsedAmountReceived = Number(amountReceived);

  const validAmountDue =
    amountDue.trim() !== '' &&
    Number.isFinite(parsedAmountDue) &&
    parsedAmountDue >= 0;

  const validAmountReceived =
    amountReceived.trim() !== '' &&
    Number.isFinite(parsedAmountReceived) &&
    parsedAmountReceived >= 0;

  const changeDue =
    validAmountDue && validAmountReceived
      ? parsedAmountReceived - parsedAmountDue
      : 0;

  const customerHasPaidEnough =
    validAmountDue &&
    validAmountReceived &&
    changeDue >= 0;

  const calculatorCurrency = 'GH₵';

  const formatMoney = (value: number) =>
    `${calculatorCurrency} ${value.toFixed(2)}`;

  const [calculatorField, setCalculatorField] =
    useState<'due' | 'received'>('received');

  const appendCalculatorDigit = (digit: string) => {
    const setter =
      calculatorField === 'due'
        ? setAmountDue
        : setAmountReceived;

    setter((current) => {
      if (digit === '.' && current.includes('.')) {
        return current;
      }

      if (current === '0' && digit !== '.') {
        return digit;
      }

      const next = `${current}${digit}`;
      const decimals = next.split('.')[1] ?? '';

      if (decimals.length > 2) {
        return current;
      }

      return next;
    });
  };

  const deleteCalculatorDigit = () => {
    const setter =
      calculatorField === 'due'
        ? setAmountDue
        : setAmountReceived;

    setter((current) => current.slice(0, -1));
  };

  const clearCalculator = () => {
    setAmountDue('');
    setAmountReceived('');
    setCalculatorField('received');
  };

  const useSaleAmountForCalculator = () => {
    setAmountDue(calculatedAmount.toFixed(2));
    setCalculatorField('received');
  };

  const getChangeBreakdown = (value: number) => {
    let remaining = Math.round(value * 100);

    const denominations = [
      20000, 10000, 5000, 2000, 1000, 500, 200,
      100, 50, 20, 10, 5, 2, 1,
    ];

    const result: { amount: number; count: number }[] = [];

    for (const denomination of denominations) {
      if (remaining >= denomination) {
        const count = Math.floor(remaining / denomination);
        remaining -= count * denomination;

        result.push({
          amount: denomination / 100,
          count,
        });
      }
    }

    return result;
  };

  // =========================
  // PAGE
  // =========================

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-white shadow">

        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <h1 className="text-2xl font-bold text-gray-800">
            Sales Management
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

      {/* MAIN */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* SUCCESS */}

        {success && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-4 mb-6 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{success}</span>

              {receiptSale && (
                <button
                  type="button"
                  onClick={() =>
                    printReceipt(
                      receiptSale,
                      receiptAmountReceived,
                      receiptChange
                    )
                  }
                  className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition font-semibold cursor-pointer whitespace-nowrap"
                >
                  🖨️ Print Receipt
                </button>
              )}
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* RECORD SALE */}

          <div className="bg-white rounded-lg shadow-sm p-5 min-w-0">

            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Record New Sale
            </h2>

            <form
              onSubmit={
                handleRecordSale
              }
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} — {formatCurrency(
                          product.price || 0
                        )}
                        {' '}— Stock:{' '}
                        {Number(
                          product.stock || 0
                        )}
                      </option>
                    )
                  )}

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
                  max={
                    selectedProduct?.stock ||
                    undefined
                  }
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

              {/* AMOUNT */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Amount
                </label>

                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-semibold">
                  {formatCurrency(
                    calculatedAmount
                  )}
                </div>

              </div>

              {/* SAVE */}

              <div className="sm:col-span-2">

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? 'Recording...'
                    : 'Record Sale'}
                </button>

              </div>

            </form>

          </div>

          {/* ========================= */}
          {/* CHANGE CALCULATOR */}

          <section className="bg-white rounded-lg shadow-sm p-5 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                type="button"
                onClick={clearCalculator}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setCalculatorField('due')}
                className={`rounded-xl border-2 p-4 text-left transition cursor-pointer ${
                  calculatorField === 'due'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Amount Due
                </p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">
                  {formatMoney(validAmountDue ? parsedAmountDue : 0)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCalculatorField('received')}
                className={`rounded-xl border-2 p-4 text-left transition cursor-pointer ${
                  calculatorField === 'received'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Amount Received
                </p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">
                  {formatMoney(validAmountReceived ? parsedAmountReceived : 0)}
                </p>
              </button>
            </div>

            
              <div
                className="mt-2 min-h-14 px-4 py-3 rounded-xl bg-gray-800 text-white text-3xl font-extrabold text-right overflow-x-auto"
                aria-live="polite"
              >
                {calculatorField === 'due'
                  ? amountDue || '0.00'
                  : amountReceived || '0.00'}
              
            </div>

            <button
              type="button"
              onClick={useSaleAmountForCalculator}
              disabled={!selectedProduct || saleQuantity <= 0}
              className="w-full mb-4 bg-blue-100 text-blue-700 px-4 py-3 rounded-xl hover:bg-blue-200 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Use Current Sale Amount
            </button>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'].map(
                (digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => appendCalculatorDigit(digit)}
                    className="min-h-14 rounded-xl bg-gray-100 border border-gray-200 text-xl font-bold text-gray-800 hover:bg-gray-200 active:scale-95 transition cursor-pointer"
                  >
                    {digit}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={deleteCalculatorDigit}
                className="min-h-14 rounded-xl bg-orange-100 border border-orange-200 text-lg font-bold text-orange-800 hover:bg-orange-200 active:scale-95 transition cursor-pointer"
              >
                ⌫
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Change Due
              </p>

              <p
                className={`text-4xl font-extrabold mt-2 ${
                  customerHasPaidEnough
                    ? 'text-green-700'
                    : validAmountDue && validAmountReceived
                      ? 'text-red-700'
                      : 'text-blue-700'
                }`}
              >
                {formatMoney(Math.max(changeDue, 0))}
              </p>

              {validAmountDue &&
                validAmountReceived &&
                !customerHasPaidEnough && (
                  <p className="text-sm font-semibold text-red-700 mt-2">
                    Customer still owes {formatMoney(Math.abs(changeDue))}.
                  </p>
                )}
            </div>

            {customerHasPaidEnough && changeDue > 0 && (
              <div className="rounded-xl bg-white border border-gray-200 p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Suggested Change Breakdown
                </p>

                <div className="flex flex-wrap gap-2">
                  {getChangeBreakdown(changeDue).map((item) => (
                    <span
                      key={`${item.amount}-${item.count}`}
                      className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800"
                    >
                      {item.count} × {calculatorCurrency} {item.amount.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {customerHasPaidEnough && changeDue === 0 && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Exact payment — no change required.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* SALES SUMMARY - BELOW SALES + CALCULATOR */}

        <div className="grid grid-cols-2 gap-5 mb-5">

          <button
            type="button"
            className="bg-white rounded-lg shadow-sm p-5 text-left hover:shadow-md transition cursor-pointer"
          >
            <p className="text-gray-500 text-sm font-semibold">
              TOTAL REVENUE
            </p>

            <p className="text-2xl font-bold text-purple-600 mt-1">
              {formatCurrency(totalRevenue)}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Revenue from recorded sales
            </p>
          </button>

          <button
            type="button"
            className="bg-white rounded-lg shadow-sm p-5 text-left hover:shadow-md transition cursor-pointer"
          >
            <p className="text-gray-500 text-sm font-semibold">
              UNITS SOLD
            </p>

            <p className="text-2xl font-bold text-blue-600 mt-1">
              {totalUnits}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Total units recorded in sales
            </p>
          </button>

        </div>

        {/* SALES HISTORY */}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">

            <p className="text-gray-600">
              Loading sales...
            </p>

          </div>
        ) : filteredSales.length ===
          0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">

            <p className="text-gray-600">
              No sales found.
            </p>

          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Product
                    </th>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Category
                    </th>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Quantity
                    </th>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Date
                    </th>

                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredSales.map(
                    (sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {sale.product?.name ??
                            'Unknown Product'}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sale.product?.category ??
                            'No category'}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sale.quantity}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                          {formatCurrency(
                            sale.amount
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(
                            sale.sale_date
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => printReceipt(sale)}
                              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition cursor-pointer font-semibold"
                            >
                              🖨️ Print
                            </button>

                            {canDeleteSales ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSale(sale)
                                }
                                disabled={saving}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition cursor-pointer font-semibold disabled:opacity-50"
                              >
                                🗑️ Delete
                              </button>
                            ) : null}
                          </div>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

      {/* ========================= */}
      {/* PRINTABLE RECEIPT */}
      {/* ========================= */}
      {receiptSale && (
        <div className="print-receipt">
          <div className="receipt-paper">
            <h1>MOLUK ENTERPRISE</h1>
            <p className="receipt-title">SALES RECEIPT</p>

            <div className="receipt-divider" />

            <div className="receipt-meta">
              <div>
                <span>Receipt No.</span>
                <strong>
                  {String(receiptSale.id).padStart(6, '0')}
                </strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {new Date(
                    receiptSale.sale_date
                  ).toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Served by</span>
                <strong>
                  {userEmail || 'Sales Staff'}
                </strong>
              </div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-item">
              <div className="receipt-item-main">
                <strong>
                  {receiptSale.product?.name ?? 'Unknown Product'}
                </strong>
                <span>
                  {receiptSale.quantity} ×{' '}
                  {formatCurrency(
                    receiptSale.product?.price ??
                      Number(receiptSale.amount) /
                        Math.max(Number(receiptSale.quantity), 1)
                  )}
                </span>
              </div>

              <strong>
                {formatCurrency(receiptSale.amount)}
              </strong>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-total">
              <span>TOTAL</span>
              <strong>
                {formatCurrency(receiptSale.amount)}
              </strong>
            </div>

            {receiptAmountReceived !== null && (
              <div className="receipt-line">
                <span>Amount Received</span>
                <strong>
                  {formatMoney(receiptAmountReceived)}
                </strong>
              </div>
            )}

            {receiptChange !== null && (
              <div className="receipt-line">
                <span>Change</span>
                <strong>
                  {formatMoney(receiptChange)}
                </strong>
              </div>
            )}

            <div className="receipt-divider" />

            <p className="receipt-thanks">
              Thank you for shopping with Moluk Enterprise.
            </p>

            <p className="receipt-footer">
              Please keep this receipt for your records.
            </p>
          </div>
        </div>
      )}

      </main>

      <style jsx global>{`
        .print-receipt {
          display: none;
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 4mm;
          }

          body {
            margin: 0;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-receipt,
          .print-receipt * {
            visibility: visible !important;
          }

          .print-receipt {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .receipt-paper {
            width: 72mm;
            margin: 0 auto;
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            font-size: 12px;
            line-height: 1.35;
          }

          .receipt-paper h1 {
            margin: 0;
            text-align: center;
            font-size: 20px;
            font-weight: 800;
          }

          .receipt-title {
            margin: 2px 0 8px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
          }

          .receipt-divider {
            border-top: 1px dashed #111;
            margin: 8px 0;
          }

          .receipt-meta {
            display: grid;
            gap: 4px;
          }

          .receipt-meta div,
          .receipt-line,
          .receipt-total,
          .receipt-item {
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }

          .receipt-meta span,
          .receipt-line span {
            color: #444;
          }

          .receipt-meta strong {
            text-align: right;
            max-width: 48mm;
            overflow-wrap: anywhere;
          }

          .receipt-item {
            align-items: flex-start;
          }

          .receipt-item-main {
            display: grid;
            gap: 2px;
            max-width: 48mm;
          }

          .receipt-item-main span {
            color: #444;
          }

          .receipt-total {
            font-size: 14px;
            font-weight: 800;
          }

          .receipt-thanks {
            margin: 12px 0 4px;
            text-align: center;
            font-weight: 700;
          }

          .receipt-footer {
            margin: 0;
            text-align: center;
            color: #555;
            font-size: 10px;
          }
        }
      `}</style>

    </div>
  );
}