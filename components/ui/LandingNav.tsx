'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Building2, Menu, X } from 'lucide-react';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-gray-800 px-6 py-4 sticky top-0 z-50 bg-gray-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">LeaseIQ</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Features</a>
          <a href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">How it works</a>
          <a href="#pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</a>
          <a href="#faq" className="text-gray-400 hover:text-white text-sm transition-colors">FAQ</a>
          <Link href="/help" className="text-gray-400 hover:text-white text-sm transition-colors">Help</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/auth/signin" className="text-gray-400 hover:text-white text-sm transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Start free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 text-gray-400 hover:text-white"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4 flex flex-col gap-4">
          <a href="#features" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white text-sm px-2">Features</a>
          <a href="#how-it-works" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white text-sm px-2">How it works</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white text-sm px-2">Pricing</a>
          <a href="#faq" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white text-sm px-2">FAQ</a>
          <Link href="/help" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white text-sm px-2">Help</Link>
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-800">
            <Link href="/auth/signin" className="text-center border border-gray-700 text-gray-300 hover:text-white py-2 rounded-lg text-sm font-medium transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
              Start free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
