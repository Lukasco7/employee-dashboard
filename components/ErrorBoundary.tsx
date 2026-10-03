'use client';

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import {
  getAppError,
  logAppError,
} from '@/lib/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  title: string;
  message: string;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    title: 'Something went wrong',
    message:
      'We could not display this part of the application. Please try again.',
  };

  static getDerivedStateFromError(
    error: unknown
  ): ErrorBoundaryState {
    const appError =
      getAppError(error);

    return {
      hasError: true,
      title: appError.title,
      message:
        'We could not display this part of the application. Please try again.',
    };
  }

  componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo
  ) {
    logAppError(
      'Application Error Boundary',
      {
        error,
        componentStack:
          errorInfo.componentStack,
      }
    );
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      title: 'Something went wrong',
      message:
        'We could not display this part of the application. Please try again.',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <section
          className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm text-center"
          role="alert"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl font-bold">
            !
          </div>

          <h1 className="text-2xl font-bold text-gray-800">
            {this.state.title}
          </h1>

          <p className="mt-3 text-gray-600 leading-6">
            {this.state.message}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Reload Application
            </button>
          </div>
        </section>
      </main>
    );
  }
}