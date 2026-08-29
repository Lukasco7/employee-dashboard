'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface TimeOffRequest {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  request_type: string;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

type Tab = 'my-requests' | 'new-request' | 'manage';

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const getReadableError = (error: unknown) => {
  if (!error) return 'Unknown database error.';

  if (error instanceof Error) {
    return error.message;
  }

  try {
    const serialized = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error),
      2
    );

    return serialized && serialized !== '{}'
      ? serialized
      : String(error);
  } catch {
    return String(error);
  }
};

export default function TimeOffRequests({
  onBack,
  userRole,
  userEmail,
}: {
  onBack: () => void;
  userRole: string;
  userEmail: string;
}) {
  const normalizedRole =
    userRole.trim().toLowerCase();

  const canManage =
    normalizedRole === 'admin' ||
    normalizedRole === 'manager';

  const [activeTab, setActiveTab] =
    useState<Tab>(
      canManage ? 'manage' : 'my-requests'
    );

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [requests, setRequests] =
    useState<TimeOffRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [startDate, setStartDate] =
    useState('');

  const [endDate, setEndDate] =
    useState('');

  const [requestType, setRequestType] =
    useState('Annual Leave');

  const [reason, setReason] =
    useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const requestsResult =
        await supabase
          .from('time_off_requests')
          .select(
            'id, employee_id, start_date, end_date, request_type, reason, status, created_at'
          )
          .order('created_at', {
            ascending: false,
          });

      if (requestsResult.error) {
        throw new Error(
          `Time-off requests: ${requestsResult.error.message}`
        );
      }

      let employeesData: any[] = [];

      if (canManage) {
        const {
          data,
          error,
        } = await supabase
          .from('employees')
          .select(
            'id, name, email, status'
          )
          .order('name', {
            ascending: true,
          });

        if (error) {
          throw new Error(
            `Employees: ${error.message}`
          );
        }

        employeesData = data || [];
      } else {
        const {
          data,
          error,
        } = await supabase
          .from('employees')
          .select(
            'id, name, email, status'
          )
          .eq(
            'user_id',
            (
              await supabase.auth.getUser()
            ).data.user?.id || ''
          )
          .maybeSingle();

        if (error) {
          throw new Error(
            `Employee: ${error.message}`
          );
        }

        employeesData =
          data ? [data] : [];
      }

      setEmployees(
        employeesData.map(
          (employee) => ({
            id: Number(employee.id),
            name:
              employee.name ||
              employee.email ||
              'Unnamed Employee',
            email:
              employee.email || '',
            status:
              employee.status || 'Active',
          })
        )
      );

      setRequests(
        (requestsResult.data || []).map(
          (request) => ({
            id: Number(request.id),
            employee_id:
              Number(request.employee_id),
            start_date:
              request.start_date,
            end_date:
              request.end_date,
            request_type:
              request.request_type ||
              'Annual Leave',
            reason:
              request.reason || null,
            status:
              request.status ||
              'Pending',
            created_at:
              request.created_at,
          })
        )
      );
    } catch (err) {
      console.error(
        'Time-off load error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load time-off requests.'
      );
    } finally {
      setLoading(false);
    }
  };

  const [authEmployeeId, setAuthEmployeeId] =
    useState<number | null>(null);

  const [identityLoading, setIdentityLoading] =
    useState(true);

  useEffect(() => {
    const loadAuthEmployee = async () => {
      try {
        setIdentityLoading(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          setAuthEmployeeId(null);
          return;
        }

        // Primary identity mapping: Auth UUID -> employees.user_id
        const {
          data: byUserId,
          error: userIdError,
        } = await supabase
          .from('employees')
          .select('id')
          .eq(
            'user_id',
            user.id
          )
          .maybeSingle();

        if (userIdError) {
          throw userIdError;
        }

        if (byUserId) {
          setAuthEmployeeId(
            Number(byUserId.id)
          );
          return;
        }

        // Backward-compatible fallback for older employee rows
        // that have not yet been linked with user_id.
        const {
          data: byEmail,
          error: emailError,
        } = await supabase
          .from('employees')
          .select('id')
          .eq(
            'email',
            user.email || ''
          )
          .maybeSingle();

        if (emailError) {
          throw emailError;
        }

        setAuthEmployeeId(
          byEmail
            ? Number(byEmail.id)
            : null
        );
      } catch (err) {
        console.error(
          'Employee identity lookup error:',
          getReadableError(err)
        );
        setAuthEmployeeId(null);
      } finally {
        setIdentityLoading(false);
      }
    };

    loadAuthEmployee();
  }, []);

  const currentEmployee = useMemo(() => {
    if (authEmployeeId === null) {
      return null;
    }

    return (
      employees.find(
        (employee) =>
          employee.id ===
          authEmployeeId
      ) || null
    );
  }, [
    employees,
    authEmployeeId,
  ]);

  const myRequests = useMemo(() => {
    if (!currentEmployee) return [];

    return requests.filter(
      (request) =>
        request.employee_id ===
        currentEmployee.id
    );
  }, [requests, currentEmployee]);

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === 'Pending'
      ),
    [requests]
  );

  const getEmployeeName = (
    employeeId: number
  ) =>
    employees.find(
      (employee) =>
        employee.id === employeeId
    )?.name || 'Unknown Employee';

  const formatDate = (date: string) =>
    new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      undefined,
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );

  const calculateDays = (
    start: string,
    end: string
  ) => {
    const startDateValue =
      new Date(
        `${start}T00:00:00`
      );

    const endDateValue =
      new Date(
        `${end}T00:00:00`
      );

    const difference =
      endDateValue.getTime() -
      startDateValue.getTime();

    return (
      Math.floor(
        difference /
          (1000 * 60 * 60 * 24)
      ) + 1
    );
  };

  const statusClass = (
    status: TimeOffRequest['status']
  ) => {
    if (status === 'Approved') {
      return 'bg-green-100 text-green-800';
    }

    if (status === 'Rejected') {
      return 'bg-red-100 text-red-800';
    }

    return 'bg-yellow-100 text-yellow-800';
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setRequestType('Annual Leave');
    setReason('');
  };

  const handleCreateRequest = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!currentEmployee) {
      setError(
        'Your account is not linked to an employee record. Please ask an administrator to link this login before submitting time-off.'
      );
      return;
    }

    if (!startDate || !endDate) {
      setError(
        'Please select both a start date and an end date.'
      );
      return;
    }

    if (endDate < startDate) {
      setError(
        'End date cannot be earlier than the start date.'
      );
      return;
    }

    try {
      setSaving(true);

      const conflictData =
        requests.filter(
          (request) =>
            request.employee_id ===
              currentEmployee.id &&
            request.status !==
              'Rejected' &&
            request.start_date <=
              endDate &&
            request.end_date >=
              startDate
        );

      if (conflictData.length > 0) {
        setError(
          'You already have a pending or approved time-off request that overlaps these dates.'
        );
        return;
      }

      const { error: insertError } =
        await supabase
          .from('time_off_requests')
          .insert({
            employee_id:
              currentEmployee.id,
            start_date: startDate,
            end_date: endDate,
            request_type: requestType,
            reason:
              reason.trim() || null,
            status: 'Pending',
          });

      if (insertError) {
        throw insertError;
      }

      resetForm();
      setSuccess(
        'Time-off request submitted successfully.'
      );
      setActiveTab('my-requests');

      await loadData();
    } catch (err) {
      console.error(
        'Time-off request error:',
        err
      );

      console.error(
        'Readable time-off request error:',
        getReadableError(err)
      );

      setError(
        `Unable to submit request: ${getReadableError(
          err
        )}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (
    request: TimeOffRequest,
    decision: 'Approved' | 'Rejected'
  ) => {
    if (!canManage) return;

    setError('');
    setSuccess('');

    try {
      setSaving(true);

      const {
        data: conflictingApproved,
        error: conflictError,
      } = await supabase
        .from('time_off_requests')
        .select(
          'id, start_date, end_date, status'
        )
        .eq(
          'employee_id',
          request.employee_id
        )
        .eq(
          'status',
          'Approved'
        )
        .neq(
          'id',
          request.id
        )
        .lte(
          'start_date',
          request.end_date
        )
        .gte(
          'end_date',
          request.start_date
        );

      if (conflictError) {
        throw conflictError;
      }

      if (
        decision === 'Approved' &&
        conflictingApproved &&
        conflictingApproved.length > 0
      ) {
        throw new Error(
          'This employee already has an approved time-off request overlapping these dates.'
        );
      }

      const { error: updateError } =
        await supabase
          .from('time_off_requests')
          .update({
            status: decision,
          })
          .eq(
            'id',
            request.id
          )
          .eq(
            'status',
            'Pending'
          );

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        decision === 'Approved'
          ? 'Time-off request approved.'
          : 'Time-off request rejected.'
      );

      await loadData();
    } catch (err) {
      console.error(
        'Time-off review error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to review the time-off request.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Time-Off Requests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Request leave and manage approval
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
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            <p className="font-semibold">
              Time-Off Error
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <button
            type="button"
            onClick={() =>
              setActiveTab('my-requests')
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              activeTab === 'my-requests'
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">
              📋
            </div>
            <p className="font-bold text-gray-800">
              My Requests
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Track your leave requests
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab('new-request')
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              activeTab === 'new-request'
                ? 'bg-purple-50 border-purple-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">
              📨
            </div>
            <p className="font-bold text-gray-800">
              New Request
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Submit a new time-off request
            </p>
          </button>

          {canManage ? (
            <button
              type="button"
              onClick={() =>
                setActiveTab('manage')
              }
              className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-green-50 border-green-300 shadow-sm'
                  : 'bg-white border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="text-3xl mb-3">
                ✅
              </div>
              <p className="font-bold text-gray-800">
                Manage Requests
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Review pending leave requests
              </p>
            </button>
          ) : (
            <div className="rounded-2xl p-5 border bg-white border-gray-200">
              <div className="text-3xl mb-3">
                🛡️
              </div>
              <p className="font-bold text-gray-800">
                Approval
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Manager or Admin approval is required
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-gray-600">
              Loading time-off requests...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'new-request' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Submit Time-Off Request
                </h2>

                <p className="text-sm text-gray-500 mt-1 mb-6">
                  Select the dates and type of leave you need.
                </p>

                {identityLoading ? (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4">
                    Checking your employee account...
                  </div>
                ) : !currentEmployee ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
                    Your account is not linked to an employee record yet. An administrator needs to link this login to the employee profile.
                  </div>
                ) : (
                  <form
                    onSubmit={handleCreateRequest}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>

                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                          setStartDate(
                            e.target.value
                          )
                        }
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>

                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                          setEndDate(
                            e.target.value
                          )
                        }
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Type
                      </label>

                      <select
                        value={requestType}
                        onChange={(e) =>
                          setRequestType(
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option>
                          Annual Leave
                        </option>
                        <option>
                          Sick Leave
                        </option>
                        <option>
                          Personal Leave
                        </option>
                        <option>
                          Emergency Leave
                        </option>
                        <option>
                          Study Leave
                        </option>
                        <option>
                          Other
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>

                      <input
                        type="text"
                        value={reason}
                        onChange={(e) =>
                          setReason(
                            e.target.value
                          )
                        }
                        className={inputClass}
                        placeholder="Optional reason"
                      />
                    </div>

                    {startDate &&
                      endDate &&
                      endDate >=
                        startDate && (
                        <div className="md:col-span-2 rounded-xl bg-blue-50 border border-blue-100 p-4">
                          <p className="text-xs uppercase tracking-wide font-semibold text-blue-600">
                            Request Summary
                          </p>

                          <p className="font-bold text-blue-900 mt-1">
                            {formatDate(
                              startDate
                            )}{' '}
                            -{' '}
                            {formatDate(
                              endDate
                            )}
                          </p>

                          <p className="text-sm text-blue-700 mt-1">
                            {
                              calculateDays(
                                startDate,
                                endDate
                              )
                            }{' '}
                            day
                            {calculateDays(
                              startDate,
                              endDate
                            ) === 1
                              ? ''
                              : 's'}{' '}
                            •{' '}
                            {requestType}
                          </p>
                        </div>
                      )}

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {saving
                          ? 'Submitting...'
                          : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'my-requests' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-800">
                    My Time-Off Requests
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Your submitted requests and their status
                  </p>
                </div>

                {myRequests.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-5xl mb-4">
                      🗓️
                    </div>
                    <p className="font-semibold text-gray-700">
                      No time-off requests yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {myRequests.map(
                      (request) => (
                        <div
                          key={request.id}
                          className="p-6"
                        >
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg">
                                {
                                  request.request_type
                                }
                              </h3>

                              <p className="text-sm text-gray-600 mt-2">
                                {formatDate(
                                  request.start_date
                                )}{' '}
                                -{' '}
                                {formatDate(
                                  request.end_date
                                )}
                              </p>

                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  calculateDays(
                                    request.start_date,
                                    request.end_date
                                  )
                                }{' '}
                                day
                                {calculateDays(
                                  request.start_date,
                                  request.end_date
                                ) === 1
                                  ? ''
                                  : 's'}
                              </p>

                              {request.reason && (
                                <p className="text-sm text-gray-600 mt-3">
                                  <span className="font-semibold">
                                    Reason:
                                  </span>{' '}
                                  {
                                    request.reason
                                  }
                                </p>
                              )}

                              <p className="text-xs text-gray-400 mt-3">
                                Submitted{' '}
                                {new Date(
                                  request.created_at
                                ).toLocaleString()}
                              </p>
                            </div>

                            <span
                              className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manage' &&
              canManage && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        Pending Time-Off Requests
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Review requests from employees
                      </p>
                    </div>

                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold self-start">
                      {pendingRequests.length}{' '}
                      pending
                    </span>
                  </div>

                  {pendingRequests.length ===
                  0 ? (
                    <div className="p-12 text-center">
                      <div className="text-5xl mb-4">
                        ✅
                      </div>

                      <p className="font-semibold text-gray-700">
                        No pending requests.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {pendingRequests.map(
                        (request) => (
                          <div
                            key={request.id}
                            className="p-6"
                          >
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                              <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                  {getEmployeeName(
                                    request.employee_id
                                  )}
                                </h3>

                                <p className="text-sm text-blue-700 font-semibold mt-2">
                                  {
                                    request.request_type
                                  }
                                </p>

                                <p className="text-sm text-gray-600 mt-1">
                                  {formatDate(
                                    request.start_date
                                  )}{' '}
                                  -{' '}
                                  {formatDate(
                                    request.end_date
                                  )}
                                </p>

                                <p className="text-sm text-gray-500 mt-1">
                                  {
                                    calculateDays(
                                      request.start_date,
                                      request.end_date
                                    )
                                  }{' '}
                                  day
                                  {calculateDays(
                                    request.start_date,
                                    request.end_date
                                  ) === 1
                                    ? ''
                                    : 's'}
                                </p>

                                {request.reason && (
                                  <p className="text-sm text-gray-600 mt-3">
                                    <span className="font-semibold">
                                      Reason:
                                    </span>{' '}
                                    {
                                      request.reason
                                    }
                                  </p>
                                )}
                              </div>

                              <div className="flex lg:flex-col gap-3 self-start">
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleReview(
                                      request,
                                      'Approved'
                                    )
                                  }
                                  className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                                >
                                  ✅ Approve
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleReview(
                                      request,
                                      'Rejected'
                                    )
                                  }
                                  className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}
