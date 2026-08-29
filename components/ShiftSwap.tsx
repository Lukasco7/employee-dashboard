'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface Shift {
  id: number;
  employee_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
}

interface SwapRequest {
  id: number;
  requester_employee_id: number;
  target_employee_id: number;
  requester_shift_id: number;
  target_shift_id: number;
  reason: string | null;
  status: 'Pending' | 'Accepted' | 'Approved' | 'Rejected';
  created_at: string;
}

type Tab =
  | 'my-requests'
  | 'request-swap'
  | 'manage';

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

export default function ShiftSwap({
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

  const [tab, setTab] = useState<Tab>(
    canManage
      ? 'manage'
      : 'my-requests'
  );

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [shifts, setShifts] =
    useState<Shift[]>([]);

  const [requests, setRequests] =
    useState<SwapRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [
    currentEmployeeId,
    setCurrentEmployeeId,
  ] = useState<number | null>(null);

  const [
    requesterShiftId,
    setRequesterShiftId,
  ] = useState('');

  const [
    targetEmployeeId,
    setTargetEmployeeId,
  ] = useState('');

  const [
    targetShiftId,
    setTargetShiftId,
  ] = useState('');

  const [reason, setReason] =
    useState('');

  const [
    targetShiftLoading,
    setTargetShiftLoading,
  ] = useState(false);

  useEffect(() => {
    loadData();
    resolveCurrentEmployee();
  }, []);

  const resolveCurrentEmployee =
    async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          setCurrentEmployeeId(null);
          return;
        }

        const {
          data,
          error: employeeError,
        } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (employeeError) {
          throw employeeError;
        }

        if (data) {
          setCurrentEmployeeId(
            Number(data.id)
          );
          return;
        }

        // Backward-compatible email fallback.
        const cleanEmail =
          (
            user.email ||
            userEmail ||
            ''
          )
            .trim()
            .toLowerCase();

        if (!cleanEmail) {
          return;
        }

        const {
          data: emailEmployee,
          error: emailError,
        } = await supabase
          .from('employees')
          .select('id')
          .eq(
            'email',
            cleanEmail
          )
          .maybeSingle();

        if (emailError) {
          throw emailError;
        }

        setCurrentEmployeeId(
          emailEmployee
            ? Number(emailEmployee.id)
            : null
        );
      } catch (err) {
        console.error(
          'Current employee lookup error:',
          getReadableError(err)
        );
        setCurrentEmployeeId(null);
      }
    };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        employeesResult,
        shiftsResult,
        requestsResult,
      ] = await Promise.all([
        supabase
          .from('employees')
          .select(
            'id, name, email, status'
          )
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('shifts')
          .select(
            'id, employee_id, shift_date, start_time, end_time, location, notes'
          )
          .order('shift_date', {
            ascending: true,
          })
          .order('start_time', {
            ascending: true,
          }),

        supabase
          .from('shift_swap_requests')
          .select(
            'id, requester_employee_id, target_employee_id, requester_shift_id, target_shift_id, reason, status, created_at'
          )
          .order('created_at', {
            ascending: false,
          }),
      ]);

      if (employeesResult.error) {
        throw new Error(
          `Employees: ${employeesResult.error.message}`
        );
      }

      if (shiftsResult.error) {
        throw new Error(
          `Shifts: ${shiftsResult.error.message}`
        );
      }

      if (requestsResult.error) {
        throw new Error(
          `Swap requests: ${requestsResult.error.message}`
        );
      }

      setEmployees(
        (employeesResult.data || []).map(
          (employee) => ({
            id: Number(employee.id),
            name:
              employee.name ||
              employee.email ||
              'Unnamed Employee',
            email:
              employee.email || '',
            status:
              employee.status ||
              'Active',
          })
        )
      );

      setShifts(
        (shiftsResult.data || []).map(
          (shift) => ({
            id: Number(shift.id),
            employee_id:
              Number(shift.employee_id),
            shift_date:
              shift.shift_date,
            start_time:
              shift.start_time,
            end_time:
              shift.end_time,
            location:
              shift.location || null,
            notes:
              shift.notes || null,
          })
        )
      );

      setRequests(
        (requestsResult.data || []).map(
          (request) => ({
            id: Number(request.id),
            requester_employee_id:
              Number(
                request.requester_employee_id
              ),
            target_employee_id:
              Number(
                request.target_employee_id
              ),
            requester_shift_id:
              Number(
                request.requester_shift_id
              ),
            target_shift_id:
              Number(
                request.target_shift_id
              ),
            reason:
              request.reason || null,
            status:
              request.status || 'Pending',
            created_at:
              request.created_at,
          })
        )
      );
    } catch (err) {
      console.error(
        'Shift swap load error:',
        getReadableError(err)
      );

      setError(
        getReadableError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const myShifts = useMemo(() => {
    if (
      currentEmployeeId === null
    ) {
      return [];
    }

    return shifts.filter(
      (shift) =>
        shift.employee_id ===
        currentEmployeeId
    );
  }, [
    shifts,
    currentEmployeeId,
  ]);

  const targetEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.status
          .toLowerCase() ===
          'active' &&
        employee.id !==
          currentEmployeeId
    );
  }, [
    employees,
    currentEmployeeId,
  ]);

  const targetEmployeeShifts =
    useMemo(() => {
      if (!targetEmployeeId) {
        return [];
      }

      return shifts.filter(
        (shift) =>
          shift.employee_id ===
          Number(targetEmployeeId)
      );
    }, [
      shifts,
      targetEmployeeId,
    ]);

  const loadTargetEmployeeShifts =
    async (
      employeeId: number
    ) => {
      try {
        setTargetShiftLoading(true);
        setError('');

        // Ask the database for the selected employee's
        // currently scheduled shifts. This avoids relying
        // on a client-side copy of all shifts.
        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          'get_employee_swap_shifts',
          {
            p_employee_id:
              employeeId,
          }
        );

        if (rpcError) {
          console.error(
            'Target shift RPC error:',
            {
              code:
                rpcError.code,
              message:
                rpcError.message,
              details:
                rpcError.details,
              hint:
                rpcError.hint,
            }
          );

          // Fall back to the shifts already loaded on the page.
          const fallback =
            shifts.filter(
              (shift) =>
                shift.employee_id ===
                employeeId
            );

          setShifts(
            (previous) => {
              const withoutTarget =
                previous.filter(
                  (shift) =>
                    shift.employee_id !==
                    employeeId
                );

              return [
                ...withoutTarget,
                ...fallback,
              ];
            }
          );

          throw new Error(
            rpcError.message ||
              'Unable to load that employee’s scheduled shifts.'
          );
        }

        const loadedTargetShifts:
          Shift[] =
          (data || []).map(
            (shift: Shift) => ({
              id: Number(
                shift.id
              ),
              employee_id:
                Number(
                  shift.employee_id
                ),
              shift_date:
                shift.shift_date,
              start_time:
                shift.start_time,
              end_time:
                shift.end_time,
              location:
                shift.location ||
                null,
              notes:
                shift.notes ||
                null,
            })
          );

        // Replace this employee's shifts in local state
        // while preserving everybody else's.
        setShifts(
          (previous) => [
            ...previous.filter(
              (shift) =>
                shift.employee_id !==
                employeeId
            ),
            ...loadedTargetShifts,
          ].sort((a, b) => {
            const aKey =
              `${a.shift_date} ${a.start_time}`;
            const bKey =
              `${b.shift_date} ${b.start_time}`;
            return aKey.localeCompare(
              bKey
            );
          })
        );

        // Clear stale target-shift selection.
        setTargetShiftId('');

        if (
          loadedTargetShifts.length ===
          0
        ) {
          setError(
            'That employee has no scheduled shifts available for swapping.'
          );
        }
      } catch (err) {
        console.error(
          'Unable to load target employee shifts:',
          getReadableError(err)
        );

        setError(
          getReadableError(err)
        );
      } finally {
        setTargetShiftLoading(
          false
        );
      }
    };

  const getEmployeeName = (
    employeeId: number
  ) =>
    employees.find(
      (employee) =>
        employee.id ===
        employeeId
    )?.name ||
    'Unknown Employee';

  const getShift = (
    shiftId: number
  ) =>
    shifts.find(
      (shift) =>
        shift.id === shiftId
    ) || null;

  const format12Hour = (
    time: string
  ) => {
    const [
      hourPart,
      minutePart,
    ] = time.split(':');

    const hour =
      Number(hourPart) || 0;

    const period =
      hour >= 12 ? 'PM' : 'AM';

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${minutePart || '00'} ${period}`;
  };

  const formatDate = (
    date: string
  ) =>
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

  const formatShift = (
    shift: Shift | null
  ) => {
    if (!shift) {
      return 'Shift not found';
    }

    return `${formatDate(
      shift.shift_date
    )} • ${format12Hour(
      shift.start_time
    )} - ${format12Hour(
      shift.end_time
    )}`;
  };

  const statusClass = (
    status: SwapRequest['status']
  ) => {
    if (status === 'Approved') {
      return 'bg-green-100 text-green-800';
    }

    if (status === 'Accepted') {
      return 'bg-blue-100 text-blue-800';
    }

    if (status === 'Rejected') {
      return 'bg-red-100 text-red-800';
    }

    return 'bg-yellow-100 text-yellow-800';
  };

  const myRequests = useMemo(() => {
    if (
      currentEmployeeId === null
    ) {
      return [];
    }

    return requests.filter(
      (request) =>
        request.requester_employee_id ===
          currentEmployeeId ||
        request.target_employee_id ===
          currentEmployeeId
    );
  }, [
    requests,
    currentEmployeeId,
  ]);

  const handleTargetResponse = async (
    request: SwapRequest,
    decision: 'Accepted' | 'Rejected'
  ) => {
    if (
      currentEmployeeId === null ||
      request.target_employee_id !==
        currentEmployeeId
    ) {
      setError(
        'Only the employee receiving this swap request can respond to it.'
      );
      return;
    }

    if (request.status !== 'Pending') {
      setError(
        'This swap request is no longer waiting for a response.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const {
        error: responseError,
      } = await supabase.rpc(
        'respond_to_shift_swap_request',
        {
          p_request_id:
            request.id,
          p_decision:
            decision,
        }
      );

      if (responseError) {
        console.error(
          'Target response RPC error:',
          {
            code:
              responseError.code,
            message:
              responseError.message,
            details:
              responseError.details,
            hint:
              responseError.hint,
          }
        );

        throw new Error(
          responseError.message ||
            'Unable to respond to the swap request.'
        );
      }

      setSuccess(
        decision === 'Accepted'
          ? 'Shift swap accepted. The request is now waiting for Manager/Admin approval.'
          : 'Shift swap request declined.'
      );

      await loadData();
    } catch (err) {
      console.error(
        'Shift swap response error:',
        getReadableError(err)
      );

      setError(
        getReadableError(err)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleManagerDecision = async (
    request: SwapRequest,
    decision: 'Approved' | 'Rejected'
  ) => {
    if (!canManage) {
      setError(
        'Only Admin or Manager accounts can approve or reject swaps.'
      );
      return;
    }

    if (request.status !== 'Accepted') {
      setError(
        'Only swaps accepted by the target employee can be finalized.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const {
        error: decisionError,
      } = await supabase.rpc(
        'manager_decide_shift_swap',
        {
          p_request_id:
            request.id,
          p_decision:
            decision,
        }
      );

      if (decisionError) {
        console.error(
          'Manager decision RPC error:',
          {
            code:
              decisionError.code,
            message:
              decisionError.message,
            details:
              decisionError.details,
            hint:
              decisionError.hint,
          }
        );

        throw new Error(
          decisionError.message ||
            'Unable to finalize the swap request.'
        );
      }

      setSuccess(
        decision === 'Approved'
          ? 'Swap approved and the two employees have exchanged shifts.'
          : 'Swap request rejected.'
      );

      await loadData();
    } catch (err) {
      console.error(
        'Manager shift swap error:',
        getReadableError(err)
      );

      setError(
        getReadableError(err)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequest =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setError('');
      setSuccess('');

      if (
        currentEmployeeId ===
        null
      ) {
        setError(
          'Your account is not linked to an employee record.'
        );
        return;
      }

      if (
        !requesterShiftId ||
        !targetEmployeeId ||
        !targetShiftId
      ) {
        setError(
          'Please select your shift, another employee, and that employee’s shift.'
        );
        return;
      }

      const ownShift =
        getShift(
          Number(requesterShiftId)
        );

      const targetShift =
        getShift(
          Number(targetShiftId)
        );

      if (
        !ownShift ||
        ownShift.employee_id !==
          currentEmployeeId
      ) {
        setError(
          'The selected shift is not assigned to you.'
        );
        return;
      }

      if (
        !targetShift ||
        targetShift.employee_id !==
          Number(targetEmployeeId)
      ) {
        setError(
          'The selected target shift does not belong to that employee.'
        );
        return;
      }

      try {
        setSaving(true);

        const {
          error: insertError,
        } = await supabase.rpc(
          'create_shift_swap_request',
          {
            p_target_employee_id:
              Number(
                targetEmployeeId
              ),
            p_requester_shift_id:
              Number(
                requesterShiftId
              ),
            p_target_shift_id:
              Number(
                targetShiftId
              ),
            p_reason:
              reason.trim() ||
              null,
          }
        );

        if (insertError) {
          console.error(
            'Create swap RPC error:',
            {
              code:
                insertError.code,
              message:
                insertError.message,
              details:
                insertError.details,
              hint:
                insertError.hint,
            }
          );

          throw new Error(
            insertError.message ||
              'Unable to submit swap request.'
          );
        }

        setRequesterShiftId('');
        setTargetEmployeeId('');
        setTargetShiftId('');
        setReason('');

        setSuccess(
          'Shift swap request submitted successfully.'
        );

        setTab('my-requests');

        await loadData();
      } catch (err) {
        console.error(
          'Create swap request error:',
          getReadableError(err)
        );

        setError(
          getReadableError(err)
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
              Shift Swapping
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Request, review, and manage shift swaps
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
              Shift Swap Error
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
              setTab(
                'my-requests'
              )
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              tab === 'my-requests'
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">
              🔄
            </div>
            <p className="font-bold text-gray-800">
              My Requests
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Track your swap requests
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setTab(
                'request-swap'
              )
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              tab === 'request-swap'
                ? 'bg-purple-50 border-purple-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">
              📨
            </div>
            <p className="font-bold text-gray-800">
              Request a Swap
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Ask another employee to exchange shifts
            </p>
          </button>

          {canManage ? (
            <button
              type="button"
              onClick={() =>
                setTab('manage')
              }
              className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
                tab === 'manage'
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
                Approve or reject pending swaps
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
              Loading shift swap data...
            </p>
          </div>
        ) : (
          <>
            {tab ===
              'request-swap' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Request a Shift Swap
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose one of your shifts and another employee’s scheduled shift.
                  </p>
                </div>

                {!currentEmployeeId ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
                    Your account is not linked to an employee record.
                  </div>
                ) : (
                  <form
                    onSubmit={
                      handleCreateRequest
                    }
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Shift
                      </label>

                      <select
                        value={
                          requesterShiftId
                        }
                        onChange={(e) =>
                          setRequesterShiftId(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                        required
                      >
                        <option value="">
                          Select your shift
                        </option>

                        {myShifts.map(
                          (shift) => (
                            <option
                              key={
                                shift.id
                              }
                              value={
                                shift.id
                              }
                            >
                              {formatShift(
                                shift
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee
                      </label>

                      <select
                        value={
                          targetEmployeeId
                        }
                        onChange={async (
                          e
                        ) => {
                          const selected =
                            e.target
                              .value;

                          setTargetEmployeeId(
                            selected
                          );
                          setTargetShiftId(
                            ''
                          );

                          if (
                            selected
                          ) {
                            await loadTargetEmployeeShifts(
                              Number(
                                selected
                              )
                            );
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                        required
                      >
                        <option value="">
                          Select employee
                        </option>

                        {targetEmployees.map(
                          (
                            employee
                          ) => (
                            <option
                              key={
                                employee.id
                              }
                              value={
                                employee.id
                              }
                            >
                              {employee.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Their Shift
                      </label>

                      <select
                        value={
                          targetShiftId
                        }
                        onChange={(e) =>
                          setTargetShiftId(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                        required
                        disabled={
                          !targetEmployeeId ||
                          targetShiftLoading
                        }
                      >
                        <option value="">
                          {targetShiftLoading
                            ? 'Loading their shifts...'
                            : targetEmployeeId
                            ? targetEmployeeShifts
                                .length > 0
                              ? 'Select their shift'
                              : 'No scheduled shifts'
                            : 'Select employee first'}
                        </option>

                        {targetEmployeeShifts.map(
                          (
                            shift
                          ) => (
                            <option
                              key={
                                shift.id
                              }
                              value={
                                shift.id
                              }
                            >
                              {formatShift(
                                shift
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>

                      <input
                        type="text"
                        value={
                          reason
                        }
                        onChange={(e) =>
                          setReason(
                            e.target
                              .value
                          )
                        }
                        placeholder="Optional reason for the swap"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          targetShiftLoading
                        }
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {saving
                          ? 'Submitting...'
                          : 'Submit Swap Request'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {tab ===
              'my-requests' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-800">
                    My Shift Swap Requests
                  </h2>
                </div>

                {myRequests.length ===
                0 ? (
                  <div className="p-12 text-center">
                    No swap requests yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {myRequests.map(
                      (request) => (
                        <div
                          key={
                            request.id
                          }
                          className="p-6"
                        >
                          <div className="flex flex-col lg:flex-row justify-between gap-5">
                            <div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                                  request.status
                                )}`}
                              >
                                {request.status}
                              </span>

                              <p className="font-bold text-gray-800 mt-3">
                                {getEmployeeName(
                                  request.requester_employee_id
                                )}{' '}
                                ↔{' '}
                                {getEmployeeName(
                                  request.target_employee_id
                                )}
                              </p>

                              <p className="text-sm text-gray-600 mt-1">
                                {formatShift(
                                  getShift(
                                    request.requester_shift_id
                                  )
                                )}
                              </p>

                              <p className="text-sm text-gray-600">
                                ↔{' '}
                                {formatShift(
                                  getShift(
                                    request.target_shift_id
                                  )
                                )}
                              </p>

                              <p className="text-xs text-gray-500 mt-3">
                                {currentEmployeeId ===
                                request.target_employee_id
                                  ? 'This request is addressed to you.'
                                  : request.status === 'Pending'
                                  ? 'Waiting for the other employee to accept or decline.'
                                  : request.status === 'Accepted'
                                  ? 'Accepted and waiting for Manager/Admin approval.'
                                  : ''}
                              </p>
                            </div>

                            {currentEmployeeId ===
                              request.target_employee_id &&
                              request.status ===
                                'Pending' && (
                                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 self-start">
                                  <button
                                    type="button"
                                    disabled={
                                      saving
                                    }
                                    onClick={() =>
                                      handleTargetResponse(
                                        request,
                                        'Accepted'
                                      )
                                    }
                                    className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                                  >
                                    ✅ Accept
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      saving
                                    }
                                    onClick={() =>
                                      handleTargetResponse(
                                        request,
                                        'Rejected'
                                      )
                                    }
                                    className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                                  >
                                    ❌ Decline
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {tab ===
              'manage' &&
              canManage && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-5">
                    Accepted Shift Swap Requests
                  </h2>

                  {requests
                    .filter(
                      (request) =>
                        request.status ===
                        'Accepted'
                    )
                    .map(
                      (request) => (
                        <div
                          key={
                            request.id
                          }
                          className="border rounded-xl p-5 mb-4"
                        >
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Shift Swap Request #{request.id}
                                </p>

                                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                                  {getEmployeeName(
                                    request.requester_employee_id
                                  )}
                                  <span className="mx-2 text-purple-600">
                                    ↔
                                  </span>
                                  {getEmployeeName(
                                    request.target_employee_id
                                  )}
                                </h3>

                                <p className="text-sm text-slate-600 mt-1">
                                  {getEmployeeName(
                                    request.requester_employee_id
                                  )}{' '}
                                  is requesting to exchange shifts with{' '}
                                  {getEmployeeName(
                                    request.target_employee_id
                                  )}.
                                </p>
                              </div>

                              <span className="self-start px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                Accepted — Awaiting Approval
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                  Requester&apos;s Shift
                                </p>

                                <p className="text-lg font-bold text-slate-900 mt-2">
                                  {getEmployeeName(
                                    request.requester_employee_id
                                  )}
                                </p>

                                <p className="text-sm font-medium text-slate-700 mt-1">
                                  {formatShift(
                                    getShift(
                                      request.requester_shift_id
                                    )
                                  )}
                                </p>

                                <p className="text-xs text-slate-600 mt-2">
                                  This is the shift being offered.
                                </p>
                              </div>

                              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                                  Target Employee&apos;s Shift
                                </p>

                                <p className="text-lg font-bold text-slate-900 mt-2">
                                  {getEmployeeName(
                                    request.target_employee_id
                                  )}
                                </p>

                                <p className="text-sm font-medium text-slate-700 mt-1">
                                  {formatShift(
                                    getShift(
                                      request.target_shift_id
                                    )
                                  )}
                                </p>

                                <p className="text-xs text-slate-600 mt-2">
                                  This is the shift requested in exchange.
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                Reason for Swap
                              </p>

                              <p className="text-base font-semibold text-slate-900 mt-2 whitespace-pre-wrap">
                                {request.reason?.trim()
                                  ? request.reason
                                  : 'No reason was provided.'}
                              </p>
                            </div>

                            <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Requested On
                              </p>

                              <p className="text-sm font-semibold text-slate-800 mt-1">
                                {new Date(
                                  request.created_at
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 mt-5">
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                handleManagerDecision(
                                  request,
                                  'Approved'
                                )
                              }
                              className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              ✅ Approve Swap
                            </button>

                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                handleManagerDecision(
                                  request,
                                  'Rejected'
                                )
                              }
                              className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              ❌ Reject Swap
                            </button>
                          </div>
                        </div>
                      )
                    )}
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}
