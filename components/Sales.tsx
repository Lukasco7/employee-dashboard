'use client';

import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product { id: number; name: string; category: string; price: number; stock: number; barcode: string | null; }
interface CartItem { product: Product; quantity: number; }
interface SaleItem { id: number; product_id: number; quantity: number; unit_price: number; line_total: number; product: Product | null; }
interface SaleTransaction {
  id: number; receipt_number: string | null; employee_id: number | null; customer_id: number | null;
  subtotal: number; discount: number; tax: number; total_amount: number; amount_received: number;
  change_amount: number; payment_method: string; status: string; created_at: string; items: SaleItem[];
}

interface SalesProps {
  onBack: () => void;
  onBarcode?: () => void;
  userRole?: string;
  userEmail?: string;
  productToAdd?: { id: number; name: string; category: string; price: number | string; stock: number; barcode: string | null } | null;
}

export default function Sales({ onBack, onBarcode, userRole, userEmail, productToAdd }: SalesProps) {
  const role = (userRole || '').trim().toLowerCase();
  const canDeleteSales = role === 'admin' || role === 'manager' || role === 'administrator';

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!productToAdd) return [];
    return [{
      product: {
        id: Number(productToAdd.id),
        name: productToAdd.name || 'Unnamed Product',
        category: productToAdd.category || 'No category',
        price: Number(productToAdd.price) || 0,
        stock: Number(productToAdd.stock) || 0,
        barcode: productToAdd.barcode || null,
      },
      quantity: 1,
    }];
  });
  const [employeeName, setEmployeeName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productSearchActive, setProductSearchActive] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [amountReceived, setAmountReceived] = useState('');
  const [receiptData, setReceiptData] = useState<SaleTransaction | null>(null);
  const [receiptAmountReceived, setReceiptAmountReceived] = useState<number | null>(null);
  const [receiptChange, setReceiptChange] = useState<number | null>(null);

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    const { data, error } = await supabase.from('products').select('id, name, category, price, stock, barcode').order('name', { ascending: true });
    if (error) throw error;
    const formatted = (data || []).map((p) => ({ id: Number(p.id), name: p.name || 'Unnamed Product', category: p.category || 'No category', price: Number(p.price) || 0, stock: Number(p.stock) || 0, barcode: p.barcode || null }));
    setProducts(formatted);
    return formatted;
  }, []);

  const fetchSales = useCallback(async (currentProducts: Product[]) => {
    const { data: transactions, error: transactionError } = await supabase
      .from('sale_transactions')
      .select('id, receipt_number, employee_id, customer_id, subtotal, discount, tax, total_amount, amount_received, change_amount, payment_method, status, created_at')
      .order('created_at', { ascending: false });
    if (transactionError) throw transactionError;

    const ids = (transactions || []).map((t) => Number(t.id));
    let rawItems: Array<{ id: number; transaction_id: number; product_id: number; quantity: number; unit_price: number; line_total: number }> = [];
    if (ids.length) {
      const { data, error } = await supabase.from('sale_items').select('id, transaction_id, product_id, quantity, unit_price, line_total').in('transaction_id', ids);
      if (error) throw error;
      rawItems = (data || []).map((i) => ({ id: Number(i.id), transaction_id: Number(i.transaction_id), product_id: Number(i.product_id), quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0, line_total: Number(i.line_total) || 0 }));
    }

    setSales((transactions || []).map((t) => {
      const id = Number(t.id);
      return {
        id,
        receipt_number: t.receipt_number || null,
        employee_id: t.employee_id == null ? null : Number(t.employee_id),
        customer_id: t.customer_id == null ? null : Number(t.customer_id),
        subtotal: Number(t.subtotal) || 0,
        discount: Number(t.discount) || 0,
        tax: Number(t.tax) || 0,
        total_amount: Number(t.total_amount) || 0,
        amount_received: Number(t.amount_received) || 0,
        change_amount: Number(t.change_amount) || 0,
        payment_method: String(t.payment_method || 'cash'),
        status: String(t.status || 'completed'),
        created_at: t.created_at,
        items: rawItems.filter((i) => i.transaction_id === id).map((i) => ({
          id: i.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, line_total: i.line_total,
          product: currentProducts.find((p) => p.id === i.product_id) || null,
        })),
      };
    }));
  }, []);

  const fetchEmployeeName = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = (user?.email || userEmail || '').trim().toLowerCase();
    if (!email) return;
    const { data } = await supabase.from('employees').select('name, first_name, last_name').ilike('email', email).maybeSingle();
    if (!data) return;
    const fullName = `${String(data.first_name || '').trim()} ${String(data.last_name || '').trim()}`.trim();
    setEmployeeName(fullName || String(data.name || '').trim() || 'Sales Staff');
  }, [userEmail]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const loadedProducts = await fetchProducts();
      await fetchSales(loadedProducts);
      await fetchEmployeeName();
    } catch (err) {
      console.error('Error loading sales data:', err);
      setError(err instanceof Error ? `Unable to load sales: ${err.message}` : 'Unable to load sales data.');
    } finally { setLoading(false); }
  }, [fetchProducts, fetchSales, fetchEmployeeName]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const loadedProducts = await fetchProducts();
        if (cancelled) return;

        await fetchSales(loadedProducts);
        if (cancelled) return;

        await fetchEmployeeName();
      } catch (err) {
        if (cancelled) return;

        console.error('Error loading sales data:', err);
        setError(
          err instanceof Error
            ? `Unable to load sales: ${err.message}`
            : 'Unable to load sales data.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [fetchProducts, fetchSales, fetchEmployeeName]);

  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const productSearchResults = normalizedProductSearch
    ? products.filter((p) => p.name.toLowerCase().includes(normalizedProductSearch) || p.category.toLowerCase().includes(normalizedProductSearch) || String(p.id).includes(normalizedProductSearch) || (p.barcode || '').toLowerCase().includes(normalizedProductSearch))
    : products.slice(0, 8);

  const selectedProduct = products.find((p) => p.id === Number(productId)) || null;
  const saleQuantity = Number(quantity) || 0;
  const selectedCartQuantity = selectedProduct ? cart.find((i) => i.product.id === selectedProduct.id)?.quantity || 0 : 0;
  const availableToAdd = selectedProduct ? Math.max(selectedProduct.stock - selectedCartQuantity, 0) : 0;
  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartTotal = cartSubtotal;
  const cartUnits = cart.reduce((sum, i) => sum + i.quantity, 0);
  const selectedLineAmount = selectedProduct ? selectedProduct.price * saleQuantity : 0;

  const handleProductSearch = () => {
    if (!productSearch.trim()) { setProductSearchActive(true); return; }
    if (productSearchResults.length === 1) {
      const p = productSearchResults[0];
      if (p.stock <= 0) { setError(`${p.name} is currently out of stock.`); return; }
      setProductId(String(p.id)); setQuantity('1'); setProductSearch(''); setProductSearchActive(false); setError(''); return;
    }
    setProductSearchActive(true);
  };
  const handleProductSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleProductSearch(); } };
  const selectSearchedProduct = (p: Product) => { if (p.stock <= 0) { setError(`${p.name} is currently out of stock.`); return; } setProductId(String(p.id)); setQuantity('1'); setProductSearch(''); setProductSearchActive(false); setError(''); };

  const handleAddToCart = (e?: FormEvent) => {
    e?.preventDefault(); setError(''); setSuccess('');
    if (!selectedProduct) { setError('Please select a product.'); return; }
    if (!quantity || saleQuantity <= 0 || !Number.isInteger(saleQuantity)) { setError('Please enter a valid whole-number quantity.'); return; }
    if (saleQuantity > availableToAdd) { setError(`Only ${availableToAdd} additional unit${availableToAdd === 1 ? '' : 's'} of ${selectedProduct.name} can be added.`); return; }
    const existing = cart.find((i) => i.product.id === selectedProduct.id);
    const nextCart = existing
      ? cart.map((i) =>
          i.product.id === selectedProduct.id
            ? { ...i, quantity: i.quantity + saleQuantity }
            : i
        )
      : [...cart, { product: selectedProduct, quantity: saleQuantity }];

    setCart(nextCart);
    setProductId('');
    setQuantity('');
    setSuccess(`${selectedProduct.name} added to the cart.`);
  };

  const updateCartQuantity = (id: number, next: number) => {
    const item = cart.find((i) => i.product.id === id);
    if (!item || !Number.isInteger(next) || next < 1) return;
    if (next > item.product.stock) { setError(`Only ${item.product.stock} unit${item.product.stock === 1 ? '' : 's'} of ${item.product.name} available in stock.`); return; }
    const nextCart = cart.map((i) =>
      i.product.id === id ? { ...i, quantity: next } : i
    );

    setError('');
    setCart(nextCart);
  };

  const removeFromCart = (id: number) => {
    const nextCart = cart.filter((i) => i.product.id !== id);
    setCart(nextCart);
  };

  const clearCart = () => {
    setCart([]);
    setError('');
    setSuccess('');
    setReceiptData(null);
    setReceiptAmountReceived(null);
    setReceiptChange(null);
  };

  const parsedAmountReceived = Number(amountReceived);
  const validAmountReceived = amountReceived.trim() !== '' && Number.isFinite(parsedAmountReceived) && parsedAmountReceived >= 0;
  const changeDue = validAmountReceived ? parsedAmountReceived - cartTotal : 0;
  const customerHasPaidEnough = validAmountReceived && changeDue >= 0;

  const handleRecordSale = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!cart.length) { setError('Please add at least one product to the cart.'); return; }
    if (cart.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0 || i.quantity > i.product.stock)) { setError('One or more cart quantities are invalid or exceed stock.'); return; }
    if (!validAmountReceived || parsedAmountReceived < cartTotal) { setError(`Amount received must be at least ${formatCurrency(cartTotal)}.`); return; }
    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('checkout_sale', {
        p_items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        p_customer_id: null, p_amount_received: parsedAmountReceived, p_payment_method: paymentMethod, p_discount: 0, p_tax: 0,
      });
      if (error) throw new Error(error.message || error.details || error.hint || 'Unable to complete the sale.');
      const result = (data || {}) as { transaction_id?: number; receipt_number?: string; subtotal?: number; discount?: number; tax?: number; total?: number; amount_received?: number; change?: number; payment_method?: string; employee_id?: number | null };
      const id = Number(result.transaction_id || 0);
      if (!id) throw new Error('Checkout completed without a transaction ID.');
      const total = Number(result.total ?? cartTotal);
      const received = Number(result.amount_received ?? parsedAmountReceived);
      const change = Number(result.change ?? Math.max(received - total, 0));
      const transaction: SaleTransaction = {
        id, receipt_number: result.receipt_number || null,
        employee_id: result.employee_id == null ? null : Number(result.employee_id), customer_id: null,
        subtotal: Number(result.subtotal ?? cartSubtotal), discount: Number(result.discount ?? 0), tax: Number(result.tax ?? 0),
        total_amount: total, amount_received: received, change_amount: change, payment_method: result.payment_method || paymentMethod,
        status: 'completed', created_at: new Date().toISOString(),
        items: cart.map((i, index) => ({ id: -(index + 1), product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price, line_total: i.product.price * i.quantity, product: i.product })),
      };
      setReceiptData(transaction); setReceiptAmountReceived(received); setReceiptChange(change);
      setCart([]); setProductId(''); setQuantity(''); setAmountReceived(''); setPaymentMethod('cash');
      setSuccess(`Sale completed successfully. Receipt ${result.receipt_number || `#${id}`}.`);
      await loadData();
    } catch (err) { console.error('ERROR RECORDING SALE:', err); setError(err instanceof Error ? `Unable to complete sale: ${err.message}` : 'Unable to complete sale.'); }
    finally { setSaving(false); }
  };

  const printReceipt = (transaction: SaleTransaction, received: number | null = null, change: number | null = null) => {
    setReceiptData(transaction); setReceiptAmountReceived(received ?? transaction.amount_received); setReceiptChange(change ?? transaction.change_amount);
    window.setTimeout(() => window.print(), 100);
  };

  const handleDeleteSale = async (transaction: SaleTransaction) => {
    if (!canDeleteSales) { setError('Employees cannot delete sales. Only Admin or Manager accounts can delete sales.'); return; }
    const items = transaction.items.map((i) => `${i.product?.name || 'Unknown Product'} × ${i.quantity}`).join(', ') || 'No line items';
    if (!window.confirm(`Delete transaction ${transaction.receipt_number || `#${transaction.id}`}?\n\n${items}\n\nStock will not be restored.`)) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      const { error } = await supabase.from('sale_transactions').delete().eq('id', transaction.id);
      if (error) throw error;
      if (transaction.receipt_number?.startsWith('LEGACY-')) {
        const legacyId = Number(transaction.receipt_number.replace('LEGACY-', ''));
        if (Number.isInteger(legacyId) && legacyId > 0) {
          const { error: legacyError } = await supabase.from('sales').delete().eq('id', legacyId);
          if (legacyError) console.warn('Transaction deleted, but legacy sales record could not be removed:', legacyError);
        }
      }
      setSuccess('Sale deleted successfully.'); await loadData();
    } catch (err) { console.error('Error deleting sale:', err); setError(err instanceof Error ? `Unable to delete sale: ${err.message}` : 'Unable to delete sale.'); }
    finally { setSaving(false); }
  };

  const filteredSales = sales.filter((sale) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (sale.receipt_number || '').toLowerCase().includes(term) || sale.payment_method.toLowerCase().includes(term) || String(sale.total_amount).includes(term) || sale.items.some((i) => (i.product?.name || '').toLowerCase().includes(term) || (i.product?.category || '').toLowerCase().includes(term));
  });
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalUnits = sales.reduce((sum, sale) => sum + sale.items.reduce((n, i) => n + i.quantity, 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Sales Management</h1>
          <button type="button" onClick={onBack} className="bg-blue-600 text-white px-3 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer font-medium">← Back to Dashboard</button>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {success && <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-2 mb-3 print:hidden"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><span>{success}</span>{receiptData && <button type="button" onClick={() => printReceipt(receiptData, receiptAmountReceived, receiptChange)} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition font-semibold cursor-pointer whitespace-nowrap">🖨️ Print Receipt</button>}</div></div>}
        {error && <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-2 mb-3">{error}</div>}

        <div className="grid grid-cols-1 gap-5 mb-5">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 min-w-0 xl:grid xl:grid-cols-2 xl:gap-5">
            <div className="flex items-center gap-3 mb-4 xl:col-span-2"><div className="h-10 w-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-lg">🛒</div><div><h2 className="text-lg font-bold text-gray-900">Sales</h2><p className="text-sm text-gray-500 mt-0.5"></p></div></div>
            <form onSubmit={handleAddToCart} className="space-y-4 xl:col-start-1 xl:row-start-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Product</label>
                <div className="flex gap-2">
                  <input type="text" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setProductSearchActive(true); }} onFocus={() => setProductSearchActive(true)} onKeyDown={handleProductSearchKeyDown} placeholder="Search by name, category, ID, or barcode..." className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                  <button type="button" onClick={handleProductSearch} className="shrink-0 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer shadow-sm">🔍 Search</button>{onBarcode && <button type="button" onClick={onBarcode} className="shrink-0 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-sm">📷 Scan</button>}
                  {productSearchActive && <button type="button" onClick={() => { setProductSearch(''); setProductSearchActive(false); }} className="shrink-0 px-3 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition cursor-pointer" aria-label="Clear product search">✕</button>}
                </div>
                {productSearchActive && <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">{productSearchResults.length ? productSearchResults.map((p) => <button key={p.id} type="button" onClick={() => selectSearchedProduct(p)} disabled={p.stock <= 0} className="w-full px-4 py-3 text-left border-b last:border-b-0 border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-gray-900 truncate">{p.name}</p><p className="text-xs text-gray-500 mt-0.5">{p.category} · ID {p.id}{p.barcode ? ` · ${p.barcode}` : ''}</p></div><div className="text-right shrink-0"><p className="font-bold text-gray-900">{formatCurrency(p.price)}</p><p className={`text-xs font-semibold ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p></div></div></button>) : <p className="px-4 py-4 text-sm text-gray-500">No matching products found.</p>}</div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Product</label><select value={productId} onChange={(e) => { setProductId(e.target.value); setQuantity(e.target.value ? '1' : ''); }} onFocus={() => { void fetchProducts().catch((err) => { setError(err instanceof Error ? `Unable to load products: ${err.message}` : 'Unable to load products.'); }); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} — {formatCurrency(p.price)} — Stock: {p.stock}</option>)}</select></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label><input type="number" min="1" max={availableToAdd || undefined} step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter quantity" className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />{selectedProduct && <p className="text-xs text-gray-500 mt-1">{availableToAdd} additional unit{availableToAdd === 1 ? '' : 's'} available</p>}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Current Line</p><p className="text-sm text-blue-800 mt-1">{selectedProduct ? `${selectedProduct.name} × ${saleQuantity || 0}` : 'Select a product to add it to the cart'}</p></div><p className="text-xl font-extrabold text-blue-700">{formatCurrency(selectedLineAmount)}</p></div></div>
              <button type="submit" disabled={saving || !selectedProduct || saleQuantity <= 0 || saleQuantity > availableToAdd} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">+ Add to Cart</button>
            </form>

            <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden xl:col-start-1 xl:row-start-3">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3"><div><h3 className="font-bold text-gray-900">Current Cart</h3><p className="text-xs text-gray-500 mt-0.5">{cartUnits} unit{cartUnits === 1 ? '' : 's'} · {cart.length} line{cart.length === 1 ? '' : 's'}</p></div>{cart.length > 0 && <button type="button" onClick={clearCart} className="text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">Clear Cart</button>}</div>
              {cart.length === 0 ? <div className="p-6 text-center text-sm text-gray-500">No products in the cart yet.</div> : <div className="divide-y divide-gray-200">{cart.map((item) => <div key={item.product.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-gray-900 truncate">{item.product.name}</p><p className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.product.price)} each · {item.product.stock} in stock</p></div><p className="font-bold text-gray-900 shrink-0">{formatCurrency(item.product.price * item.quantity)}</p></div><div className="flex items-center justify-between gap-3 mt-3"><div className="flex items-center border border-gray-300 rounded-xl overflow-hidden"><button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-bold">−</button><input type="number" min="1" max={item.product.stock} value={item.quantity} onChange={(e) => updateCartQuantity(item.product.id, Number(e.target.value))} className="w-16 px-2 py-2 text-center border-x border-gray-300 text-gray-900" aria-label={`Quantity for ${item.product.name}`} /><button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stock} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-bold">+</button></div><button type="button" onClick={() => removeFromCart(item.product.id)} className="text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">Remove</button></div></div>)}</div>}
              <div className="border-t border-gray-200 bg-green-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-green-700">Transaction Total</p><p className="text-sm text-green-800 mt-1">{cart.length} product line{cart.length === 1 ? '' : 's'}</p></div><p className="text-2xl font-extrabold text-green-700">{formatCurrency(cartTotal)}</p></div></div>
            </div>

            <div className="mt-4 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 sm:p-5 xl:col-start-2 xl:row-start-2 xl:row-span-2 xl:self-start xl:sticky xl:top-4"><div className="mb-4"></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="card">Card</option><option value="other">Other</option></select></div><div><label className="block text-sm font-semibold text-gray-700 mb-2">Amount Received</label><input type="number" min="0" step="0.01" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="Enter amount received" className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" /></div></div><div className="grid grid-cols-1 gap-3 mt-4"><div className={`rounded-xl border px-4 py-3 ${customerHasPaidEnough ? 'border-green-200 bg-green-100/60' : validAmountReceived ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Change</p><p className={`text-xl font-extrabold mt-1 ${customerHasPaidEnough ? 'text-green-700' : validAmountReceived ? 'text-red-700' : 'text-gray-900'}`}>{formatCurrency(Math.max(changeDue, 0))}</p>{validAmountReceived && !customerHasPaidEnough && <p className="text-xs font-semibold text-red-700 mt-1">Customer still owes {formatCurrency(Math.abs(changeDue))}.</p>}{customerHasPaidEnough && changeDue === 0 && <p className="text-xs font-semibold text-green-700 mt-1">Exact payment.</p>}</div></div><button type="button" onClick={handleRecordSale} disabled={saving || cart.length === 0 || !validAmountReceived || parsedAmountReceived < cartTotal} className="w-full mt-4 py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Completing Sale...' : '✓ Complete Sale'}</button></div>
          </section>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5"><div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Revenue</p><p className="text-2xl font-extrabold text-purple-600 mt-1">{formatCurrency(totalRevenue)}</p><p className="text-sm text-gray-500 mt-1">Revenue from completed transactions</p></div><div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Units Sold</p><p className="text-2xl font-extrabold text-blue-600 mt-1">{totalUnits}</p><p className="text-sm text-gray-500 mt-1">Total units recorded in transactions</p></div></div>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5"><div className="p-5 border-b border-gray-200"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-900">Sales History</h2><p className="text-sm text-gray-500 mt-1">Search transactions by receipt, product, category, payment method, or amount.</p></div><div className="flex gap-2 w-full lg:w-auto lg:min-w-[420px]"><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sales..." className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /><button type="button" onClick={() => setSearch(search.trim())} className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer">🔍 Search</button>{search && <button type="button" onClick={() => setSearch('')} className="px-3 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition cursor-pointer" aria-label="Clear sales search">✕</button>}</div></div></div></section>

        {loading ? <div className="bg-white rounded-lg shadow p-8 text-center"><p className="text-gray-600">Loading sales...</p></div> : filteredSales.length === 0 ? <div className="bg-white rounded-lg shadow p-12 text-center"><p className="text-gray-600">No sales found.</p></div> : <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Receipt</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Products</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Items</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Total</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Payment</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Date</th><th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Action</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredSales.map((sale) => <tr key={sale.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">{sale.receipt_number || `#${String(sale.id).padStart(6,'0')}`}</td><td className="px-6 py-4 text-sm text-gray-700 min-w-[240px]"><div className="space-y-1">{sale.items.length ? sale.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3"><span className="font-medium">{item.product?.name || 'Unknown Product'}</span><span className="text-gray-500">× {item.quantity}</span></div>) : <span className="text-gray-400">No line items</span>}</div></td><td className="px-6 py-4 text-sm text-gray-600">{sale.items.reduce((n,i) => n+i.quantity,0)}</td><td className="px-6 py-4 text-sm font-semibold text-purple-600 whitespace-nowrap">{formatCurrency(sale.total_amount)}</td><td className="px-6 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">{sale.payment_method.replace('_',' ')}</td><td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(sale.created_at).toLocaleDateString()}</td><td className="px-6 py-4"><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => printReceipt(sale)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition cursor-pointer font-semibold">🖨️ Print</button>{canDeleteSales && <button type="button" onClick={() => handleDeleteSale(sale)} disabled={saving} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition cursor-pointer font-semibold disabled:opacity-50">🗑️ Delete</button>}</div></td></tr>)}</tbody></table></div></div>}

        {receiptData && <div className="print-receipt"><div className="receipt-paper"><h1>MOLUK ENTERPRISE</h1><p className="receipt-title">SALES RECEIPT</p><div className="receipt-divider" /><div className="receipt-meta"><div><span>Receipt No.</span><strong>{receiptData.receipt_number || String(receiptData.id).padStart(6,'0')}</strong></div><div><span>Date</span><strong>{new Date(receiptData.created_at).toLocaleString()}</strong></div><div><span>Served by</span><strong>{employeeName || userEmail || 'Sales Staff'}</strong></div><div><span>Payment</span><strong>{receiptData.payment_method.replace('_',' ')}</strong></div></div><div className="receipt-divider" />{receiptData.items.map((item) => <div className="receipt-item" key={item.id}><div className="receipt-item-main"><strong>{item.product?.name || 'Unknown Product'}</strong><span>{item.quantity} × {formatCurrency(item.unit_price)}</span></div><strong>{formatCurrency(item.line_total)}</strong></div>)}<div className="receipt-divider" /><div className="receipt-line"><span>Subtotal</span><strong>{formatCurrency(receiptData.subtotal)}</strong></div>{receiptData.discount > 0 && <div className="receipt-line"><span>Discount</span><strong>-{formatCurrency(receiptData.discount)}</strong></div>}{receiptData.tax > 0 && <div className="receipt-line"><span>Tax</span><strong>{formatCurrency(receiptData.tax)}</strong></div>}<div className="receipt-total"><span>TOTAL</span><strong>{formatCurrency(receiptData.total_amount)}</strong></div>{receiptAmountReceived !== null && <div className="receipt-line"><span>Amount Received</span><strong>{formatCurrency(receiptAmountReceived)}</strong></div>}{receiptChange !== null && <div className="receipt-line"><span>Change</span><strong>{formatCurrency(receiptChange)}</strong></div>}<div className="receipt-divider" /><p className="receipt-thanks">Thank you for shopping with Moluk Enterprise.</p><p className="receipt-footer">Please keep this receipt for your records.</p></div></div>}
      </main>

      <style jsx global>{`
        .print-receipt { display: none; }
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { margin: 0; background: white !important; }
          body * { visibility: hidden !important; }
          .print-receipt, .print-receipt * { visibility: visible !important; }
          .print-receipt { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          .receipt-paper { width: 72mm; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.35; }
          .receipt-paper h1 { margin: 0; text-align: center; font-size: 20px; font-weight: 800; }
          .receipt-title { margin: 2px 0 8px; text-align: center; font-size: 11px; font-weight: 700; }
          .receipt-divider { border-top: 1px dashed #111; margin: 8px 0; }
          .receipt-meta { display: grid; gap: 4px; }
          .receipt-meta div, .receipt-line, .receipt-total, .receipt-item { display: flex; justify-content: space-between; gap: 12px; }
          .receipt-meta span, .receipt-line span { color: #444; }
          .receipt-meta strong { text-align: right; max-width: 48mm; overflow-wrap: anywhere; }
          .receipt-item { align-items: flex-start; margin-bottom: 5px; }
          .receipt-item-main { display: grid; gap: 2px; max-width: 48mm; }
          .receipt-item-main span { color: #444; }
          .receipt-total { font-size: 14px; font-weight: 800; margin: 5px 0; }
          .receipt-thanks { margin: 12px 0 4px; text-align: center; font-weight: 700; }
          .receipt-footer { margin: 0; text-align: center; color: #555; font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
