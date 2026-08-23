'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export default function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email');
        setLoading(false);
        return;
      }

      // Check if user exists
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

      if (queryError) throw queryError;

      let user = users?.[0];

      if (!user) {
        // Create new user if doesn't exist
        const hashedPassword = await bcrypt.hash(password, 10);
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ email, password_hash: hashedPassword }])
          .select();

        if (createError) throw createError;
        user = newUser?.[0];
      } else {
        // Validate password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
          setError('Invalid password');
          setLoading(false);
          return;
        }
      }

      // Store session
      localStorage.setItem('user', JSON.stringify({ email, loggedIn: true, userId: user.id }));
      onLogin(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Employee Dashboard
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-4 text-sm">
          New user? Enter email & password to create account
        </p>
      </div>
    </div>
  );
}
