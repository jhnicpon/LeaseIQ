'use client';
import { useEffect, useState } from 'react';
import { Users, Mail, Trash2, Loader2, CheckCircle, AlertCircle, Crown, Shield, Edit3, Eye } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'text-yellow-400', desc: 'Full access including billing' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-400', desc: 'Full access except billing' },
  editor: { label: 'Editor', icon: Edit3, color: 'text-green-400', desc: 'Upload, edit, add notes' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-400', desc: 'Read only, can export PDFs' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMembers = () => {
    fetch('/api/team').then(r => r.json()).then(d => {
      setMembers(d.members || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchMembers(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true); setMsg(null);
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setInviting(false);
    if (res.ok) {
      setMsg({ type: 'success', text: `Invitation sent to ${email}` });
      setEmail('');
      fetchMembers();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to send invitation' });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    fetchMembers();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-900/30 p-2 rounded-lg"><Users className="h-6 w-6 text-blue-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-gray-400 text-sm">Collaborate with your team on lease management</p>
        </div>
      </div>

      {/* Roles info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Object.entries(ROLE_CONFIG).map(([key, { label, icon: Icon, color, desc }]) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-sm font-medium ${color}`}>{label}</span>
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-400" /> Invite Team Member
        </h2>
        <form onSubmit={invite} className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="colleague@company.com"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {['admin', 'editor', 'viewer'].map(r => (
              <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send Invite
          </button>
        </form>
        {msg && (
          <div className={`flex items-center gap-2 mt-3 text-sm p-3 rounded-lg border ${msg.type === 'success' ? 'text-green-400 border-green-800 bg-green-900/20' : 'text-red-400 border-red-800 bg-red-900/20'}`}>
            {msg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Team ({members.length})</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No team members yet. Invite someone above.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {members.map(m => {
              const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.viewer;
              const Icon = cfg.icon;
              const isPending = !m.acceptedAt;
              return (
                <div key={m.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-white">
                      {(m.memberName || m.invitedEmail || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.memberName || m.invitedEmail}</p>
                      <p className="text-xs text-gray-500">{m.memberEmail || m.invitedEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {cfg.label}
                    </span>
                    {isPending && (
                      <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
