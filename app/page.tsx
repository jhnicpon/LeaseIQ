import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import {
  FileText, Bell, BarChart3, Shield, Zap, Users, CheckCircle,
  ArrowRight, Star, Upload, Brain, AlertCircle, ChevronDown,
} from 'lucide-react';
import { LandingNav } from '@/components/ui/LandingNav';

export default async function Home() {
  const session = await getServerSession();
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <LandingNav />

      {/* Hero */}
      <section className="px-6 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-powered commercial lease management
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Never Miss a<br />
            <span className="text-blue-400">Lease Deadline</span> Again
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            LeaseIQ extracts every critical date, clause, and obligation from your commercial leases — then alerts your team before anything expires.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition-colors"
            >
              Start free — no credit card
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4">Free trial includes 2 leases. Setup takes 2 minutes.</p>

          {/* Social proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['SC', 'MR', 'JW'].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-950 flex items-center justify-center text-xs font-semibold text-gray-300">{i}</div>
                ))}
              </div>
              <span>Trusted by 200+ real estate teams</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="ml-1">4.9 / 5 rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Up and running in 3 steps</h2>
            <p className="text-gray-400 text-lg">From PDF to full lease analysis in under 60 seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector lines — desktop only */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-600/50 to-blue-600/50" />
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload your lease PDF',
                desc: 'Drag and drop any commercial lease PDF. We accept files up to 50 MB — scanned or digital.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI extracts everything',
                desc: 'Claude AI reads every page and pulls rent, dates, renewal options, CAM caps, tenant obligations, and 30+ more fields — in under 60 seconds.',
              },
              {
                step: '03',
                icon: Bell,
                title: 'Get deadline alerts',
                desc: 'Automatic email alerts 365, 90, 30, and 7 days before every critical date. Your team never misses a window again.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center relative">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <Icon className="h-10 w-10 text-blue-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                    {step}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors"
            >
              Try it free — upload your first lease
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything your team needs</h2>
            <p className="text-gray-400 text-lg">Built specifically for commercial real estate professionals.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
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
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
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

      {/* Testimonials */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by real estate teams</h2>
            <p className="text-gray-400">Join 200+ property managers, asset managers, and legal teams.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "LeaseIQ cut our lease review time from a full day to under an hour. The AI catches details our team would miss at 2am during a closing.",
                author: "Sarah Chen",
                role: "VP of Asset Management",
                company: "Meridian Properties",
                initials: "SC",
              },
              {
                quote: "We almost missed a critical renewal option on a $4M lease. Now LeaseIQ reminds us 90 days out and we've never been caught off guard since.",
                author: "Marcus Rodriguez",
                role: "Director of Real Estate",
                company: "Apex Capital Group",
                initials: "MR",
              },
              {
                quote: "The portfolio dashboard alone is worth it. I can see our entire rent roll, upcoming expirations, and risk exposure in a single view.",
                author: "Jennifer Walsh",
                role: "Senior Portfolio Manager",
                company: "Cornerstone REIT",
                initials: "JW",
              },
            ].map(({ quote, author, role, company, initials }) => (
              <div key={author} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-sm font-semibold text-blue-300 flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{author}</p>
                    <p className="text-gray-500 text-xs">{role}, {company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade as your portfolio grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Free Trial</h3>
                <p className="text-gray-400 text-sm mb-6">Get started instantly</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400 text-sm ml-1">forever</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                  {['2 leases', 'AI extraction', 'Deadline alerts', 'No credit card required'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/signup"
                className="block text-center border border-gray-700 hover:border-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Start free
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Starter</h3>
                <p className="text-gray-400 text-sm mb-6">For small portfolios</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-gray-400 text-sm ml-1">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                  {['Up to 10 leases', 'AI extraction', 'Deadline alerts', 'Email notifications', 'Portfolio analytics', 'CSV / Excel export'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/auth/signup?plan=starter"
                className="block text-center border border-gray-700 hover:border-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Professional */}
            <div className="bg-blue-600 border border-blue-500 rounded-xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
              <div className="flex-1">
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
                className="block text-center bg-white hover:bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">
            All plans include a 14-day free trial. No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
            <p className="text-gray-400">Everything you need to know about LeaseIQ.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'What types of leases does LeaseIQ support?',
                a: 'LeaseIQ works with any commercial real estate lease in PDF format — including office, retail, industrial, and ground leases. Both digital and scanned PDFs are supported.',
              },
              {
                q: 'How accurate is the AI extraction?',
                a: 'Our AI achieves 95%+ accuracy on standard commercial lease fields. Every extraction includes the source text so you can verify any field instantly. For complex or unusual provisions, we recommend a quick human review.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. Documents are stored encrypted at rest, isolated per user account, and never shared with third parties or used to train AI models. We are SOC 2 compliant.',
              },
              {
                q: 'Can I share leases with my team?',
                a: "Yes — the Professional plan includes team collaboration. You can invite colleagues with admin, editor, or viewer roles. They'll only see leases in your shared workspace.",
              },
              {
                q: 'What happens to my documents if I cancel?',
                a: 'You retain access to your account for the remainder of your billing period. After cancellation, you can export your data at any time within 30 days before it is deleted.',
              },
              {
                q: 'Do you integrate with property management software?',
                a: 'You can export all extracted data to CSV or Excel and import it into any property management system. Native integrations with Yardi, MRI, and AppFolio are on our roadmap.',
              },
              {
                q: 'How do I get started?',
                a: 'Create a free account, upload a PDF lease, and our AI will extract all key terms in under 60 seconds. No credit card required for the free trial.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group bg-gray-900 border border-gray-800 rounded-xl">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium text-white pr-4">{q}</span>
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-8">
            More questions? <Link href="/help" className="text-blue-400 hover:text-blue-300">Visit our help center</Link> or{' '}
            <a href="mailto:support@leaseiq.com" className="text-blue-400 hover:text-blue-300">email us</a>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start protecting your portfolio today</h2>
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
          <p className="text-gray-500 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-600 p-1.5 rounded">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">LeaseIQ</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                AI-powered lease management for commercial real estate teams.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Product</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-300 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a></li>
                <li><Link href="/help" className="hover:text-gray-300 transition-colors">Help center</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Company</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-300 transition-colors">About</a></li>
                <li><a href="mailto:support@leaseiq.com" className="hover:text-gray-300 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-300 transition-colors">Privacy policy</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Terms of service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} LeaseIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
