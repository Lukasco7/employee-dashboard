'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Role {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  email: string;
  status: string;
  created_at?: string | null;
  role_id: number | null;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  employee_code: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  manager_id: number | null;
  profile_photo_url: string | null;
  updated_at?: string | null;
}

interface EmployeesProps {
  onBack: () => void;
  userRole?: string;
}

const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const getReadableError = (error: unknown) => {
  if (!error) return 'Unknown error.';

  if (error instanceof Error) {
    return error.message;
  }

  try {
    const value = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error),
      2
    );

    return value && value !== '{}'
      ? value
      : String(error);
  } catch {
    return String(error);
  }
};

export default function Employees({
  onBack,
  userRole,
}: EmployeesProps) {
  const normalizedRole =
    (userRole || '').trim().toLowerCase();

  const canManageEmployees =
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'administrator';
  const [employees, setEmployees] =
    useState<Employee[]>([]);
  const [roles, setRoles] =
    useState<Role[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [showAddForm, setShowAddForm] =
    useState(false);
  const [newEmployeeName, setNewEmployeeName] =
    useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] =
    useState('');
  const [newEmployeeRole, setNewEmployeeRole] =
    useState('Employee');
  const [newEmployeeStatus, setNewEmployeeStatus] =
    useState('Active');

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<number | null>(null);

  // EDIT EMPLOYEE
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);
  const [editEmployeeCode, setEditEmployeeCode] =
    useState('');
  const [editFirstName, setEditFirstName] =
    useState('');
  const [editLastName, setEditLastName] =
    useState('');
  const [editEmail, setEditEmail] =
    useState('');
  const [editPhone, setEditPhone] =
    useState('');
  const [editDepartment, setEditDepartment] =
    useState('');
  const [editPosition, setEditPosition] =
    useState('');
  const [editHireDate, setEditHireDate] =
    useState('');
  const [editRoleId, setEditRoleId] =
    useState('');
  const [editManagerId, setEditManagerId] =
    useState('');
  const [editProfilePhotoUrl, setEditProfilePhotoUrl] =
    useState('');
  const [editStatus, setEditStatus] =
    useState('Active');
  const [savingEmployee, setSavingEmployee] =
    useState(false);

  const [linkingEmployee, setLinkingEmployee] =
    useState<Employee | null>(null);
  const [loginEmail, setLoginEmail] =
    useState('');
  const [linking, setLinking] =
    useState(false);

  const [currentRole, setCurrentRole] =
    useState('');

  const loadRole = async () => {
    try {
      if (userRole) {
        setCurrentRole(
          userRole.toLowerCase().trim()
        );
        return;
      }

      const savedUser =
        localStorage.getItem('user');

      if (savedUser) {
        const role =
          JSON.parse(savedUser)?.role;

        setCurrentRole(
          String(role || '')
            .toLowerCase()
            .trim()
        );
      }
    } catch {
      setCurrentRole('');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        employeeResult,
        roleResult,
      ] = await Promise.all([
        supabase
          .from('employees')
          .select(`
            id,
            name,
            role,
            email,
            status,
            created_at,
            role_id,
            user_id,
            first_name,
            last_name,
            phone,
            employee_code,
            department,
            position,
            hire_date,
            manager_id,
            profile_photo_url,
            updated_at
          `)
          .order('id', {
            ascending: true,
          }),

        supabase
          .from('roles')
          .select('id, name')
          .order('id', {
            ascending: true,
          }),
      ]);

      if (employeeResult.error) {
        throw employeeResult.error;
      }

      if (roleResult.error) {
        throw roleResult.error;
      }

      setEmployees(
        employeeResult.data || []
      );

      setRoles(
        roleResult.data || []
      );
    } catch (err) {
      console.error(
        'Employee load error:',
        getReadableError(err)
      );

      setError(
        `Unable to load employees: ${getReadableError(
          err
        )}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRole();
    fetchData();
  }, []);

  const filteredEmployees =
    useMemo(() => {
      const term =
        search
          .toLowerCase()
          .trim();

      if (!term) {
        return employees;
      }

      return employees.filter(
        (employee) =>
          employee.name
            .toLowerCase()
            .includes(term) ||
          employee.email
            .toLowerCase()
            .includes(term) ||
          (
            employee.employee_code ||
            ''
          )
            .toLowerCase()
            .includes(term) ||
          (
            employee.department ||
            ''
          )
            .toLowerCase()
            .includes(term)
      );
    }, [employees, search]);

  const selectedEmployee =
    employees.find(
      (employee) =>
        employee.id ===
        selectedEmployeeId
    ) || null;

  const handleAddEmployee = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!canManageEmployees) {
      setError(
        'You do not have permission to add employees.'
      );
      return;
    }

    const name =
      newEmployeeName.trim();
    const email =
      newEmployeeEmail.trim().toLowerCase();
    const role =
      newEmployeeRole.trim();
    const status =
      newEmployeeStatus.trim();

    if (!name || !email || !role || !status) {
      setError(
        'Please complete the employee name, email, role and status.'
      );
      return;
    }

    try {
      setError('');
      setSuccess('');

      const { error } =
        await supabase
          .from('employees')
          .insert({
            name,
            email,
            role,
            status,
          });

      if (error) {
        throw error;
      }

      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeeRole('Employee');
      setNewEmployeeStatus('Active');
      setShowAddForm(false);

      setSuccess(
        `${name} was added successfully.`
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Add employee error:',
        err
      );

      setError(
        `Unable to add employee: ${getReadableError(
          err
        )}`
      );
    }
  };

  const openLinkAccount = (
    employee: Employee
  ) => {
    setError('');
    setSuccess('');
    setLinkingEmployee(employee);
    setLoginEmail('');
  };

  const closeLinkAccount = () => {
    setLinkingEmployee(null);
    setLoginEmail('');
    setLinking(false);
  };

  const handleLinkAccount = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      currentRole !==
      'admin'
    ) {
      setError(
        'Only an Admin can link employee login accounts.'
      );
      return;
    }

    if (!linkingEmployee) {
      return;
    }

    const cleanEmail =
      loginEmail
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        'Enter the employee login email.'
      );
      return;
    }

    try {
      setLinking(true);

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        'link_employee_auth_account',
        {
          p_employee_id:
            linkingEmployee.id,
          p_login_email:
            cleanEmail,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(
        data?.message ||
          'Login account linked successfully.'
      );

      closeLinkAccount();
      await fetchData();
    } catch (err) {
      console.error(
        'Link employee account error:',
        getReadableError(err)
      );

      setError(
        getReadableError(err)
      );
    } finally {
      setLinking(false);
    }
  };

  const openEditEmployee = (
    employee: Employee
  ) => {
    if (!canManageEmployees) {
      setError(
        'You do not have permission to edit employees.'
      );
      return;
    }

    setSelectedEmployeeId(employee.id);
    setEditingEmployee(employee);
    setLinkingEmployee(null);

    setEditEmployeeCode(
      employee.employee_code || ''
    );
    setEditFirstName(
      employee.first_name ||
        employee.name.split(' ')[0] ||
        ''
    );
    setEditLastName(
      employee.last_name ||
        employee.name.split(' ').slice(1).join(' ') ||
        ''
    );
    setEditEmail(
      employee.email || ''
    );
    setEditPhone(
      employee.phone || ''
    );
    setEditDepartment(
      employee.department || ''
    );
    setEditPosition(
      employee.position || ''
    );
    setEditHireDate(
      employee.hire_date || ''
    );
    setEditRoleId(
      employee.role_id
        ? String(employee.role_id)
        : ''
    );
    setEditManagerId(
      employee.manager_id
        ? String(employee.manager_id)
        : ''
    );
    setEditProfilePhotoUrl(
      employee.profile_photo_url || ''
    );
    setEditStatus(
      employee.status || 'Active'
    );

    setError('');
    setSuccess('');
  };

  const closeEditEmployee = () => {
    setEditingEmployee(null);
    setSelectedEmployeeId(null);
    setError('');
  };

  const handleUpdateEmployee = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!canManageEmployees || !editingEmployee) {
      return;
    }

    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    const email = editEmail.trim().toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !editEmployeeCode.trim() ||
      !editDepartment.trim() ||
      !editPosition.trim() ||
      !editHireDate ||
      !editRoleId ||
      !editStatus
    ) {
      setError(
        'Please complete all required employee fields.'
      );
      return;
    }

    try {
      setSavingEmployee(true);
      setError('');
      setSuccess('');

      const { data: duplicateCode } =
        await supabase
          .from('employees')
          .select('id')
          .eq(
            'employee_code',
            editEmployeeCode.trim()
          )
          .neq(
            'id',
            editingEmployee.id
          )
          .maybeSingle();

      if (duplicateCode) {
        setError(
          'That employee ID already exists.'
        );
        return;
      }

      const { data: duplicateEmail } =
        await supabase
          .from('employees')
          .select('id')
          .eq('email', email)
          .neq(
            'id',
            editingEmployee.id
          )
          .maybeSingle();

      if (duplicateEmail) {
        setError(
          'Another employee already uses this email.'
        );
        return;
      }

      const selectedRole =
        roles.find(
          (role) =>
            role.id ===
            Number(editRoleId)
        );

      const { error: updateError } =
        await supabase
          .from('employees')
          .update({
            name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            email,
            employee_code:
              editEmployeeCode.trim(),
            phone:
              editPhone.trim() || null,
            department:
              editDepartment.trim(),
            position:
              editPosition.trim(),
            hire_date:
              editHireDate,
            role_id:
              Number(editRoleId),
            role:
              selectedRole?.name ||
              editingEmployee.role,
            manager_id:
              editManagerId
                ? Number(editManagerId)
                : null,
            profile_photo_url:
              editProfilePhotoUrl.trim() ||
              null,
            status:
              editStatus,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            editingEmployee.id
          );

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        'Employee updated successfully.'
      );
      setEditingEmployee(null);
      setSelectedEmployeeId(null);

      await fetchData();
    } catch (err) {
      console.error(
        'Update employee error:',
        err
      );
      setError(
        `Unable to update employee: ${getReadableError(
          err
        )}`
      );
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (
    employee: Employee
  ) => {
    if (!canManageEmployees) {
      setError(
        'You do not have permission to delete employees.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${employee.name}"? This removes the employee record.`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      const { error: deleteError } =
        await supabase
          .from('employees')
          .delete()
          .eq('id', employee.id);

      if (deleteError) {
        throw deleteError;
      }

      if (
        selectedEmployeeId ===
        employee.id
      ) {
        setSelectedEmployeeId(null);
      }

      setSuccess(
        `"${employee.name}" was deleted successfully.`
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Delete employee error:',
        err
      );

      setError(
        getReadableError(err)
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Manage Employees
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage employee information and login account links
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

        {/* ADD EMPLOYEE */}
        {canManageEmployees && (
          <div className="mb-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(
                    (current) => !current
                  );
                  setError('');
                  setSuccess('');
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer shadow-sm"
              >
                {showAddForm
                  ? 'Cancel'
                  : '+ Add Employee'}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddEmployee}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Add New Employee
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Create the employee profile before linking a login account.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newEmployeeName}
                      onChange={(event) =>
                        setNewEmployeeName(
                          event.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="Employee full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newEmployeeEmail}
                      onChange={(event) =>
                        setNewEmployeeEmail(
                          event.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="employee@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={newEmployeeRole}
                      onChange={(event) =>
                        setNewEmployeeRole(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="Employee">
                        Employee
                      </option>
                      <option value="Manager">
                        Manager
                      </option>
                      <option value="Admin">
                        Admin
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={newEmployeeStatus}
                      onChange={(event) =>
                        setNewEmployeeStatus(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="Active">
                        Active
                      </option>
                      <option value="Inactive">
                        Inactive
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold cursor-pointer"
                  >
                    Add Employee
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAddForm(false)
                    }
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {linkingEmployee && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-emerald-600">
            <div className="flex justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Link Login Account
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Linking account for{' '}
                  <span className="font-semibold">
                    {linkingEmployee.name}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={closeLinkAccount}
                disabled={linking}
                className="text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-4 mb-4">
              Enter the email the employee uses to sign in. This links an existing
              Supabase Auth account; it does not create a new account.
            </p>

            <form
              onSubmit={handleLinkAccount}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(
                    event.target.value
                  )
                }
                placeholder="employee@login.com"
                className={`${inputClass} flex-1`}
                required
                autoFocus
              />

              <button
                type="submit"
                disabled={linking}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-50 cursor-pointer"
              >
                {linking
                  ? 'Linking...'
                  : '🔗 Link Account'}
              </button>

              <button
                type="button"
                onClick={closeLinkAccount}
                disabled={linking}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </form>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Employee Directory
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredEmployees.length} employee
                {filteredEmployees.length === 1
                  ? ''
                  : 's'}
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, ID, email..."
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>
        </section>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            Loading employees...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Employee
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Employee ID
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Role
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Department
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Login Account
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={employee.id}
                        className={`hover:bg-gray-50 ${
                          selectedEmployeeId ===
                          employee.id
                            ? 'bg-blue-50'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedEmployeeId(
                            employee.id
                          )
                        }
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-800">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.phone ||
                              'No phone'}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.employee_code ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.role ||
                            roles.find(
                              (role) =>
                                role.id ===
                                employee.role_id
                            )?.name ||
                            'Not assigned'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.department ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.email}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.status
                                ?.toLowerCase() ===
                              'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {employee.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {employee.user_id ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Linked
                            </span>
                          ) : (
                            <div>
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Not linked
                              </span>

                              {currentRole ===
                                'admin' && (
                                <button
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();
                                    openLinkAccount(
                                      employee
                                    );
                                  }}
                                  className="block mt-2 text-sm text-emerald-700 hover:underline font-semibold cursor-pointer"
                                >
                                  🔗 Link account
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {canManageEmployees ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditEmployee(employee);
                                }}
                                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-semibold cursor-pointer"
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteEmployee(employee);
                                }}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-semibold cursor-pointer"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400">
                              🔒 View only
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length ===
              0 && (
              <div className="p-12 text-center text-gray-500">
                No employees found.
              </div>
            )}
          </div>
        )}

        {editingEmployee && (
          <section className="fixed inset-0 z-50 bg-black/40 p-4 overflow-y-auto">
            <div className="max-w-5xl mx-auto mt-8 bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Edit Employee
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Update employee information and account settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditEmployee}
                  className="text-gray-500 hover:text-gray-800 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleUpdateEmployee}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID *
                  </label>
                  <input
                    value={editEmployeeCode}
                    onChange={(e) =>
                      setEditEmployeeCode(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    value={editFirstName}
                    onChange={(e) =>
                      setEditFirstName(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    value={editLastName}
                    onChange={(e) =>
                      setEditLastName(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    value={editPhone}
                    onChange={(e) =>
                      setEditPhone(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    value={editDepartment}
                    onChange={(e) =>
                      setEditDepartment(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position *
                  </label>
                  <input
                    value={editPosition}
                    onChange={(e) =>
                      setEditPosition(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    value={editHireDate}
                    onChange={(e) =>
                      setEditHireDate(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={editRoleId}
                    onChange={(e) =>
                      setEditRoleId(e.target.value)
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">
                      Select role
                    </option>
                    {roles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager
                  </label>
                  <select
                    value={editManagerId}
                    onChange={(e) =>
                      setEditManagerId(e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      No manager
                    </option>
                    {employees
                      .filter(
                        (employee) =>
                          employee.id !==
                          editingEmployee.id
                      )
                      .map((employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value)
                    }
                    className={inputClass}
                    required
                  >
                    <option value="Active">
                      Active
                    </option>
                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo URL
                  </label>
                  <input
                    value={editProfilePhotoUrl}
                    onChange={(e) =>
                      setEditProfilePhotoUrl(
                        e.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingEmployee}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {savingEmployee
                      ? 'Saving...'
                      : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    onClick={closeEditEmployee}
                    disabled={savingEmployee}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {selectedEmployee && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800">
              Selected Employee
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedEmployee.name} ·{' '}
              {selectedEmployee.email}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
