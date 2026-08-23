'use client';

import { useState } from 'react';

const SAMPLE_EMPLOYEES = [
  { id: 1, name: 'John Smith', role: 'Manager', email: 'john@company.com', status: 'Active' },
  { id: 2, name: 'Sarah Johnson', role: 'Developer', email: 'sarah@company.com', status: 'Active' },
  { id: 3, name: 'Mike Davis', role: 'Designer', email: 'mike@company.com', status: 'Active' },
  { id: 4, name: 'Emma Wilson', role: 'Developer', email: 'emma@company.com', status: 'Active' },
  { id: 5, name: 'David Brown', role: 'Sales', email: 'david@company.com', status: 'Active' },
  { id: 6, name: 'Lisa Garcia', role: 'HR', email: 'lisa@company.com', status: 'Active' },
  { id: 7, name: 'James Martinez', role: 'DevOps', email: 'james@company.com', status: 'Active' },
  { id: 8, name: 'Anna Lee', role: 'QA', email: 'anna@company.com', status: 'Active' },
];

export default function Employees({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('');

  const filteredEmployees = SAMPLE_EMPLOYEES.filter(
    (employee) =>
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.role.toLowerCase().includes(search.toLowerCase()) ||
      employee.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Manage Employees</h1>
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
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800">{employee.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No employees found</p>
          </div>
        )}
      </main>
    </div>
  );
}
