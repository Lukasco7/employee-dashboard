'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LoginProps {
  onLogin: (email: string, role: string) => void;
}

interface Role {
  id: number;
  name: string;
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] =
    useState('Employee');

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] =
    useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================
  // LOAD AVAILABLE ROLES
  // =========================

  useEffect(() => {
    if (!isSignUp) {
      return;
    }

    const loadRoles = async () => {
      try {
        setRolesLoading(true);

        const { data, error: rolesError } =
          await supabase
            .from('roles')
            .select('id, name')
            .order('id', {
              ascending: true,
            });

        if (rolesError) {
          throw rolesError;
        }

        const loadedRoles = (data || []).map(
          (role) => ({
            id: Number(role.id),
            name: role.name,
          })
        );

        setRoles(loadedRoles);

        const employeeRole =
          loadedRoles.find(
            (role) =>
              role.name.toLowerCase() ===
              'employee'
          );

        if (employeeRole) {
          setSelectedRole(
            employeeRole.name
          );
        } else if (loadedRoles[0]) {
          setSelectedRole(
            loadedRoles[0].name
          );
        }
      } catch (err) {
        console.error(
          'Role loading error:',
          err
        );

        // Keep the form usable even if roles
        // cannot be loaded.
        setRoles([
          {
            id: 0,
            name: 'Employee',
          },
        ]);

        setSelectedRole('Employee');
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [isSignUp]);

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setMessage('');

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        'Please fill in all required fields.'
      );
      return;
    }

    // =====================================================
    // SIGN UP
    // =====================================================

    if (isSignUp) {
      if (password.length < 6) {
        setError(
          'Password must be at least 6 characters.'
        );
        return;
      }

      if (password !== confirmPassword) {
        setError(
          'Passwords do not match.'
        );
        return;
      }

      try {
        setLoading(true);

        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                requested_role:
                  selectedRole,
              },
            },
          });

        if (signupError) {
          throw signupError;
        }

        if (!data.user) {
          throw new Error(
            'Account could not be created.'
          );
        }

        setMessage(
          `Account created successfully. Your account starts with the Employee role unless an administrator assigns a different role.`
        );

        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setSelectedRole('Employee');
      } catch (err) {
        console.error(
          'Signup error:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to create account.'
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // =====================================================
    // LOGIN
    // =====================================================

    try {
      setLoading(true);

      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error(
          'Login failed.'
        );
      }

      console.log(
        'Authenticated user:',
        data.user.email
      );

      // ---------------------------------------------------
      // GET USER RECORD
      // ---------------------------------------------------

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from('users')
        .select(
          'id, email, role_id'
        )
        .eq(
          'id',
          data.user.id
        )
        .maybeSingle();

      if (userError) {
        console.error(
          'USERS ERROR:',
          userError
        );

        throw new Error(
          `Users table error: ${userError.message}`
        );
      }

      if (!userData) {
        // Sign out so a partially configured
        // account is not left logged in.
        await supabase.auth.signOut();

        throw new Error(
          'Your authenticated account does not have a record in the users table.'
        );
      }

      if (!userData.role_id) {
        await supabase.auth.signOut();

        throw new Error(
          'No role has been assigned to this account.'
        );
      }

      // ---------------------------------------------------
      // GET ROLE
      // ---------------------------------------------------

      const {
        data: roleData,
        error: roleError,
      } = await supabase
        .from('roles')
        .select('id, name')
        .eq(
          'id',
          userData.role_id
        )
        .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();

        throw new Error(
          `Roles table error: ${roleError.message}`
        );
      }

      if (
        !roleData ||
        !roleData.name
      ) {
        await supabase.auth.signOut();

        throw new Error(
          'The assigned role could not be found.'
        );
      }

      console.log(
        'Logged in user:',
        userData.email
      );

      console.log(
        'User role:',
        roleData.name
      );

      onLogin(
        data.user.email ??
          cleanEmail,
        roleData.name
      );
    } catch (err) {
      console.error(
        'Login error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to log in. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        <h1 className="text-3xl font-bold mb-2 text-center text-gray-800">
          Employee Dashboard
        </h1>

        <p className="text-center text-sm text-gray-500 mb-6">
          Secure employee access
        </p>

        <h2 className="text-xl font-semibold text-center mb-5 text-gray-700">
          {isSignUp
            ? 'Create Account'
            : 'Log In'}
        </h2>

        {/* ERROR */}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* EMAIL */}

          <div>
            <label
              htmlFor="login-email"
              className="block text-gray-700 font-medium mb-2"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="your@email.com"
              autoComplete="email"
              required
              className="w-full min-h-12 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ROLE */}

          {isSignUp && (
            <div>
              <label
                htmlFor="signup-role"
                className="block text-gray-700 font-medium mb-2"
              >
                Role
              </label>

              <select
                id="signup-role"
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(
                    e.target.value
                  )
                }
                disabled={rolesLoading}
                className="w-full min-h-12 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              >
                {roles.length === 0 ? (
                  <option value="Employee">
                    Employee
                  </option>
                ) : (
                  roles.map((role) => (
                    <option
                      key={role.id}
                      value={role.name}
                    >
                      {role.name}
                    </option>
                  ))
                )}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                New accounts start as Employee unless an administrator assigns another role.
              </p>
            </div>
          )}

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="login-password"
              className="block text-gray-700 font-medium mb-2"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="login-password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete={
                  isSignUp
                    ? 'new-password'
                    : 'current-password'
                }
                required
                minLength={6}
                className="w-full min-h-12 px-4 py-3 pr-14 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {showPassword
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          {isSignUp && (
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-gray-700 font-medium mb-2"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full min-h-12 px-4 py-3 pr-14 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {showConfirmPassword
                    ? 'Hide'
                    : 'Show'}
                </button>
              </div>
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading || rolesLoading
            }
            className="w-full min-h-12 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? 'Please wait...'
              : isSignUp
                ? 'Create Account'
                : 'Log In'}
          </button>

        </form>

        {/* SWITCH LOGIN / SIGNUP */}

        <div className="text-center mt-6">

          <p className="text-gray-600 text-sm">
            {isSignUp
              ? 'Already have an account?'
              : "Don't have an account?"}
          </p>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(
                !isSignUp
              );
              setError('');
              setMessage('');
              setPassword('');
              setConfirmPassword('');
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
            className="mt-2 text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            {isSignUp
              ? 'Log In'
              : 'Create an account'}
          </button>

        </div>

      </div>
    </div>
  );
}
