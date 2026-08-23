'use client';

interface DashboardProps {
  user: string;
  onLogout: () => void;
  onViewProducts: () => void;
  onViewEmployees: () => void;
  onViewAnalytics: () => void;
}

export default function Dashboard({ user, onLogout, onViewProducts, onViewEmployees, onViewAnalytics }: DashboardProps) {
  const productCount = 45;
  const employeeCount = 12;
  const revenue = '$15,230';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Employee Dashboard</h1>
          <button
            onClick={onLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, {user}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Here's your dashboard overview for today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Products Card */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="text-gray-500 text-sm font-semibold mb-2">
              PRODUCTS
            </div>
            <div className="text-3xl font-bold text-blue-600">{productCount}</div>
            <p className="text-gray-600 text-sm mt-2">In inventory</p>
          </div>

          {/* Employees Card */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="text-gray-500 text-sm font-semibold mb-2">
              EMPLOYEES
            </div>
            <div className="text-3xl font-bold text-green-600">
              {employeeCount}
            </div>
            <p className="text-gray-600 text-sm mt-2">Active staff</p>
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="text-gray-500 text-sm font-semibold mb-2">
              REVENUE
            </div>
            <div className="text-3xl font-bold text-purple-600">{revenue}</div>
            <p className="text-gray-600 text-sm mt-2">This month</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Links
          </h3>
          <div className="space-y-2">
            <button
              onClick={onViewProducts}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition text-gray-600"
            >
              📦 View Products
            </button>
            <button
              onClick={onViewEmployees}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition text-gray-600"
            >
              👥 Manage Employees
            </button>
            <button
              onClick={onViewAnalytics}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition text-gray-600"
            >
              📊 View Analytics
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
