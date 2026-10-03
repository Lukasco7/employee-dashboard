export type AppErrorKind =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'database'
  | 'unknown';

export interface AppErrorInfo {
  kind: AppErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  original: unknown;
  code?: string;
  details?: string;
  hint?: string;
}

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

function asErrorLike(error: unknown): ErrorLike {
  if (
    typeof error === 'object' &&
    error !== null
  ) {
    return error as ErrorLike;
  }

  if (error instanceof Error) {
    return error;
  }

  return {};
}

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

export function getAppError(
  error: unknown
): AppErrorInfo {
  const source = asErrorLike(error);

  const name = lower(source.name);
  const message = lower(source.message);
  const code = text(source.code);
  const details = text(source.details);
  const hint = text(source.hint);

  const combined = [
    name,
    message,
    code.toLowerCase(),
    details.toLowerCase(),
    hint.toLowerCase(),
  ].join(' ');

  // Network / connection errors
  if (
    name.includes(
      'authretryablefetcherror'
    ) ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes(
      'network request failed'
    ) ||
    message.includes('fetch failed') ||
    message.includes('load failed') ||
    message.includes(
      'err_internet_disconnected'
    ) ||
    message.includes(
      'err_network_changed'
    ) ||
    message.includes('timeout')
  ) {
    return {
      kind: 'network',
      title: 'Connection problem',
      message:
        'We could not connect to the service. Please check your internet connection and try again.',
      retryable: true,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Authentication / session errors
  if (
    name.includes('auth') ||
    combined.includes(
      'invalid login credentials'
    ) ||
    (
      combined.includes('session') &&
      combined.includes('expired')
    ) ||
    (
      combined.includes('jwt') &&
      combined.includes('expired')
    ) ||
    combined.includes('refresh token')
  ) {
    return {
      kind: 'authentication',
      title: 'Authentication problem',
      message:
        'We could not verify your session. Please sign in again.',
      retryable: false,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Permission / RLS errors
  if (
    code === '42501' ||
    combined.includes(
      'row-level security'
    ) ||
    combined.includes(
      'permission denied'
    ) ||
    combined.includes(
      'not authorized'
    ) ||
    combined.includes(
      'unauthorized'
    ) ||
    combined.includes('forbidden')
  ) {
    return {
      kind: 'authorization',
      title: 'Permission denied',
      message:
        'You do not have permission to perform this action.',
      retryable: false,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Validation errors
  if (
    combined.includes('validation') ||
    combined.includes(
      'invalid input'
    ) ||
    combined.includes(
      'required field'
    ) ||
    combined.includes(
      'invalid value'
    ) ||
    code === '22P02' ||
    code === '23514'
  ) {
    return {
      kind: 'validation',
      title: 'Check your information',
      message:
        'Please check the information you entered and try again.',
      retryable: false,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Duplicate/conflict errors
  if (
    code === '23505' ||
    combined.includes(
      'duplicate key'
    ) ||
    combined.includes(
      'already exists'
    ) ||
    combined.includes('conflict')
  ) {
    return {
      kind: 'conflict',
      title: 'Already exists',
      message:
        'This record already exists. Please use different information.',
      retryable: false,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Not found
  if (
    code === 'PGRST116' ||
    combined.includes('not found') ||
    combined.includes(
      'does not exist'
    )
  ) {
    return {
      kind: 'not_found',
      title: 'Not found',
      message:
        'The requested information could not be found.',
      retryable: false,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Database errors
  if (
    code.startsWith('23') ||
    code.startsWith('42') ||
    code.startsWith('PGRST') ||
    combined.includes('postgres') ||
    combined.includes('database') ||
    combined.includes('query')
  ) {
    return {
      kind: 'database',
      title: 'Database problem',
      message:
        'We could not complete that operation. Please try again.',
      retryable: true,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Server errors
  const status = Number(
    source.status ??
      source.statusCode
  );

  if (
    (
      Number.isFinite(status) &&
      status >= 500
    ) ||
    combined.includes(
      'internal server error'
    ) ||
    combined.includes(
      'service unavailable'
    )
  ) {
    return {
      kind: 'server',
      title:
        'Service temporarily unavailable',
      message:
        'The service is temporarily unavailable. Please try again shortly.',
      retryable: true,
      original: error,
      code: code || undefined,
      details: details || undefined,
      hint: hint || undefined,
    };
  }

  // Safe fallback
  return {
    kind: 'unknown',
    title: 'Something went wrong',
    message:
      'We could not complete that action. Please try again.',
    retryable: true,
    original: error,
    code: code || undefined,
    details: details || undefined,
    hint: hint || undefined,
  };
}

export function logAppError(
  context: string,
  error: unknown
): void {
  const info = getAppError(error);

  const original =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

  const diagnostic = {
    kind: info.kind,
    message: info.message,
    code: info.code,
    details: info.details,
    hint: info.hint,
    original,
  };

  if (info.kind === 'network') {
    console.warn(
      `[${context}]`,
      diagnostic
    );
    return;
  }

  console.error(
    `[${context}]`,
    diagnostic
  );
}