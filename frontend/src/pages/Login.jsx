import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // 👈 Import Link

const Login = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg">
            <span className="text-3xl">🏥</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-indigo-200 mt-2">Sign in to Federated Learning</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-100 text-sm flex items-center gap-2 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Email Address</label>
            <input
              type="text" // changed from email to text to allow 'admin' username if needed, but email is preferred
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="admin@fedapp.me"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] ${
              loading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        {/* 🚀 TOGGLE LINK */}
        <div className="mt-6 text-center">
          <p className="text-sm text-indigo-200">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-white hover:text-indigo-100 underline decoration-indigo-400">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;