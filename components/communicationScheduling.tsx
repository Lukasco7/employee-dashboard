'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
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

type Tab = 'overview' | 'announcements' | 'schedule';

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function CommunicationScheduling({
  onBack,
}: {
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] =
    useState<Tab>('overview');

  const [employees, setEmployees] =
    useState<Employee[]>([]);
  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);
  const [shifts, setShifts] =
    useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [currentRole, setCurrentRole] = useState('');

  const [showAnnouncementForm, setShowAnnouncementForm] =
    useState(false);

  const [announcementTitle, setAnnouncementTitle] =
    useState('');
  const [announcementMessage, setAnnouncementMessage] =
    useState('');
  const [announcementPriority, setAnnouncementPriority] =
    useState('Normal');

  const [showShiftForm, setShowShiftForm] =
    useState(false);
  const [shiftEmployeeId, setShiftEmployeeId] =
    useState('');
  const [shiftDate, setShiftDate] =
    useState('');
  const [shiftStartHour, setShiftStartHour] =
    useState('08');
  const [shiftStartMinute, setShiftStartMinute] =
    useState('00');
  const [shiftStartPeriod, setShiftStartPeriod] =
    useState<'AM' | 'PM'>('AM');

  const [shiftEndHour, setShiftEndHour] =
    useState('05');
  const [shiftEndMinute, setShiftEndMinute] =
    useState('00');
  const [shiftEndPeriod, setShiftEndPeriod] =
    useState<'AM' | 'PM'>('PM');
  const [shiftLocation, setShiftLocation] =
    useState('');
  const [shiftNotes, setShiftNotes] =
    useState('');

  const fetchCurrentRole = async () => {
    // Prefer the role already stored by the login flow.
    try {
      const savedUser =
        typeof window !== 'undefined'
          ? localStorage.getItem('user')
          : null;

      const storedRole = savedUser
        ? String(
            JSON.parse(savedUser)?.role || ''
          )
            .toLowerCase()
            .trim()
        : '';

      if (storedRole) {
        setCurrentRole(storedRole);
        return storedRole;
      }
    } catch {
      // Fall through to the database lookup.
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error(
        'Your login session has expired. Please log in again.'
      );
    }

    const {
      data: userRow,
      error: userError,
    } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!userRow?.role_id) {
      setCurrentRole('');
      return '';
    }

    const {
      data: roleRow,
      error: roleError,
    } = await supabase
      .from('roles')
      .select('name')
      .eq('id', userRow.role_id)
      .maybeSingle();

    if (roleError) {
      throw roleError;
    }

    const role = String(
      roleRow?.name || ''
    )
      .toLowerCase()
      .trim();

    setCurrentRole(role);
    return role;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        employeesResult,
        announcementsResult,
        shiftsResult,
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('id, name, email, role, status')
          .order('name', { ascending: true }),

        supabase
          .from('announcements')
          .select(
            'id, title, message, priority, created_at'
          )
          .order('created_at', {
            ascending: false,
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
      ]);

      if (employeesResult.error) {
        throw new Error(
          `Employees: ${employeesResult.error.message}`
        );
      }

      if (announcementsResult.error) {
        throw new Error(
          `Announcements: ${announcementsResult.error.message}`
        );
      }

      if (shiftsResult.error) {
        throw new Error(
          `Shifts: ${shiftsResult.error.message}`
        );
      }

      setEmployees(
        (employeesResult.data || []).map(
          (employee) => ({
            id: Number(employee.id),
            name:
              employee.name ||
              employee.email,
            email: employee.email || '',
            role: employee.role || '',
            status: employee.status || 'Active',
          })
        )
      );

      setAnnouncements(
        (announcementsResult.data || []).map(
          (announcement) => ({
            id: Number(announcement.id),
            title: announcement.title || '',
            message:
              announcement.message || '',
            priority:
              announcement.priority ||
              'Normal',
            created_at:
              announcement.created_at,
          })
        )
      );

      setShifts(
        (shiftsResult.data || []).map(
          (shift) => ({
            id: Number(shift.id),
            employee_id:
              Number(shift.employee_id),
            shift_date: shift.shift_date,
            start_time:
              shift.start_time,
            end_time:
              shift.end_time,
            location:
              shift.location || null,
            notes: shift.notes || null,
          })
        )
      );
    } catch (err) {
      console.error(
        'Communication & Scheduling load error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load communication and scheduling data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRole()
      .catch((err) => {
        console.error(
          'Role loading error:',
          err
        );
      })
      .finally(() => {
        fetchData();
      });
  }, []);

  const employeeName = (employeeId: number) => {
    return (
      employees.find(
        (employee) =>
          employee.id === employeeId
      )?.name || 'Unknown Employee'
    );
  };

  const convertTo24Hour = (
    hour: string,
    minute: string,
    period: 'AM' | 'PM'
  ) => {
    let numericHour = Number(hour);

    if (period === 'AM' && numericHour === 12) {
      numericHour = 0;
    }

    if (period === 'PM' && numericHour !== 12) {
      numericHour += 12;
    }

    return `${String(numericHour).padStart(2, '0')}:${minute}:00`;
  };

  const format12Hour = (value: string) => {
    const [hourPart, minutePart] = value.split(':');
    const hour = Number(hourPart);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${String(displayHour).padStart(2, '0')}:${minutePart} ${period}`;
  };

  const getMinutesFromTime = (
    hour: string,
    minute: string,
    period: 'AM' | 'PM'
  ) => {
    let numericHour = Number(hour) % 12;

    if (period === 'PM') {
      numericHour += 12;
    }

    return numericHour * 60 + Number(minute);
  };

  const formatDuration = (
    startMinutes: number,
    endMinutes: number
  ) => {
    let difference = endMinutes - startMinutes;

    if (difference < 0) {
      difference += 24 * 60;
    }

    const hours = Math.floor(difference / 60);
    const minutes = difference % 60;

    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

  const currentStartMinutes = getMinutesFromTime(
    shiftStartHour,
    shiftStartMinute,
    shiftStartPeriod
  );

  const currentEndMinutes = getMinutesFromTime(
    shiftEndHour,
    shiftEndMinute,
    shiftEndPeriod
  );

  const currentShiftDuration = formatDuration(
    currentStartMinutes,
    currentEndMinutes
  );

  const upcomingShifts = useMemo(() => {
    const today =
      new Date().toISOString().split('T')[0];

    return shifts
      .filter(
        (shift) => shift.shift_date >= today
      )
      .slice(0, 8);
  }, [shifts]);

  const handleCreateAnnouncement = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      !announcementTitle.trim() ||
      !announcementMessage.trim()
    ) {
      setError(
        'Please enter an announcement title and message.'
      );
      return;
    }

    try {
      setSaving(true);

      const { error: insertError } =
        await supabase
          .from('announcements')
          .insert({
            title:
              announcementTitle.trim(),
            message:
              announcementMessage.trim(),
            priority:
              announcementPriority,
          });

      if (insertError) {
        throw insertError;
      }

      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementPriority('Normal');
      setShowAnnouncementForm(false);
      setSuccess(
        'Announcement published successfully.'
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Announcement error:',
        err
      );

      setError(
        err instanceof Error
          ? `Unable to publish announcement: ${err.message}`
          : 'Unable to publish announcement.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      !shiftEmployeeId ||
      !shiftDate ||
      !shiftStartHour ||
      !shiftStartMinute ||
      !shiftStartPeriod ||
      !shiftEndHour ||
      !shiftEndMinute ||
      !shiftEndPeriod
    ) {
      setError(
        'Please complete the employee, date and shift times.'
      );
      return;
    }

    const startTime = convertTo24Hour(
      shiftStartHour,
      shiftStartMinute,
      shiftStartPeriod
    );

    const endTime = convertTo24Hour(
      shiftEndHour,
      shiftEndMinute,
      shiftEndPeriod
    );

    if (endTime <= startTime) {
      setError(
        'Shift end time must be later than the start time.'
      );
      return;
    }

    try {
      setSaving(true);

      const role =
        currentRole ||
        (await fetchCurrentRole());

      if (
        role !== 'admin' &&
        role !== 'manager'
      ) {
        throw new Error(
          'Only Admin or Manager accounts can create employee shifts.'
        );
      }

      const {
        error: insertError,
      } = await supabase.rpc(
        'create_employee_shift',
        {
          p_employee_id:
            Number(shiftEmployeeId),
          p_shift_date:
            shiftDate,
          p_start_time:
            startTime,
          p_end_time:
            endTime,
          p_location:
            shiftLocation.trim() ||
            null,
          p_notes:
            shiftNotes.trim() || null,
        }
      );

      if (insertError) {
        console.error(
          'Shift RPC error:',
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
            insertError.details ||
            insertError.hint ||
            'Unable to create shift.'
        );
      }

      setShiftEmployeeId('');
      setShiftDate('');
      setShiftStartHour('08');
      setShiftStartMinute('00');
      setShiftStartPeriod('AM');
      setShiftEndHour('05');
      setShiftEndMinute('00');
      setShiftEndPeriod('PM');
      setShiftLocation('');
      setShiftNotes('');
      setShowShiftForm(false);

      setSuccess(
        'Shift created successfully.'
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Shift creation error:',
        err
      );

      setError(
        err instanceof Error
          ? `Unable to create shift: ${err.message}`
          : 'Unable to create shift.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (
    shift: Shift
  ) => {
    const confirmed =
      window.confirm(
        `Delete ${employeeName(
          shift.employee_id
        )}'s shift on ${shift.shift_date}?`
      );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: deleteError } =
        await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        'Shift deleted successfully.'
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Delete shift error:',
        err
      );

      setError(
        err instanceof Error
          ? `Unable to delete shift: ${err.message}`
          : 'Unable to delete shift.'
      );
    } finally {
      setSaving(false);
    }
  };

  const priorityClass = (
    priority: string
  ) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Communication & Scheduling
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Keep your team informed and organized
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
              Scheduling Error
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
              setActiveTab('overview')
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">📊</div>
            <p className="font-bold text-gray-800">
              Overview
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Team activity and upcoming shifts
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                'announcements'
              )
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-purple-50 border-purple-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">📢</div>
            <p className="font-bold text-gray-800">
              Announcements
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Share important team messages
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab('schedule')
            }
            className={`rounded-2xl p-5 text-left border transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-green-50 border-green-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">🗓️</div>
            <p className="font-bold text-gray-800">
              Schedule
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Create and review employee shifts
            </p>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-gray-600">
              Loading communication and scheduling...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-sm text-gray-500">
                      Active Employees
                    </p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {
                        employees.filter(
                          (employee) =>
                            employee.status
                              .toLowerCase() ===
                            'active'
                        ).length
                      }
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-sm text-gray-500">
                      Announcements
                    </p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {announcements.length}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-sm text-gray-500">
                      Upcoming Shifts
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {upcomingShifts.length}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-center gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        Recent Announcements
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Latest messages for your team
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          'announcements'
                        )
                      }
                      className="text-purple-600 font-semibold hover:underline cursor-pointer"
                    >
                      View all →
                    </button>
                  </div>

                  {announcements.length ===
                  0 ? (
                    <p className="text-gray-500">
                      No announcements yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {announcements
                        .slice(0, 5)
                        .map(
                          (announcement) => (
                            <div
                              key={
                                announcement.id
                              }
                              className="border border-gray-200 rounded-xl p-4"
                            >
                              <div className="flex justify-between gap-4">
                                <div>
                                  <h3 className="font-bold text-gray-800">
                                    {
                                      announcement.title
                                    }
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {
                                      announcement.message
                                    }
                                  </p>
                                </div>

                                <span
                                  className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${priorityClass(
                                    announcement.priority
                                  )}`}
                                >
                                  {
                                    announcement.priority
                                  }
                                </span>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab ===
              'announcements' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAnnouncementForm(
                        !showAnnouncementForm
                      )
                    }
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold cursor-pointer"
                  >
                    {showAnnouncementForm
                      ? 'Cancel'
                      : '+ New Announcement'}
                  </button>
                </div>

                {showAnnouncementForm && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-5">
                      Publish Announcement
                    </h2>

                    <form
                      onSubmit={
                        handleCreateAnnouncement
                      }
                      className="space-y-5"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          value={
                            announcementTitle
                          }
                          onChange={(e) =>
                            setAnnouncementTitle(
                              e.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="e.g. Saturday stock count"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message
                        </label>
                        <textarea
                          value={
                            announcementMessage
                          }
                          onChange={(e) =>
                            setAnnouncementMessage(
                              e.target.value
                            )
                          }
                          className={`${inputClass} min-h-[140px] resize-y`}
                          placeholder="Write the message for your team..."
                          required
                        />
                      </div>

                      <div className="max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>

                        <select
                          value={
                            announcementPriority
                          }
                          onChange={(e) =>
                            setAnnouncementPriority(
                              e.target.value
                            )
                          }
                          className={inputClass}
                        >
                          <option value="Normal">
                            Normal
                          </option>
                          <option value="High">
                            High
                          </option>
                          <option value="Urgent">
                            Urgent
                          </option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {saving
                          ? 'Publishing...'
                          : 'Publish Announcement'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-5">
                    Team Announcements
                  </h2>

                  {announcements.length ===
                  0 ? (
                    <p className="text-gray-500">
                      No announcements found.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map(
                        (announcement) => (
                          <article
                            key={
                              announcement.id
                            }
                            className="border border-gray-200 rounded-xl p-5"
                          >
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                              <div>
                                <h3 className="font-bold text-gray-800 text-lg">
                                  {
                                    announcement.title
                                  }
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(
                                    announcement.created_at
                                  ).toLocaleString()}
                                </p>
                              </div>

                              <span
                                className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${priorityClass(
                                  announcement.priority
                                )}`}
                              >
                                {
                                  announcement.priority
                                }
                              </span>
                            </div>

                            <p className="text-gray-700 mt-4 whitespace-pre-wrap">
                              {
                                announcement.message
                              }
                            </p>
                          </article>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                {(
                  currentRole === 'admin' ||
                  currentRole === 'manager'
                ) && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setShowShiftForm(
                          !showShiftForm
                        )
                      }
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer"
                    >
                      {showShiftForm
                        ? 'Cancel'
                        : '+ Create Shift'}
                    </button>
                  </div>
                )}

                {showShiftForm &&
                  (
                    currentRole === 'admin' ||
                    currentRole === 'manager'
                  ) && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-5">
                      Create Employee Shift
                    </h2>

                    <form
                      onSubmit={
                        handleCreateShift
                      }
                      className="grid grid-cols-1 md:grid-cols-2 gap-5"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee
                        </label>

                        <select
                          value={
                            shiftEmployeeId
                          }
                          onChange={(e) =>
                            setShiftEmployeeId(
                              e.target.value
                            )
                          }
                          className={inputClass}
                          required
                        >
                          <option value="">
                            Select employee
                          </option>

                          {employees
                            .filter(
                              (employee) =>
                                employee.status
                                  .toLowerCase() ===
                                'active'
                            )
                            .map(
                              (employee) => (
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
                          Date
                        </label>

                        <input
                          type="date"
                          value={shiftDate}
                          onChange={(e) =>
                            setShiftDate(
                              e.target.value
                            )
                          }
                          className={inputClass}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={shiftStartHour}
                            onChange={(e) =>
                              setShiftStartHour(e.target.value)
                            }
                            className={inputClass}
                            required
                          >
                            {Array.from({ length: 12 }, (_, index) => {
                              const hour = String(index + 1).padStart(2, '0');
                              return (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              );
                            })}
                          </select>

                          <select
                            value={shiftStartMinute}
                            onChange={(e) =>
                              setShiftStartMinute(e.target.value)
                            }
                            className={inputClass}
                            required
                          >
                            {Array.from({ length: 60 }, (_, index) => {
                              const minute = String(index).padStart(2, '0');
                              return (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              );
                            })}
                          </select>

                          <select
                            value={shiftStartPeriod}
                            onChange={(e) =>
                              setShiftStartPeriod(e.target.value as 'AM' | 'PM')
                            }
                            className={inputClass}
                            required
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>

                        <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                          <p className="text-xs text-gray-500">
                            Selected start time
                          </p>
                          <p className="text-sm font-semibold text-blue-700">
                            {shiftStartHour}:{shiftStartMinute} {shiftStartPeriod}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={shiftEndHour}
                            onChange={(e) =>
                              setShiftEndHour(e.target.value)
                            }
                            className={inputClass}
                            required
                          >
                            {Array.from({ length: 12 }, (_, index) => {
                              const hour = String(index + 1).padStart(2, '0');
                              return (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              );
                            })}
                          </select>

                          <select
                            value={shiftEndMinute}
                            onChange={(e) =>
                              setShiftEndMinute(e.target.value)
                            }
                            className={inputClass}
                            required
                          >
                            {Array.from({ length: 60 }, (_, index) => {
                              const minute = String(index).padStart(2, '0');
                              return (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              );
                            })}
                          </select>

                          <select
                            value={shiftEndPeriod}
                            onChange={(e) =>
                              setShiftEndPeriod(e.target.value as 'AM' | 'PM')
                            }
                            className={inputClass}
                            required
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>

                        <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                          <p className="text-xs text-gray-500">
                            Selected end time
                          </p>
                          <p className="text-sm font-semibold text-green-700">
                            {shiftEndHour}:{shiftEndMinute} {shiftEndPeriod}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Location
                        </label>

                        <input
                          type="text"
                          value={shiftLocation}
                          onChange={(e) =>
                            setShiftLocation(
                              e.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="e.g. Main Store"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>

                        <input
                          type="text"
                          value={shiftNotes}
                          onChange={(e) =>
                            setShiftNotes(
                              e.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="Optional notes"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                                Shift Duration
                              </p>
                              <p className="text-lg font-bold text-indigo-900 mt-1">
                                {shiftStartHour}:{shiftStartMinute} {shiftStartPeriod}
                                {' - '}
                                {shiftEndHour}:{shiftEndMinute} {shiftEndPeriod}
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-xs text-indigo-600">
                                Total time
                              </p>
                              <p className="text-xl font-bold text-indigo-900">
                                {currentShiftDuration}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          {saving
                            ? 'Creating...'
                            : 'Create Shift'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                      Employee Schedule
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Upcoming scheduled shifts
                    </p>
                  </div>

                  {shifts.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="text-5xl mb-4">
                        🗓️
                      </div>
                      <p className="text-gray-600">
                        No shifts scheduled yet.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                              Employee
                            </th>
                            <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                              Date
                            </th>
                            <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                              Time
                            </th>
                            <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                              Location
                            </th>
                            <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {shifts.map(
                            (shift) => (
                              <tr
                                key={
                                  shift.id
                                }
                                className="hover:bg-gray-50"
                              >
                                <td className="px-5 py-4 font-semibold text-gray-800">
                                  {employeeName(
                                    shift.employee_id
                                  )}
                                </td>

                                <td className="px-5 py-4 text-sm text-gray-600">
                                  {new Date(
                                    `${shift.shift_date}T00:00:00`
                                  ).toLocaleDateString()}
                                </td>

                                <td className="px-5 py-4 text-sm text-gray-600">
                                  <div className="font-semibold text-gray-800">
                                    {format12Hour(
                                      shift.start_time
                                    )}{' '}
                                    -{' '}
                                    {format12Hour(
                                      shift.end_time
                                    )}
                                  </div>

                                  <div className="text-xs text-indigo-600 font-medium mt-1">
                                    Duration:{' '}
                                    {formatDuration(
                                      Number(shift.start_time.slice(0, 2)) * 60 +
                                        Number(shift.start_time.slice(3, 5)),
                                      Number(shift.end_time.slice(0, 2)) * 60 +
                                        Number(shift.end_time.slice(3, 5))
                                    )}
                                  </div>
                                </td>

                                <td className="px-5 py-4 text-sm text-gray-600">
                                  {shift.location ||
                                    '—'}
                                </td>

                                <td className="px-5 py-4">
                                  {(
                                    currentRole === 'admin' ||
                                    currentRole === 'manager'
                                  ) ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteShift(
                                          shift
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-semibold disabled:opacity-50 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">
                                      Admin/Manager only
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
