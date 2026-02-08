import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../api/apiService';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client' // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // Register the user
      await apiService.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role
      });

      // Redirect to login on success
      alert("Registration Successful! Please login.");
      navigate('/login');
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-indigo-200 mt-2">Join the Federated Learning Network</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-100 text-sm flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Full Name</label>
            <input
              name="full_name"
              type="text"
              required
              className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Email Address</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Confirm</label>
              <input
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1 ml-1">Role</label>
            <select
              name="role"
              className="w-full px-4 py-3 bg-black/20 border border-indigo-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all [&>option]:bg-indigo-900"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="client">Client (Standard User)</option>
              <option value="researcher">Researcher</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] ${
              loading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-indigo-200">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-white hover:text-indigo-100 underline decoration-indigo-400">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;