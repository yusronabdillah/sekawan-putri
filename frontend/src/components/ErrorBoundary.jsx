import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', margin: '24px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b' }}>
          <h2 style={{ marginTop: 0 }}>Terjadi Kesalahan (Crash)</h2>
          <p>Halaman ini gagal dimuat karena ada kesalahan sistem.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', backgroundColor: '#fff', padding: '12px', border: '1px solid #fca5a5' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px' }}
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
