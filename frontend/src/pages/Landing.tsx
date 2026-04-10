import React from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  Film,
  Smartphone,
  Captions,
  Activity,
  Webhook,
  KeyRound,
  ArrowRight,
  Layers,
  Globe,
  Terminal,
} from 'lucide-react'

const features: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}[] = [
    {
      icon: Film,
      title: 'Multi-format Transcoding',
      description:
        'Convert to MP4 or HLS adaptive streaming with multi-rendition support — from 360p to 4K.',
    },
    {
      icon: Smartphone,
      title: 'Social Media Presets',
      description:
        'One-click optimization for TikTok (9:16), YouTube (16:9), and Instagram (1:1).',
    },
    {
      icon: Captions,
      title: 'Automatic Subtitles',
      description:
        'WhisperX-powered speech recognition with automatic language detection and WebVTT output.',
    },
    {
      icon: Activity,
      title: 'Real-time Progress',
      description:
        'Live progress updates via Server-Sent Events with ETA calculations and status notifications.',
    },
    {
      icon: Webhook,
      title: 'Webhook Integration',
      description:
        'HMAC-signed event notifications with automatic retries and comprehensive delivery logging.',
    },
    {
      icon: KeyRound,
      title: 'Secure API Keys',
      description:
        'Generate, manage, and revoke scoped API keys with full lifecycle control.',
    },
  ]

const capabilities: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}[] = [
    { icon: Layers, label: 'Output Formats', value: '5+' },
    { icon: Globe, label: 'Language Detection', value: 'Auto' },
    { icon: Zap, label: 'Live Updates', value: 'SSE' },
  ]

function Landing(): React.ReactElement {
  const scrollToFeatures = (e: React.MouseEvent): void => {
    e.preventDefault()
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── Header ─── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-sidebar-from/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline text-white">
            <Zap size={22} className="text-accent" />
            <span className="text-lg font-bold tracking-tight">TranscodeFlow</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="hidden sm:inline text-sm text-white/70 hover:text-white no-underline transition-colors"
            >
              Features
            </a>
            <Link
              to="/docs" state={{ from: '/' }}
              className="hidden sm:inline text-sm text-white/70 hover:text-white no-underline transition-colors"
            >
              API Docs
            </Link>
            <Link
              to="/login"
              className="hidden md:inline text-sm text-white/70 hover:text-white no-underline transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg no-underline font-medium transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar-from via-[#251f5a] to-sidebar-to overflow-hidden pt-16">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-float-slow pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-400/15 rounded-full blur-[100px] animate-float-medium pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-indigo-300/10 rounded-full blur-[80px] animate-float-slow pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/80">
              API-First Video Processing Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-6">
            Video Transcoding,{' '}
            <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
              Simplified
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
            Transform any video into delivery-ready formats with a single API call.
            Multi-format transcoding, auto subtitles, real-time progress — all in one
            platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl text-base font-semibold no-underline transition-all hover:shadow-glow"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/docs" state={{ from: '/' }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-8 py-3.5 rounded-xl text-base font-semibold no-underline border border-white/10 transition-colors"
            >
              View API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-surface-raised">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything You Need to Process Video
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A complete video processing pipeline — from upload to delivery — built for
              developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group bg-surface border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon size={22} className="text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Code Preview ─── */}
      <section className="py-24 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent-soft rounded-full px-4 py-1.5 mb-4">
              <Terminal size={14} className="text-accent" />
              <span className="text-sm text-accent font-medium">Quick Start</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Start Transcoding in Seconds
            </h2>
            <p className="text-lg text-text-secondary max-w-xl mx-auto">
              Submit your first job with a single API call. No SDKs required.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-sidebar-from rounded-2xl border border-white/10 overflow-hidden shadow-card-hover">
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-black/20">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-white/40 font-mono">terminal</span>
            </div>

            {/* Code */}
            <div className="p-6 font-mono text-sm leading-7 overflow-x-auto">
              <div>
                <span className="text-curl-command">curl</span>{' '}
                <span className="text-curl-flag">-X POST</span>{' '}
                <span className="text-curl-url">
                  https://api.transcodeflow.com/api/v1/jobs
                </span>{' '}
                <span className="text-white/30">\</span>
              </div>
              <div className="pl-4">
                <span className="text-curl-flag">-H</span>{' '}
                <span className="text-curl-string">
                  &quot;X-API-Key: vf_your_api_key&quot;
                </span>{' '}
                <span className="text-white/30">\</span>
              </div>
              <div className="pl-4">
                <span className="text-curl-flag">-H</span>{' '}
                <span className="text-curl-string">
                  &quot;Content-Type: application/json&quot;
                </span>{' '}
                <span className="text-white/30">\</span>
              </div>
              <div className="pl-4">
                <span className="text-curl-flag">-d</span>{' '}
                <span className="text-curl-string">{`'{`}</span>
              </div>
              <div className="pl-8">
                <span className="text-white/50">&quot;source_url&quot;</span>
                <span className="text-white/30">: </span>
                <span className="text-curl-string">
                  &quot;https://example.com/video.mp4&quot;
                </span>
                <span className="text-white/30">,</span>
              </div>
              <div className="pl-8">
                <span className="text-white/50">&quot;output_format&quot;</span>
                <span className="text-white/30">: </span>
                <span className="text-curl-string">&quot;mp4&quot;</span>
                <span className="text-white/30">,</span>
              </div>
              <div className="pl-8">
                <span className="text-white/50">&quot;preset&quot;</span>
                <span className="text-white/30">: </span>
                <span className="text-curl-string">&quot;youtube&quot;</span>
              </div>
              <div>
                <span className="text-curl-string">{`}'`}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─── */}
      <section className="py-20 bg-accent-soft">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {capabilities.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon size={24} className="text-accent" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
                  {value}
                </div>
                <div className="text-sm text-text-secondary">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-br from-sidebar-from via-[#251f5a] to-sidebar-to relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Video Pipeline?
          </h2>
          <p className="text-lg text-white/60 mb-10">
            Get started for free. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl text-base font-semibold no-underline transition-all hover:shadow-glow"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/docs" state={{ from: '/' }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-8 py-3.5 rounded-xl text-base font-semibold no-underline border border-white/10 transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-sidebar-from border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-white">
              <Zap size={20} className="text-accent" />
              <span className="text-lg font-bold tracking-tight">TranscodeFlow</span>
            </div>
            <nav className="flex items-center gap-6 flex-wrap justify-center">
              <Link
                to="/dashboard"
                className="text-sm text-white/50 hover:text-white/80 no-underline transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/docs" state={{ from: '/' }}
                className="text-sm text-white/50 hover:text-white/80 no-underline transition-colors"
              >
                API Docs
              </Link>
              <Link
                to="/login"
                className="text-sm text-white/50 hover:text-white/80 no-underline transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm text-white/50 hover:text-white/80 no-underline transition-colors"
              >
                Sign Up
              </Link>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/30">
            &copy; {new Date().getFullYear()} TranscodeFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
