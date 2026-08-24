'use client';

export default function Analytics({ onBack }: { onBack: () => void }) {
  const analyticsData = [
    { label: 'Total Revenue', value: '$45,890', change: '+12.5%', color: 'text-green-600' },
    { label: 'Total Orders', value: '1,234', change: '+8.2%', color: 'text-blue-600' },
    { label: 'Conversion Rate', value: '3.45%', change: '+2.1%', color: 'text-purple-600' },
    { label: 'Avg Order Value', value: '$37.20', change: '+4.3%', color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
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
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {analyticsData.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="text-gray-500 text-sm font-semibold mb-2">
                {metric.label}
              </div>
              <div className={`text-3xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
              <p className="text-green-600 text-sm mt-2">
                {metric.change} vs last month
              </p>
            </div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
            <div className="h-48 bg-gradient-to-b from-blue-50 to-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">📊 Revenue chart placeholder</p>
            </div>
          </div>

          {/* Traffic Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Traffic Sources</h3>
            <div className="h-48 bg-gradient-to-b from-purple-50 to-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">📈 Traffic chart placeholder</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Page Views</span>
              <span className="font-semibold text-gray-800">24,512</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Unique Visitors</span>
              <span className="font-semibold text-gray-800">8,934</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Bounce Rate</span>
              <span className="font-semibold text-gray-800">42.3%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Session Duration</span>
              <span className="font-semibold text-gray-800">5m 32s</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
