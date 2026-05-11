import React, { useState } from 'react';
import { ArrowRight, Users, Calculator, Wallet, Shield, TrendingUp, Star, Check, Plus } from 'lucide-react';
import { NewLogo } from './NewLogo';

interface LandingPageProps {
  onNavigate?: (page: 'login' | 'register' | 'demo' | 'features') => void;
}

export function LandingPage({ onNavigate = () => {} }: LandingPageProps) {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <NewLogo size="md" />
          <span className="text-xl font-bold text-gray-900">SplitWise</span>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => onNavigate('features')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Features
          </button>
          <button 
            onClick={() => onNavigate('demo')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            How it works
          </button>
          <button 
            onClick={() => onNavigate('features')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Pricing
          </button>
          <button 
            onClick={() => onNavigate('login')}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => onNavigate('register')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Split expenses
                <span className="text-blue-600"> effortlessly</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                The simplest way to split bills with friends, roommates, and family. 
                Track expenses, calculate fair splits, and settle up easily.
              </p>
            </div>

            {/* Email Signup */}
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onNavigate('register');
                  }
                }}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="email"
              />
              <button 
                onClick={() => onNavigate('register')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>4.8/5 Rating</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span>1M+ Users</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image/Illustration */}
          <div className="relative">
            <div className="relative z-10">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                {/* Mock App Interface */}
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Weekend Trip</p>
                        <p className="text-sm text-gray-500">4 members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-bold text-lg text-gray-900">₹486.50</p>
                    </div>
                  </div>

                  {/* Expense Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">P</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Pizza Dinner</p>
                          <p className="text-sm text-gray-500">Paid by John</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">₹85.00</p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-violet-600">H</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Hotel Booking</p>
                          <p className="text-sm text-gray-500">Paid by Sarah</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">₹240.00</p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-600">G</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Gas</p>
                          <p className="text-sm text-gray-500">Paid by Mike</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">₹45.50</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => onNavigate('demo')}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to split expenses
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make expense splitting simple and fair for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div 
              onClick={() => onNavigate('demo')}
              className="text-center space-y-4 cursor-pointer group hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-blue-200 transition-colors duration-300">
                <Calculator className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Smart Calculations</h3>
              <p className="text-gray-600">
                Automatically calculate who owes what with our fair split algorithms. 
                Handle complex splits with ease.
              </p>
              <div className="text-blue-600 font-medium text-sm flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Try Calculator</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Expense Tracking</h3>
              <p className="text-gray-600">
                Keep track of all expenses in one place. Add receipts, categorize costs, 
                and see spending patterns.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Settlement Made Easy</h3>
              <p className="text-gray-600">
                Get clear settlement recommendations and track who has paid. 
                Never argue about money again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to split expenses the smart way?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join millions of users who trust SplitWise for fair and transparent expense sharing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onNavigate('demo')}
              className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold"
            >
              View Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
