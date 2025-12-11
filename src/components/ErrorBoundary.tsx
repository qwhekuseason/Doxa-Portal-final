import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900">
                    <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
                        <h1 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <p className="text-gray-600 mb-4">
                            The application encountered an error. If you are on iOS, this is likely a date formatting issue or a layout crash.
                        </p>
                        <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono mb-4 text-red-800">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
