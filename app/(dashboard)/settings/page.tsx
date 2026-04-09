'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { User, Key, Trash2, Loader2, CheckCircle, AlertCircle, LogOut, Tag } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [promoAdmin, setPromoAdmin] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setUser(d.user);
      setName(d.user?.name || '');
      setEmail(d.user?.email || '');
    });
    // Try loading promo admin data (only works for admin email)
    fetch('/api/admin/promo').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setPromoAdmin(d);
    }).catch(() => {});
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const emailChanged = email !== user?.email;
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (res.ok) {
      if (emailChanged) {
        // Session JWT still holds old email — must re-login so it refreshes
        setProfileMsg({ type: 'success', text: 'Email updated. You will be signed out now so the change takes effect.' });
        setTimeout(() => signOut({ callbackUrl: '/auth/signin' }), 2500);
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
      }
    } else {
      setProfileMsg({ type: 'error', text: data.error || 'Update failed' });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setSavingPassword(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSavingPassword(false);
    if (res.ok) {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword(''); setNewPassword('');
    } else {
      setPasswordMsg({ type: 'error', text: data.error || 'Password update failed' });
    }
  };

  const deleteAccount = async () => {
    await fetch('/api/settings', { method: 'DELETE' });
    signOut({ callbackUrl: '/auth/signin' });
  };

  const Msg = ({ msg }: { msg: { type: string; text: string } | null }) => {
    if (!msg) return null;
    return (
      <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border mt-4 ${msg.type === 'success' ? 'text-green-400 border-green-800 bg-green-900/20' : 'text-red-400 border-red-800 bg-red-900/20'}`}>
        {msg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        {msg.text}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Profile */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-900/30 p-2 rounded-lg"><User className="h-5 w-5 text-blue-400" /></div>
          <h2 className="text-base font-semibold text-white">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Profile
          </button>
          <Msg msg={profileMsg} />
        </form>
      </div>

      {/* Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-900/30 p-2 rounded-lg"><Key className="h-5 w-5 text-blue-400" /></div>
          <h2 className="text-base font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" disabled={savingPassword} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Password
          </button>
          <Msg msg={passwordMsg} />
        </form>
      </div>

      {/* Promo Code Admin — only visible when ADMIN_EMAIL matches */}
      {promoAdmin && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-900/30 p-2 rounded-lg"><Tag className="h-5 w-5 text-purple-400" /></div>
            <h2 className="text-base font-semibold text-white">Promo Code Admin</h2>
          </div>

          {promoAdmin.codes?.map((code: any) => (
            <div key={code.id} className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white font-mono font-semibold uppercase text-sm bg-gray-800 border border-gray-700 px-3 py-1 rounded-lg">
                  {code.code}
                </span>
                <span className="text-xs text-purple-400 bg-purple-900/20 border border-purple-700 px-2 py-0.5 rounded-full capitalize">
                  {code.plan}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${code.is_active ? 'text-green-400 border-green-700 bg-green-900/20' : 'text-gray-400 border-gray-700 bg-gray-800'}`}>
                  {code.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-gray-400 text-sm ml-auto">{code.use_count} use{code.use_count !== 1 ? 's' : ''}</span>
              </div>

              {promoAdmin.uses?.filter((u: any) => u.code === code.code).length > 0 ? (
                <div className="space-y-2">
                  {promoAdmin.uses.filter((u: any) => u.code === code.code).map((use: any) => (
                    <div key={use.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
                      <div className="h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="text-white font-medium">{use.user_name}</span>
                      <span className="text-gray-400">{use.user_email}</span>
                      <span className="text-gray-500 ml-auto text-xs">
                        {new Date(use.used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No uses yet.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-900/30 p-2 rounded-lg"><Trash2 className="h-5 w-5 text-red-400" /></div>
          <h2 className="text-base font-semibold text-white">Danger Zone</h2>
        </div>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 border border-red-800 text-red-400 hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete Account
          </button>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-4">This will permanently delete your account and all lease data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={deleteAccount} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Yes, Delete Everything
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
