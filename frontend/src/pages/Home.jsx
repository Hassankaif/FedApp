import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 2. Top Right Navigation Buttons */}
      <nav className="absolute top-0 right-0 p-6 z-10 flex gap-4">
        <Link 
          to="/login" 
          className="px-6 py-2 bg-white border border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
        >
          Login
        </Link>
        <Link 
          to="/signup" 
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          Sign Up
        </Link>
      </nav>

      {/* 1. Hero Section: Image/GIF Placeholder (Top Half) */}
      <div className="w-full h-[50vh] bg-slate-200 flex items-center justify-center overflow-hidden border-b border-slate-300">
        <div className="text-slate-400 flex flex-col items-center">
          <span className="text-6xl mb-2">🌐</span>
          <p className="font-medium text-lg">Federated Learning Animation / Hero Image</p>
          {/* Replace with <img src="your-gif-url.gif" className="w-full h-full object-cover" /> */}
        </div>
      </div>

      {/* 3. Instruction Section */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-indigo-950 mb-4">Getting Started</h1>
          <p className="text-slate-600 text-lg">Follow these steps to contribute your data to the network.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mb-4">1</div>
            <h3 className="font-bold mb-2">Download Client</h3>
            <p className="text-sm text-slate-500">Get the Electron desktop application using the button below.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mb-4">2</div>
            <h3 className="font-bold mb-2">Create Account</h3>
            <p className="text-sm text-slate-500">Sign up on this portal to receive your researcher or hospital credentials.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mb-4">3</div>
            <h3 className="font-bold mb-2">Connect & Train</h3>
            <p className="text-sm text-slate-500">Launch the app, log in, and begin the federated training process.</p>
          </div>
        </div>

        {/* 4. Bottom Center Download Button */}
        <div className="mt-16 text-center">
          <a 
            href="https://your-website.com/downloads/electronapp.exe" 
            className="inline-flex items-center gap-2 px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all transform hover:scale-105 shadow-xl"
          >
            <span>📥</span> Download Electron Client (.exe)
          </a>
          <p className="mt-4 text-xs text-slate-400">Compatible with Windows 10/11</p>
        </div>
      </main>
    </div>
  );
};

export default Home;