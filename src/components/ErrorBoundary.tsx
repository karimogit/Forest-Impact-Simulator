"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/primitives';
import { AlertIcon } from './ui/Icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display fallback UI
 * Prevents entire app from crashing on component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6" role="alert">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
              <AlertIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg text-red-900">Something went wrong</h3>
              <p className="mt-1 text-sm leading-relaxed text-red-800">
                An unexpected error occurred. Refresh the page or try again. If the problem persists, contact support.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-red-900">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-red-100 p-3 text-xs text-red-700">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={this.handleReset}
                className="mt-4"
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
