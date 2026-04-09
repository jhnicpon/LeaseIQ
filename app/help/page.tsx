import Link from 'next/link';
import {
  Upload, Brain, Bell, Search, Users, CreditCard,
  FileText, AlertCircle, CheckCircle, ArrowRight,
  Building2, ChevronRight,
} from 'lucide-react';
import { LandingNav } from '@/components/ui/LandingNav';

export const metadata = {
  title: 'Help Center — LeaseIQ',
  description: 'Learn how to use LeaseIQ to manage your commercial lease portfolio.',
};

const guides = [
  {
    icon: Upload,
    title: 'Uploading your first lease',
    id: 'upload',
    steps: [
      'Sign in to LeaseIQ and click "Upload Lease" in the sidebar or on the dashboard.',
      'Drag and drop your PDF lease file, or click to browse. Files up to 50 MB are supported.',
      'Click "Extract Lease Terms". Our AI will begin analyzing the document — this takes 30–60 seconds.',
      'Once complete, you will be redirected to the lease detail page showing all extracted fields.',
      'Review the extracted data. If anything looks incorrect, use the Edit button to fix it manually.',
    ],
    tips: [
      'Use digital (text-based) PDFs when possible — scanned PDFs take slightly longer.',
      'If a lease is very long (200+ pages), only the first 100,000 characters are processed. Split large documents if needed.',
      'You can upload amendments separately using the "Upload Amendment" button on the lease detail page.',
    ],
  },
  {
    icon: Brain,
    title: 'What happens during AI processing',
    id: 'processing',
    steps: [
      'Your PDF is uploaded securely to Vercel Blob Storage — it never touches our servers directly.',
      'The text is extracted from the PDF and sent to Claude AI (Anthropic) for analysis.',
      'Claude reads the full lease and identifies 30+ critical fields including rent, dates, options, and obligations.',
      'Extracted data is saved to your account database and alert dates are automatically generated.',
      'The lease status changes from "Processing" to "Completed" — you will see it update in real time.',
    ],
    tips: [
      'If processing fails, click "Reprocess" on the lease detail page to try again.',
      'AI accuracy is highest on standard commercial leases. Unusual clause structures may require manual review.',
      'The full original text is stored so you can search it at any time.',
    ],
  },
  {
    icon: Bell,
    title: 'Setting up and managing alerts',
    id: 'alerts',
    steps: [
      'Alerts are created automatically when a lease finishes processing — no setup required.',
      'You receive email alerts at 365, 90, 30, and 7 days before each critical date (lease expiration, renewal option deadlines, termination options).',
      'View all active alerts by clicking "Alerts" in the sidebar.',
      'Click any alert to go directly to the lease it refers to.',
      'Once you have acted on an alert, click "Acknowledge" to clear it from your active list.',
    ],
    tips: [
      'Make sure your email address is verified to receive alert emails.',
      'Alert emails are sent from noreply@leaseiq.com — add it to your safe senders list.',
      'If a date was extracted incorrectly, edit it on the lease detail page and alerts will update automatically after reprocessing.',
    ],
  },
  {
    icon: Search,
    title: 'Searching across your portfolio',
    id: 'search',
    steps: [
      'Click the search icon in the sidebar or press the keyboard shortcut to open global search.',
      'Type any term — property address, tenant name, clause language, or any text that appears in your leases.',
      'Results show the matching lease and a snippet of the text where the term appears.',
      'Click any result to go directly to that lease.',
    ],
    tips: [
      'Search works on the full original lease text, not just extracted fields.',
      'Use specific clause language (e.g., "personal guarantee") to find leases with particular provisions.',
      'Search requires a minimum of 2 characters.',
    ],
  },
  {
    icon: Users,
    title: 'Inviting team members',
    id: 'team',
    steps: [
      'Team collaboration is available on the Starter and Professional plans.',
      'Go to Settings → Team and click "Invite Member".',
      'Enter the email address and select a role: Admin, Editor, or Viewer.',
      'The invitee receives an email with a link to accept the invitation.',
      'Once accepted, they can see all leases in your workspace according to their role permissions.',
    ],
    tips: [
      'Admins can invite and remove members. Editors can upload and edit leases. Viewers can only read.',
      'Each invited user needs their own LeaseIQ account (or will be prompted to create one).',
      'You can remove a team member at any time from the Team settings page.',
    ],
  },
  {
    icon: CreditCard,
    title: 'Managing your subscription',
    id: 'billing',
    steps: [
      'Go to Settings → Billing to see your current plan and usage.',
      'Click "Upgrade Plan" to move to a higher tier — you will be taken to a secure Stripe checkout.',
      'Click "Manage Subscription" to update your payment method, download invoices, or cancel.',
      'Downgrading or canceling takes effect at the end of your current billing period.',
    ],
    tips: [
      'All payments are processed securely by Stripe — we never store your card details.',
      'If you exceed your lease limit on the Free or Starter plan, you will be prompted to upgrade.',
      'Annual plans with a 20% discount are available — contact support to switch.',
    ],
  },
];

const faqs = [
  { q: 'My PDF uploaded but processing is stuck. What do I do?', a: 'Wait up to 2 minutes — large PDFs can take longer. If the status stays on "Processing" after that, click the "Reprocess" button on the lease detail page. If it still fails, try a smaller or less complex PDF first to rule out file issues.' },
  { q: "The AI extracted the wrong rent amount. How do I fix it?", a: 'Click the "Edit" button on any extracted field on the lease detail page. Changes are saved immediately and a version history is kept automatically.' },
  { q: "I'm not receiving alert emails.", a: 'Check your spam folder and add noreply@leaseiq.com to your contacts. Also verify that alert dates were extracted correctly on the lease detail page — if the date field is empty, no alert will fire.' },
  { q: 'Can I delete a lease?', a: 'Yes — open the lease detail page, click the settings menu (⋯), and select "Delete Lease". This permanently deletes the extracted data and all associated alerts. The original PDF in blob storage is retained for 30 days.' },
  { q: 'How do I export my lease data?', a: 'Go to your Leases list and click "Export" to download all leases as CSV or Excel. Individual leases can also be exported as a PDF summary from the lease detail page.' },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <LandingNav />

      {/* Header */}
      <section className="px-6 py-16 border-b border-gray-800 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
            <FileText className="h-3.5 w-3.5" />
            Help Center
          </div>
          <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
          <p className="text-gray-400 text-lg">
            Guides and answers for getting the most out of LeaseIQ.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="px-6 py-12 border-b border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {guides.map(({ icon: Icon, title, id }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group"
              >
                <div className="bg-blue-600/10 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors flex-1">{title}</span>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-16">
          {guides.map(({ icon: Icon, title, id, steps, tips }) => (
            <div key={id} id={id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600/10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">{title}</h2>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
                <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">Step by step</h3>
                <ol className="space-y-4">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-600/40 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {tips.length > 0 && (
                <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-5">
                  <h3 className="font-semibold text-sm text-blue-400 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Tips
                  </h3>
                  <ul className="space-y-2">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-400">
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Common questions</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group bg-gray-900 border border-gray-800 rounded-xl">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-white pr-4 text-sm">{q}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help */}
      <section className="px-6 py-16 border-t border-gray-800">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
          <p className="text-gray-400 mb-6">
            Our support team usually responds within a few hours on business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@leaseiq.com"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Email support
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">LeaseIQ</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
