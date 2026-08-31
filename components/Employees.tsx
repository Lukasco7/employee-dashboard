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

export default function Employees({
  onBack,
  userRole,
}: EmployeesProps) {
  const normalizedRole =
    (userRole || '').trim().toLowerCase();

  const canAddEmployee =
    normalizedRole === 'admin' ||
    normalizedRole === 'hr';

  const canEditEmployee =
    normalizedRole === 'admin' ||
    normalizedRole === 'hr' ||
    normalizedRole === 'manager';

  const canDeleteEmployee =
    normalizedRole === 'admin';
  // =========================
  // DATA
  // =========================

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // =========================
  // UI
  // =========================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  // =========================
  // SEARCH / FILTERS
  // =========================

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] =
    useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // =========================
  // ADD FORM
  // =========================

  const [employeeCode, setEmployeeCode] =
    useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] =
    useState('');
  const [position, setPosition] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [roleId, setRoleId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] =
    useState('');
  const [status, setStatus] = useState('Active');

  // =========================
  // EDIT FORM
  // =========================

  const [editEmployeeCode, setEditEmployeeCode] =
    useState('');
  const [editFirstName, setEditFirstName] =
    useState('');
  const [editLastName, setEditLastName] =
    useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] =
    useState('');
  const [editPosition, setEditPosition] =
    useState('');
  const [editHireDate, setEditHireDate] =
    useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editManagerId, setEditManagerId] =
    useState('');
  const [editProfilePhotoUrl, setEditProfilePhotoUrl] =
    useState('');
  const [editStatus, setEditStatus] =
    useState('Active');

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      await Promise.all([
        fetchEmployees(),
        fetchRoles(),
      ]);
    } catch (err) {
      console.error('Error loading employee data:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load employee data.');
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH EMPLOYEES
  // =========================

  const fetchEmployees = async () => {
    const { data, error } = await supabase
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
      });

    if (error) {
      throw error;
    }

    setEmployees(data || []);
  };

  // =========================
  // FETCH ROLES
  // =========================

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .order('id', {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    setRoles(data || []);
  };

  // =========================
  // RESET ADD FORM
  // =========================

  const resetAddForm = () => {
    setEmployeeCode('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setPosition('');
    setHireDate('');
    setRoleId('');
    setManagerId('');
    setProfilePhotoUrl('');
    setStatus('Active');
  };

  // =========================
  // RESET EDIT FORM
  // =========================

  const resetEditForm = () => {
    setEditEmployeeCode('');
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditPhone('');
    setEditDepartment('');
    setEditPosition('');
    setEditHireDate('');
    setEditRoleId('');
    setEditManagerId('');
    setEditProfilePhotoUrl('');
    setEditStatus('Active');
  };

  // =========================
  // VALIDATE EMAIL
  // =========================

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );
  };

  // =========================
  // ADD EMPLOYEE
  // =========================

  const handleAddEmployee = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!canAddEmployee) {
      setError(
        'You do not have permission to add employees.'
      );
      return;
    }

    setError('');
    setSuccess('');

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (
      !employeeCode.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !cleanEmail ||
      !department.trim() ||
      !position.trim() ||
      !hireDate ||
      !roleId ||
      !status
    ) {
      setError(
        'Please complete all required employee fields.'
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setSaving(true);

      // Check employee code
      const { data: existingCode } =
        await supabase
          .from('employees')
          .select('id')
          .eq(
            'employee_code',
            employeeCode.trim()
          )
          .maybeSingle();

      if (existingCode) {
        setError(
          'That employee ID already exists.'
        );
        return;
      }

      // Check email
      const { data: existingEmail } =
        await supabase
          .from('employees')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

      if (existingEmail) {
        setError(
          'An employee with this email already exists.'
        );
        return;
      }

      const selectedRole = roles.find(
        (role) =>
          role.id === Number(roleId)
      );

      const selectedRoleName =
        selectedRole?.name || '';

      const { error } = await supabase
        .from('employees')
        .insert({
          name: `${firstName.trim()} ${lastName.trim()}`,
          role: selectedRoleName,
          email: cleanEmail,
          status,
          employee_code:
            employeeCode.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          department:
            department.trim(),
          position:
            position.trim(),
          hire_date: hireDate,
          role_id: Number(roleId),
          manager_id: managerId
            ? Number(managerId)
            : null,
          profile_photo_url:
            profilePhotoUrl.trim() || null,
        });

      if (error) {
        throw error;
      }

      resetAddForm();
      setShowAddForm(false);

      setSuccess(
        'Employee added successfully.'
      );

      await fetchEmployees();
    } catch (err) {
      console.error(
        'Error adding employee:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to add employee: ${err.message}`
        );
      } else {
        setError(
          'Unable to add employee.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // START EDIT
  // =========================

  const startEditing = (
    employee: Employee
  ) => {
    setEditingEmployee(employee);

    setEditEmployeeCode(
      employee.employee_code || ''
    );
    setEditFirstName(
      employee.first_name || ''
    );
    setEditLastName(
      employee.last_name || ''
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

    setShowAddForm(false);
    setError('');
    setSuccess('');
  };

  // =========================
  // CANCEL EDIT
  // =========================

  const cancelEditing = () => {
    setEditingEmployee(null);
    resetEditForm();
    setError('');
  };

  // =========================
  // UPDATE EMPLOYEE
  // =========================

  const handleUpdateEmployee = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!canEditEmployee) {
      setError(
        'You do not have permission to edit employees.'
      );
      return;
    }

    if (!editingEmployee) {
      return;
    }

    setError('');
    setSuccess('');

    const cleanEmail = editEmail
      .trim()
      .toLowerCase();

    if (
      !editEmployeeCode.trim() ||
      !editFirstName.trim() ||
      !editLastName.trim() ||
      !cleanEmail ||
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

    if (!isValidEmail(cleanEmail)) {
      setError(
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setSaving(true);

      // Check employee code against other employees
      const { data: existingCode } =
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

      if (existingCode) {
        setError(
          'That employee ID already exists.'
        );
        return;
      }

      // Check email against other employees
      const { data: existingEmail } =
        await supabase
          .from('employees')
          .select('id')
          .eq('email', cleanEmail)
          .neq(
            'id',
            editingEmployee.id
          )
          .maybeSingle();

      if (existingEmail) {
        setError(
          'Another employee already uses this email.'
        );
        return;
      }

      const selectedRole = roles.find(
        (role) =>
          role.id ===
          Number(editRoleId)
      );

      const selectedRoleName =
        selectedRole?.name || '';

      const { error } = await supabase
        .from('employees')
        .update({
          name: `${editFirstName.trim()} ${editLastName.trim()}`,
          role: selectedRoleName,
          email: cleanEmail,
          status: editStatus,
          employee_code:
            editEmployeeCode.trim(),
          first_name:
            editFirstName.trim(),
          last_name:
            editLastName.trim(),
          phone:
            editPhone.trim() || null,
          department:
            editDepartment.trim(),
          position:
            editPosition.trim(),
          hire_date: editHireDate,
          role_id:
            Number(editRoleId),
          manager_id:
            editManagerId
              ? Number(editManagerId)
              : null,
          profile_photo_url:
            editProfilePhotoUrl.trim() ||
            null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          editingEmployee.id
        );

      if (error) {
        throw error;
      }

      setSuccess(
        'Employee updated successfully.'
      );

      cancelEditing();

      await fetchEmployees();
    } catch (err) {
      console.error(
        'Error updating employee:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to update employee: ${err.message}`
        );
      } else {
        setError(
          'Unable to update employee.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE
  // =========================

  const handleDeleteEmployee = async (
    employee: Employee
  ) => {
    if (!canDeleteEmployee) {
      setError(
        'You do not have permission to delete employees.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${getEmployeeName(
          employee
        )}"?`
      );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from('employees')
          .delete()
          .eq(
            'id',
            employee.id
          );

      if (error) {
        throw error;
      }

      if (
        editingEmployee?.id ===
        employee.id
      ) {
        cancelEditing();
      }

      setSuccess(
        `${getEmployeeName(
          employee
        )} was deleted successfully.`
      );

      await fetchEmployees();
    } catch (err) {
      console.error(
        'Error deleting employee:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to delete employee: ${err.message}`
        );
      } else {
        setError(
          'Unable to delete employee.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EMPLOYEE NAME
  // =========================

  const getEmployeeName = (
    employee: Employee
  ) => {
    const fullName =
      `${employee.first_name || ''} ${
        employee.last_name || ''
      }`.trim();

    if (fullName) {
      return fullName;
    }

    if (employee.name) {
      return employee.name;
    }

    return employee.email;
  };

  // =========================
  // DEPARTMENTS
  // =========================

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map(
            (employee) =>
              employee.department
          )
          .filter(
            (
              department
            ): department is string =>
              Boolean(department)
          )
      )
    ).sort();
  }, [employees]);

  // =========================
  // FILTER EMPLOYEES
  // =========================

  const filteredEmployees =
    employees.filter(
      (employee) => {
        const searchTerm =
          search.toLowerCase().trim();

        const employeeName =
          getEmployeeName(
            employee
          ).toLowerCase();

        const matchesSearch =
          !searchTerm ||
          employeeName.includes(
            searchTerm
          ) ||
          employee.email
            .toLowerCase()
            .includes(
              searchTerm
            ) ||
          (
            employee.employee_code ||
            ''
          )
            .toLowerCase()
            .includes(
              searchTerm
            ) ||
          (
            employee.phone ||
            ''
          )
            .toLowerCase()
            .includes(
              searchTerm
            ) ||
          (
            employee.department ||
            ''
          )
            .toLowerCase()
            .includes(
              searchTerm
            ) ||
          (
            employee.position ||
            ''
          )
            .toLowerCase()
            .includes(
              searchTerm
            );

        const matchesRole =
          !roleFilter ||
          String(
            employee.role_id
          ) === roleFilter;

        const matchesDepartment =
          !departmentFilter ||
          employee.department ===
            departmentFilter;

        const matchesStatus =
          !statusFilter ||
          employee.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesRole &&
          matchesDepartment &&
          matchesStatus
        );
      }
    );

  // =========================
  // MANAGERS
  // =========================

  const managers = employees.filter(
    (employee) => {
      const roleName =
        employee.role
          ?.toLowerCase()
          .trim();

      return (
        roleName === 'admin' ||
        roleName === 'manager' ||
        roleName ===
          'supervisor'
      );
    }
  );

  // =========================
  // FORM INPUT CLASS
  // =========================

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

  // =========================
  // PAGE
  // =========================

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-white shadow">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Manage Employees
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage employee information,
              roles and status
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition font-medium cursor-pointer"
          >
            ← Back to Dashboard
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Total Employees
            </p>

            <p className="text-3xl font-bold text-gray-800 mt-1">
              {employees.length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Active Employees
            </p>

            <p className="text-3xl font-bold text-green-600 mt-1">
              {
                employees.filter(
                  (employee) =>
                    employee.status
                      ?.toLowerCase() ===
                    'active'
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Showing
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-1">
              {filteredEmployees.length}
            </p>
          </div>

        </div>

        {/* SEARCH / FILTERS */}

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <input
              type="text"
              placeholder="Search name, ID, email..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className={inputClass}
            />

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                All Roles
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

            <select
              value={
                departmentFilter
              }
              onChange={(e) =>
                setDepartmentFilter(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                All Departments
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                All Statuses
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

          </div>

          {(search ||
            roleFilter ||
            departmentFilter ||
            statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setDepartmentFilter('');
                setStatusFilter('');
              }}
              className="mt-4 text-sm text-blue-600 hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}

        </div>

        {/* ADD BUTTON */}

        <div className="flex justify-end mb-6">

          <button
            type="button"
            onClick={() => {
              setShowAddForm(
                !showAddForm
              );

              setEditingEmployee(null);
              setError('');
              setSuccess('');
            }}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer"
          >
            {showAddForm
              ? 'Cancel'
              : '+ Add Employee'}
          </button>

        </div>

        {/* SUCCESS */}

        {success && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* ========================= */}
        {/* ADD FORM */}
        {/* ========================= */}

        {canAddEmployee &&
          showAddForm &&
          !editingEmployee && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

              <h2 className="text-xl font-bold text-gray-800 mb-6">
                Add New Employee
              </h2>

              <form
                onSubmit={
                  handleAddEmployee
                }
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >

                {/* EMPLOYEE ID */}

                <div>
                  <label className="label">
                    Employee ID *
                  </label>

                  <input
                    value={
                      employeeCode
                    }
                    onChange={(e) =>
                      setEmployeeCode(
                        e.target.value
                      )
                    }
                    placeholder="EMP-001"
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* FIRST NAME */}

                <div>
                  <label className="label">
                    First Name *
                  </label>

                  <input
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(
                        e.target.value
                      )
                    }
                    placeholder="First name"
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* LAST NAME */}

                <div>
                  <label className="label">
                    Last Name *
                  </label>

                  <input
                    value={lastName}
                    onChange={(e) =>
                      setLastName(
                        e.target.value
                      )
                    }
                    placeholder="Last name"
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <label className="label">
                    Email *
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    placeholder="employee@company.com"
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* PHONE */}

                <div>
                  <label className="label">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="Phone number"
                    className={
                      inputClass
                    }
                  />
                </div>

                {/* DEPARTMENT */}

                <div>
                  <label className="label">
                    Department *
                  </label>

                  <input
                    value={
                      department
                    }
                    onChange={(e) =>
                      setDepartment(
                        e.target.value
                      )
                    }
                    placeholder="Sales, HR..."
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* POSITION */}

                <div>
                  <label className="label">
                    Position *
                  </label>

                  <input
                    value={
                      position
                    }
                    onChange={(e) =>
                      setPosition(
                        e.target.value
                      )
                    }
                    placeholder="Sales Associate"
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* HIRE DATE */}

                <div>
                  <label className="label">
                    Hire Date *
                  </label>

                  <input
                    type="date"
                    value={
                      hireDate
                    }
                    onChange={(e) =>
                      setHireDate(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                    required
                  />
                </div>

                {/* ROLE */}

                <div>
                  <label className="label">
                    Role *
                  </label>

                  <select
                    value={roleId}
                    onChange={(e) =>
                      setRoleId(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                    required
                  >
                    <option value="">
                      Select role
                    </option>

                    {roles.map(
                      (role) => (
                        <option
                          key={role.id}
                          value={role.id}
                        >
                          {role.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* MANAGER */}

                <div>
                  <label className="label">
                    Manager
                  </label>

                  <select
                    value={
                      managerId
                    }
                    onChange={(e) =>
                      setManagerId(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      No manager
                    </option>

                    {managers.map(
                      (manager) => (
                        <option
                          key={
                            manager.id
                          }
                          value={
                            manager.id
                          }
                        >
                          {getEmployeeName(
                            manager
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* PHOTO URL */}

                <div>
                  <label className="label">
                    Profile Photo URL
                  </label>

                  <input
                    type="url"
                    value={
                      profilePhotoUrl
                    }
                    onChange={(e) =>
                      setProfilePhotoUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    className={
                      inputClass
                    }
                  />
                </div>

                {/* STATUS */}

                <div>
                  <label className="label">
                    Status *
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                {/* SAVE */}

                <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">

                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save Employee'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetAddForm();
                      setShowAddForm(
                        false
                      );
                    }}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                </div>

              </form>

            </div>
          )}

        {/* ========================= */}
        {/* EDIT FORM */}
        {/* ========================= */}

        {editingEmployee && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-blue-600">

            <div className="flex flex-col sm:flex-row gap-2 justify-between mb-6">

              <h2 className="text-xl font-bold text-gray-800">
                Edit Employee
              </h2>

              <span className="text-sm text-gray-500">
                Database ID:{" "}
                {editingEmployee.id}
              </span>

            </div>

            <form
              onSubmit={
                handleUpdateEmployee
              }
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >

              {/* EMPLOYEE ID */}

              <div>
                <label className="label">
                  Employee ID *
                </label>

                <input
                  value={
                    editEmployeeCode
                  }
                  onChange={(e) =>
                    setEditEmployeeCode(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* FIRST NAME */}

              <div>
                <label className="label">
                  First Name *
                </label>

                <input
                  value={
                    editFirstName
                  }
                  onChange={(e) =>
                    setEditFirstName(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* LAST NAME */}

              <div>
                <label className="label">
                  Last Name *
                </label>

                <input
                  value={
                    editLastName
                  }
                  onChange={(e) =>
                    setEditLastName(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="label">
                  Email *
                </label>

                <input
                  type="email"
                  value={
                    editEmail
                  }
                  onChange={(e) =>
                    setEditEmail(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* PHONE */}

              <div>
                <label className="label">
                  Phone
                </label>

                <input
                  type="tel"
                  value={
                    editPhone
                  }
                  onChange={(e) =>
                    setEditPhone(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              {/* DEPARTMENT */}

              <div>
                <label className="label">
                  Department *
                </label>

                <input
                  value={
                    editDepartment
                  }
                  onChange={(e) =>
                    setEditDepartment(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* POSITION */}

              <div>
                <label className="label">
                  Position *
                </label>

                <input
                  value={
                    editPosition
                  }
                  onChange={(e) =>
                    setEditPosition(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* HIRE DATE */}

              <div>
                <label className="label">
                  Hire Date *
                </label>

                <input
                  type="date"
                  value={
                    editHireDate
                  }
                  onChange={(e) =>
                    setEditHireDate(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                />
              </div>

              {/* ROLE */}

              <div>
                <label className="label">
                  Role *
                </label>

                <select
                  value={
                    editRoleId
                  }
                  onChange={(e) =>
                    setEditRoleId(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                  required
                >
                  <option value="">
                    Select role
                  </option>

                  {roles.map(
                    (role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* MANAGER */}

              <div>
                <label className="label">
                  Manager
                </label>

                <select
                  value={
                    editManagerId
                  }
                  onChange={(e) =>
                    setEditManagerId(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    No manager
                  </option>

                  {managers
                    .filter(
                      (manager) =>
                        manager.id !==
                        editingEmployee.id
                    )
                    .map(
                      (manager) => (
                        <option
                          key={
                            manager.id
                          }
                          value={
                            manager.id
                          }
                        >
                          {getEmployeeName(
                            manager
                          )}
                        </option>
                      )
                    )}
                </select>
              </div>

              {/* PHOTO URL */}

              <div>
                <label className="label">
                  Profile Photo URL
                </label>

                <input
                  type="url"
                  value={
                    editProfilePhotoUrl
                  }
                  onChange={(e) =>
                    setEditProfilePhotoUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className={
                    inputClass
                  }
                />
              </div>

              {/* STATUS */}

              <div>
                <label className="label">
                  Status *
                </label>

                <select
                  value={
                    editStatus
                  }
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              {/* BUTTONS */}

              <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {saving
                    ? 'Updating...'
                    : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={saving}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

        {/* ========================= */}
        {/* LOADING */}
        {/* ========================= */}

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">

            <p className="text-gray-600">
              Loading employees...
            </p>

          </div>
        )}

        {/* ========================= */}
        {/* TABLE */}
        {/* ========================= */}

        {!loading && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Employee Name
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Employee ID
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Role
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Department
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Position
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Email Address
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={
                          employee.id
                        }
                        className="hover:bg-gray-50"
                      >

                        {/* EMPLOYEE */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            {employee.profile_photo_url ? (
                              <img
                                src={
                                  employee.profile_photo_url
                                }
                                alt={
                                  getEmployeeName(
                                    employee
                                  )
                                }
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                {getEmployeeName(
                                  employee
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>
                            )}

                            <div>
                              <p className="font-semibold text-gray-800">
                                {getEmployeeName(
                                  employee
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                {employee.phone ||
                                  'No phone'}
                              </p>
                            </div>

                          </div>

                        </td>

                        {/* ID */}

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.employee_code ||
                            '—'}
                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.role ||
                            roles.find(
                              (role) =>
                                role.id ===
                                employee.role_id
                            )?.name ||
                            'Not assigned'}
                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.department ||
                            '—'}
                        </td>

                        {/* POSITION */}

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.position ||
                            '—'}
                        </td>

                        {/* EMAIL */}

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {employee.email}
                        </td>

                        {/* STATUS */}

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

                        {/* ACTIONS */}

                        <td className="px-5 py-4">

                          <div className="flex gap-2">

                            {canEditEmployee && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEditing(employee)
                                }
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                            )}

                            {canDeleteEmployee && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteEmployee(employee)
                                }
                                disabled={saving}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-semibold cursor-pointer disabled:opacity-50"
                              >
                                🗑️ Delete
                              </button>
                            )}

                            {!canEditEmployee &&
                              !canDeleteEmployee && (
                                <span className="text-xs font-medium text-gray-400">
                                  View only
                                </span>
                            )}

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {filteredEmployees.length ===
              0 && (
              <div className="p-12 text-center">

                <p className="text-gray-600 font-medium">
                  No employees found.
                </p>

                <p className="text-sm text-gray-400 mt-1">
                  Try changing your search
                  or filters.
                </p>

              </div>
            )}

          </div>
        )}

      </main>

      {/* SMALL LABEL STYLE */}

      <style jsx>{`
        .label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }
      `}</style>

    </div>
  );
}