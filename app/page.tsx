import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import {
  Building2, FileText, Bell, BarChart3, Shield, Zap, Users, CheckCircle,
  ArrowRight, Star
} from 'lucide-react';

export default async function Home() {
  const session = await getServerSession();
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">LeaseIQ</span>
          </div>
          <div className="flex items-center gap-4">
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
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-powered commercial lease analysis
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Know Every Clause in<br />
            <span className="text-blue-400">Every Lease</span> — In Minutes
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            LeaseIQ extracts critical terms, tracks deadlines, and alerts your team before options expire — so nothing slips through the cracks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition-colors"
            >
              Start free — no credit card required
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">Free trial includes 2 leases. No credit card required.</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything your team needs</h2>
            <p className="text-gray-400 text-lg">From upload to insight in under 60 seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'AI Lease Extraction',
                desc: 'Upload any PDF lease. Our AI instantly pulls rent, dates, renewal options, tenant obligations, and 30+ other critical fields.',
              },
              {
                icon: Bell,
                title: 'Deadline Alerts',
                desc: 'Never miss a renewal window. Get email alerts 365, 90, 30, and 7 days before every critical lease date.',
              },
              {
                icon: BarChart3,
                title: 'Portfolio Analytics',
                desc: 'See total monthly rent, upcoming expirations, and exposure across your entire portfolio in one dashboard.',
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                desc: 'Your documents stay private. Encrypted storage, per-user isolation, and no third-party data sharing.',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                desc: 'Invite colleagues, share lease summaries, and keep your whole team aligned on portfolio obligations.',
              },
              {
                icon: Zap,
                title: 'Instant Search',
                desc: 'Find any clause, tenant, or address instantly with full-text search across your entire lease portfolio.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="bg-blue-600/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade as your portfolio grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold mb-1">Free Trial</h3>
                <p className="text-gray-400 text-sm mb-6">Get started instantly</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400 text-sm ml-1">forever</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                  {['2 leases', 'AI extraction', 'Deadline alerts', 'No credit card'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/signup"
                className="mt-auto block text-center border border-gray-700 hover:border-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Start free
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col">
              <div>
                <h3 className="text-lg font-semibold mb-1">Starter</h3>
                <p className="text-gray-400 text-sm mb-6">For small portfolios</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-gray-400 text-sm ml-1">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                  {['10 leases', 'AI extraction', 'Deadline alerts', 'Email notifications', 'Portfolio analytics', 'CSV / Excel export'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/signup?plan=starter"
                className="mt-auto block text-center border border-gray-700 hover:border-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Professional */}
            <div className="bg-blue-600 border border-blue-500 rounded-xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Professional</h3>
                <p className="text-blue-200 text-sm mb-6">For growing portfolios</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-blue-200 text-sm ml-1">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-blue-50 mb-8">
                  {[
                    'Unlimited leases',
                    'AI extraction',
                    'Deadline alerts',
                    'Email notifications',
                    'Portfolio analytics',
                    'CSV / Excel export',
                    'Team collaboration',
                    'Priority support',
                    'Weekly portfolio digest',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-200 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/signup?plan=professional"
                className="mt-auto block text-center bg-white hover:bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by real estate teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "LeaseIQ cut our lease review time from a full day to under an hour. The AI catches details our team would miss at 2am during a closing.",
                author: "Sarah Chen",
                role: "VP of Asset Management",
                company: "Meridian Properties",
              },
              {
                quote: "We almost missed a critical renewal option on a $4M lease. Now LeaseIQ reminds us 90 days out and we've never been caught off guard since.",
                author: "Marcus Rodriguez",
                role: "Director of Real Estate",
                company: "Apex Capital Group",
              },
              {
                quote: "The portfolio dashboard alone is worth it. I can see our entire rent roll, upcoming expirations, and risk exposure in a single view.",
                author: "Jennifer Walsh",
                role: "Senior Portfolio Manager",
                company: "Cornerstone REIT",
              },
            ].map(({ quote, author, role, company }) => (
              <div key={author} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{author}</p>
                  <p className="text-gray-500 text-xs">{role}, {company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start analyzing leases today</h2>
          <p className="text-gray-400 text-lg mb-8">
            Free trial. No credit card. Up and running in 2 minutes.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-lg text-lg transition-colors"
          >
            Sign up free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">LeaseIQ</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 LeaseIQ. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
