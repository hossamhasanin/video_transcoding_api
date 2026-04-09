import React, { useState, useEffect, useCallback } from 'react'
import {
  User,
  Lock,
  Globe,
  Key,
  ShieldCheck,
  Copy,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { getErrorMessage } from '../utils/http'
import type { ErrorWithDetail } from '../utils/http'
import ApiKeyManager from '../components/ApiKeyManager'
import api from '../api'
import type { WebhookSettings, WebhookSecretResponse } from '../types/index'

// ---------------------------------------------------------------------------
// Shared section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="bg-surface-raised rounded-xl border border-border shadow-card">
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        <p className="text-sm text-text-secondary ml-12">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

function ProfileSection(): React.ReactElement {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const resendVerification = useAuthStore((s) => s.resendVerification)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg(null)
    try {
      await updateProfile(fullName || undefined)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: getErrorMessage(err as ErrorWithDetail, 'Failed to update profile') })
    } finally {
      setSaving(false)
    }
  }

  const handleResendVerification = async (): Promise<void> => {
    setResending(true)
    setResendMsg(null)
    try {
      await resendVerification()
      setResendMsg('Verification email sent!')
    } catch (err) {
      setResendMsg(getErrorMessage(err as ErrorWithDetail, 'Failed to send verification email'))
    } finally {
      setResending(false)
    }
  }

  return (
    <SectionCard icon={User} title="Profile" description="Manage your personal information">
      {profileMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-sm ${
            profileMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {profileMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {profileMsg.text}
        </div>
      )}

      <form onSubmit={handleSaveProfile}>
        <div className="mb-5">
          <label className="block mb-1.5 font-medium text-sm text-text-primary">Email</label>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] bg-surface text-text-tertiary cursor-not-allowed"
          />
          {!user?.email_verified && (
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-warning/20 text-amber-700">
                Unverified
              </span>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMsg && <span className="text-xs text-text-secondary">{resendMsg}</span>}
            </div>
          )}
          {user?.email_verified && (
            <div className="flex items-center gap-1 mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Verified</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="fullName" className="block mb-1.5 font-medium text-sm text-text-primary">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px]
                       transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow
                       placeholder:text-text-tertiary"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white
                       rounded-lg text-sm font-medium transition-colors cursor-pointer
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Password section
// ---------------------------------------------------------------------------

function PasswordSection(): React.ReactElement {
  const changePassword = useAuthStore((s) => s.changePassword)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await changePassword(currentPassword, newPassword)
      setMsg({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err as ErrorWithDetail, 'Failed to change password') })
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow placeholder:text-text-tertiary pr-10'

  return (
    <SectionCard icon={Lock} title="Password & Security" description="Update your password to keep your account secure">
      {msg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label htmlFor="currentPw" className="block mb-1.5 font-medium text-sm text-text-primary">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPw"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="newPw" className="block mb-1.5 font-medium text-sm text-text-primary">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPw"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPw" className="block mb-1.5 font-medium text-sm text-text-primary">
            Confirm New Password
          </label>
          <input
            id="confirmPw"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px]
                       transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow
                       placeholder:text-text-tertiary"
            placeholder="Confirm new password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white
                       rounded-lg text-sm font-medium transition-colors cursor-pointer
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Webhooks section
// ---------------------------------------------------------------------------

function WebhooksSection(): React.ReactElement {
  const [settings, setSettings] = useState<WebhookSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [urlMsg, setUrlMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [secretMsg, setSecretMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      const { data } = await api.get<WebhookSettings>('/settings/webhook')
      setSettings(data)
      setWebhookUrl(data.default_webhook_url ?? '')
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSaveUrl = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setSavingUrl(true)
    setUrlMsg(null)
    try {
      const { data } = await api.put<WebhookSettings>('/settings/webhook', {
        default_webhook_url: webhookUrl.trim() || null,
      })
      setSettings(data)
      setUrlMsg({ type: 'success', text: 'Webhook URL saved' })
    } catch (err) {
      setUrlMsg({ type: 'error', text: getErrorMessage(err as ErrorWithDetail, 'Failed to save webhook URL') })
    } finally {
      setSavingUrl(false)
    }
  }

  const handleRegenerate = async (): Promise<void> => {
    setRegenerating(true)
    setSecretMsg(null)
    setRevealedSecret(null)
    setConfirmRegenerate(false)
    try {
      const { data } = await api.post<WebhookSecretResponse>('/settings/webhook/regenerate-secret')
      setRevealedSecret(data.webhook_secret)
      setSettings((prev) =>
        prev
          ? { ...prev, webhook_secret_set: true, webhook_secret_masked: data.webhook_secret_masked }
          : prev
      )
      setSecretMsg({ type: 'success', text: 'New webhook secret generated' })
    } catch (err) {
      setSecretMsg({ type: 'error', text: getErrorMessage(err as ErrorWithDetail, 'Failed to regenerate secret') })
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <SectionCard icon={Globe} title="Webhooks" description="Manage webhook signing secret and default URL">
        <div className="flex items-center justify-center py-8 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading webhook settings...
        </div>
      </SectionCard>
    )
  }

  if (fetchError) {
    return (
      <SectionCard icon={Globe} title="Webhooks" description="Manage webhook signing secret and default URL">
        <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="text-sm mb-3">Failed to load webhook settings.</p>
          <button
            onClick={() => { setFetchError(false); setLoading(true); fetchSettings() }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard icon={Globe} title="Webhooks" description="Manage webhook signing secret and default URL">
      {/* Secret status */}
      <div className="mb-6">
        <label className="block mb-1.5 font-medium text-sm text-text-primary">Webhook Signing Secret</label>
        <p className="text-xs text-text-secondary mb-3">
          This secret is used to sign webhook payloads with HMAC-SHA256. Include it as the{' '}
          <code className="bg-accent-soft text-accent px-1 py-0.5 rounded text-[11px]">X-Webhook-Signature</code>{' '}
          header when verifying deliveries.
        </p>

        {secretMsg && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm ${
              secretMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {secretMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {secretMsg.text}
          </div>
        )}

        {revealedSecret ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <strong className="text-sm text-amber-800">
                Save this secret now — you won&apos;t be able to see it again.
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all bg-white/70 p-2.5 rounded text-sm font-mono text-text-primary border border-amber-200">
                {revealedSecret}
              </code>
              <button
                onClick={() => handleCopy(revealedSecret)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm
                           text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setRevealedSecret(null)}
              className="mt-3 text-xs text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {settings?.webhook_secret_set ? (
              <>
                <code className="px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono text-text-secondary">
                  {settings.webhook_secret_masked}
                </code>
                <button
                  onClick={() => handleCopy(settings.webhook_secret_masked ?? '')}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary
                             transition-colors cursor-pointer"
                  title="Copy masked secret"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <span className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
                No secret configured
              </span>
            )}
            <button
              onClick={() => setConfirmRegenerate(true)}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-surface border border-border rounded-lg
                         text-text-secondary hover:text-text-primary hover:border-accent transition-colors
                         cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {regenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {settings?.webhook_secret_set
                ? regenerating
                  ? 'Generating...'
                  : 'Regenerate'
                : regenerating
                  ? 'Generating...'
                  : 'Generate Secret'}
            </button>
          </div>
        )}

        {confirmRegenerate && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 mb-3">
              {settings?.webhook_secret_set
                ? 'This will invalidate your current webhook secret. Any systems using the old secret will need to be updated.'
                : 'Generate a new webhook signing secret?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg
                           transition-colors cursor-pointer"
              >
                {settings?.webhook_secret_set ? 'Yes, Regenerate' : 'Generate'}
              </button>
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="px-4 py-1.5 bg-white border border-border text-sm text-text-secondary rounded-lg
                           hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Default webhook URL */}
      {urlMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-sm ${
            urlMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {urlMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {urlMsg.text}
        </div>
      )}

      <form onSubmit={handleSaveUrl}>
        <div className="mb-5">
          <label htmlFor="webhookUrl" className="block mb-1.5 font-medium text-sm text-text-primary">
            Default Webhook URL
          </label>
          <p className="text-xs text-text-secondary mb-2">
            This URL will be used as the default callback for all new transcoding jobs.
          </p>
          <input
            id="webhookUrl"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/transcode"
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[15px]
                       transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-glow
                       placeholder:text-text-tertiary"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white
                       rounded-lg text-sm font-medium transition-colors cursor-pointer
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {savingUrl ? 'Saving...' : 'Save URL'}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

function Settings(): React.ReactElement {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>
      <div className="space-y-8 max-w-3xl">
        <ProfileSection />
        <PasswordSection />
        <WebhooksSection />
        <div className="bg-surface-raised rounded-xl border border-border shadow-card">
          <div className="px-6 pt-6 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
                <Key className="w-4.5 h-4.5 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
            </div>
            <p className="text-sm text-text-secondary ml-12">Manage your API keys for programmatic access</p>
          </div>
          <div className="p-6">
            <ApiKeyManager />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
