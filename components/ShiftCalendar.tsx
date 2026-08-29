'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Shift {
  id: number;
  employee_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  status: string;
}

type CalendarMode = 'month' | 'week';

export default function ShiftCalendar({
  onBack,
  userRole,
  userEmail,
}: {
  onBack: () => void;
  userRole: string;
  userEmail: string;
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [currentDate, setCurrentDate] =
    useState(() => new Date());

  const [calendarMode, setCalendarMode] =
    useState<CalendarMode>('month');

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [selectedShift, setSelectedShift] =
    useState<Shift | null>(null);

  const normalizedRole =
    userRole.trim().toLowerCase();

  const isEmployee =
    normalizedRole === 'employee';

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        employeesResult,
        shiftsResult,
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

      const loadedEmployees =
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
              employee.status || 'Active',
          })
        );

      const loadedShifts =
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
        );

      setEmployees(loadedEmployees);
      setShifts(loadedShifts);
    } catch (err) {
      console.error(
        'Shift calendar error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load the shift calendar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (
    employeeId: number
  ) => {
    return (
      employees.find(
        (employee) =>
          employee.id === employeeId
      )?.name || 'Unknown Employee'
    );
  };

  const format12Hour = (
    time: string
  ) => {
    const [hourPart, minutePart] =
      time.split(':');

    const hour =
      Number(hourPart) || 0;

    const period =
      hour >= 12 ? 'PM' : 'AM';

    const displayHour =
      hour % 12 || 12;

    return `${String(displayHour).padStart(
      2,
      '0'
    )}:${minutePart || '00'} ${period}`;
  };

  const minutesFromDatabaseTime = (
    time: string
  ) => {
    const [hours, minutes] =
      time.split(':').map(Number);

    return (
      (hours || 0) * 60 +
      (minutes || 0)
    );
  };

  const formatDuration = (
    startTime: string,
    endTime: string
  ) => {
    let difference =
      minutesFromDatabaseTime(
        endTime
      ) -
      minutesFromDatabaseTime(
        startTime
      );

    if (difference < 0) {
      difference += 24 * 60;
    }

    const hours =
      Math.floor(difference / 60);
    const minutes =
      difference % 60;

    if (minutes === 0) {
      return `${hours} ${
        hours === 1
          ? 'hour'
          : 'hours'
      }`;
    }

    if (hours === 0) {
      return `${minutes} ${
        minutes === 1
          ? 'minute'
          : 'minutes'
      }`;
    }

    return `${hours}h ${String(
      minutes
    ).padStart(2, '0')}m`;
  };

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const parseDateKey = (
    dateKey: string
  ) => {
    const [year, month, day] =
      dateKey.split('-').map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  };

  const employeeMatchesCurrentUser = (
    employeeId: number
  ) => {
    const employee =
      employees.find(
        (item) =>
          item.id === employeeId
      );

    if (!employee) {
      return false;
    }

    return (
      employee.email
        .trim()
        .toLowerCase() ===
      userEmail.trim().toLowerCase()
    );
  };

  const visibleShifts = useMemo(() => {
    if (!isEmployee) {
      return shifts;
    }

    return shifts.filter((shift) =>
      employeeMatchesCurrentUser(
        shift.employee_id
      )
    );
  }, [
    shifts,
    employees,
    isEmployee,
    userEmail,
  ]);

  const shiftsByDate = useMemo(() => {
    const grouped: Record<
      string,
      Shift[]
    > = {};

    visibleShifts.forEach((shift) => {
      if (!grouped[shift.shift_date]) {
        grouped[shift.shift_date] = [];
      }

      grouped[shift.shift_date].push(
        shift
      );
    });

    return grouped;
  }, [visibleShifts]);

  const monthStart = useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      ),
    [currentDate]
  );

  const monthEnd = useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ),
    [currentDate]
  );

  const calendarStart = useMemo(() => {
    const date = new Date(monthStart);
    const day = date.getDay();

    date.setDate(
      date.getDate() - day
    );

    return date;
  }, [monthStart]);

  const monthCalendarDays = useMemo(() => {
    return Array.from(
      { length: 42 },
      (_, index) => {
        const date =
          new Date(calendarStart);

        date.setDate(
          calendarStart.getDate() +
            index
        );

        return date;
      }
    );
  }, [calendarStart]);

  const weekStart = useMemo(() => {
    const date =
      new Date(currentDate);
    const day = date.getDay();

    date.setDate(
      date.getDate() - day
    );

    return date;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) => {
        const date =
          new Date(weekStart);

        date.setDate(
          weekStart.getDate() +
            index
        );

        return date;
      }
    );
  }, [weekStart]);

  const changePeriod = (
    direction: number
  ) => {
    setCurrentDate(
      (previous) => {
        const next =
          new Date(previous);

        if (
          calendarMode === 'month'
        ) {
          next.setMonth(
            next.getMonth() +
              direction
          );
        } else {
          next.setDate(
            next.getDate() +
              direction * 7
          );
        }

        return next;
      }
    );

    setSelectedDate(null);
    setSelectedShift(null);
  };

  const goToToday = () => {
    const today = new Date();

    setCurrentDate(today);
    setSelectedDate(
      toDateKey(today)
    );
    setSelectedShift(null);
  };

  const monthTitle =
    monthStart.toLocaleDateString(
      undefined,
      {
        month: 'long',
        year: 'numeric',
      }
    );

  const weekTitle = `${weekStart.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  )} - ${weekDays[6].toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )}`;

  const selectedDateShifts =
    selectedDate
      ? shiftsByDate[
          selectedDate
        ] || []
      : [];

  const formatSelectedDate = () => {
    if (!selectedDate) {
      return 'Select a date';
    }

    return parseDateKey(
      selectedDate
    ).toLocaleDateString(
      undefined,
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Shift Calendar
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEmployee
                ? 'View your assigned shifts'
                : 'View the team schedule'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadCalendarData}
              disabled={loading}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 cursor-pointer"
            >
              🔄 Refresh
            </button>

            <button
              type="button"
              onClick={onBack}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            <p className="font-semibold">
              Calendar Error
            </p>
            <p className="text-sm mt-1">
              {error}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  changePeriod(-1)
                }
                className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold cursor-pointer"
                aria-label="Previous period"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold text-gray-700 cursor-pointer"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  changePeriod(1)
                }
                className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold cursor-pointer"
                aria-label="Next period"
              >
                ›
              </button>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 ml-1">
                {calendarMode === 'month'
                  ? monthTitle
                  : weekTitle}
              </h2>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setCalendarMode('month')
                }
                className={`px-4 py-2 rounded-md text-sm font-semibold cursor-pointer ${
                  calendarMode === 'month'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-600'
                }`}
              >
                Month
              </button>

              <button
                type="button"
                onClick={() =>
                  setCalendarMode('week')
                }
                className={`px-4 py-2 rounded-md text-sm font-semibold cursor-pointer ${
                  calendarMode === 'week'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-600'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-gray-600">
              Loading shift calendar...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

            {/* CALENDAR */}

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {calendarMode === 'month' ? (
                <>
                  <div className="grid grid-cols-7 border-b bg-gray-50">
                    {[
                      'Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat',
                    ].map((day) => (
                      <div
                        key={day}
                        className="px-2 py-3 text-center text-xs sm:text-sm font-semibold text-gray-600"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {monthCalendarDays.map(
                      (date) => {
                        const dateKey =
                          toDateKey(date);

                        const dayShifts =
                          shiftsByDate[
                            dateKey
                          ] || [];

                        const isCurrentMonth =
                          date.getMonth() ===
                          monthStart.getMonth();

                        const isToday =
                          dateKey ===
                          toDateKey(
                            new Date()
                          );

                        const isSelected =
                          dateKey ===
                          selectedDate;

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => {
                              setSelectedDate(
                                dateKey
                              );
                              setSelectedShift(
                                null
                              );
                            }}
                            className={`min-h-[125px] sm:min-h-[150px] border-b border-r border-gray-100 p-2 text-left hover:bg-blue-50/50 transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50'
                                : ''
                            } ${
                              !isCurrentMonth
                                ? 'bg-gray-50/60'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                                  isToday
                                    ? 'bg-blue-600 text-white'
                                    : isCurrentMonth
                                      ? 'text-gray-700'
                                      : 'text-gray-400'
                                }`}
                              >
                                {date.getDate()}
                              </span>

                              {dayShifts.length >
                                0 && (
                                <span className="text-xs font-semibold text-blue-600">
                                  {dayShifts.length}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              {dayShifts
                                .slice(0, 3)
                                .map(
                                  (
                                    shift
                                  ) => (
                                    <div
                                      key={
                                        shift.id
                                      }
                                      className="rounded-md bg-blue-50 border border-blue-100 px-2 py-1"
                                    >
                                      <p className="text-[11px] font-semibold text-blue-800 truncate">
                                        {getEmployeeName(
                                          shift.employee_id
                                        )}
                                      </p>

                                      <p className="text-[10px] text-blue-600 truncate">
                                        {format12Hour(
                                          shift.start_time
                                        )}
                                      </p>
                                    </div>
                                  )
                                )}

                              {dayShifts.length >
                                3 && (
                                <p className="text-[10px] text-gray-500 px-1">
                                  +{' '}
                                  {dayShifts.length -
                                    3}{' '}
                                  more
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-7 border-b bg-gray-50">
                    {weekDays.map(
                      (date) => (
                        <div
                          key={toDateKey(
                            date
                          )}
                          className="px-2 py-3 text-center"
                        >
                          <p className="text-xs font-semibold text-gray-500">
                            {date.toLocaleDateString(
                              undefined,
                              {
                                weekday:
                                  'short',
                              }
                            )}
                          </p>

                          <p
                            className={`text-lg font-bold mt-1 ${
                              toDateKey(
                                date
                              ) ===
                              toDateKey(
                                new Date()
                              )
                                ? 'text-blue-600'
                                : 'text-gray-800'
                            }`}
                          >
                            {date.getDate()}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-7 min-h-[500px]">
                    {weekDays.map(
                      (date) => {
                        const dateKey =
                          toDateKey(date);

                        const dayShifts =
                          shiftsByDate[
                            dateKey
                          ] || [];

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => {
                              setSelectedDate(
                                dateKey
                              );
                              setSelectedShift(
                                null
                              );
                            }}
                            className={`border-r border-gray-100 p-2 text-left hover:bg-blue-50/50 transition cursor-pointer ${
                              selectedDate ===
                              dateKey
                                ? 'bg-blue-50'
                                : 'bg-white'
                            }`}
                          >
                            <div className="space-y-2">
                              {dayShifts.map(
                                (
                                  shift
                                ) => (
                                  <div
                                    key={
                                      shift.id
                                    }
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();
                                      setSelectedDate(
                                        dateKey
                                      );
                                      setSelectedShift(
                                        shift
                                      );
                                    }}
                                    className="rounded-lg bg-blue-50 border border-blue-100 p-2 hover:bg-blue-100 cursor-pointer"
                                  >
                                    <p className="text-xs font-bold text-blue-800">
                                      {
                                        format12Hour(
                                          shift.start_time
                                        )
                                      }
                                    </p>

                                    <p className="text-xs text-blue-700 mt-1 truncate">
                                      {getEmployeeName(
                                        shift.employee_id
                                      )}
                                    </p>
                                  </div>
                                )
                              )}

                              {dayShifts.length ===
                                0 && (
                                <p className="text-xs text-gray-400 text-center mt-20">
                                  No shifts
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </section>

            {/* SIDE DETAILS */}

            <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
              <div className="mb-5">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Selected Date
                </p>

                <h2 className="text-xl font-bold text-gray-800 mt-1">
                  {formatSelectedDate()}
                </h2>
              </div>

              {!selectedDate ? (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">
                    🗓️
                  </div>
                  <p className="text-gray-500 text-sm">
                    Click a date on the calendar to view its shifts.
                  </p>
                </div>
              ) : selectedDateShifts.length ===
                0 ? (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">
                    💤
                  </div>
                  <p className="font-semibold text-gray-700">
                    No shifts
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    There are no visible shifts on this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateShifts.map(
                    (shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() =>
                          setSelectedShift(
                            shift
                          )
                        }
                        className={`w-full text-left border rounded-xl p-4 transition cursor-pointer ${
                          selectedShift?.id ===
                          shift.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-bold text-gray-800">
                          {getEmployeeName(
                            shift.employee_id
                          )}
                        </p>

                        <p className="text-sm text-blue-700 font-semibold mt-2">
                          {format12Hour(
                            shift.start_time
                          )}{' '}
                          -{' '}
                          {format12Hour(
                            shift.end_time
                          )}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          Duration:{' '}
                          {formatDuration(
                            shift.start_time,
                            shift.end_time
                          )}
                        </p>
                      </button>
                    )
                  )}

                  {selectedShift && (
                    <div className="mt-5 border-t pt-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Shift Details
                      </p>

                      <div className="space-y-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Employee
                          </p>
                          <p className="font-semibold text-gray-800 mt-1">
                            {getEmployeeName(
                              selectedShift.employee_id
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Time
                          </p>
                          <p className="font-semibold text-gray-800 mt-1">
                            {format12Hour(
                              selectedShift.start_time
                            )}{' '}
                            -{' '}
                            {format12Hour(
                              selectedShift.end_time
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Duration
                          </p>
                          <p className="font-semibold text-gray-800 mt-1">
                            {formatDuration(
                              selectedShift.start_time,
                              selectedShift.end_time
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Location
                          </p>
                          <p className="font-semibold text-gray-800 mt-1">
                            {selectedShift.location ||
                              'Not specified'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Notes
                          </p>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            {selectedShift.notes ||
                              'No notes'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
