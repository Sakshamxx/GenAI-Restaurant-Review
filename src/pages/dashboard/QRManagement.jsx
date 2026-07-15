import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import {
  Download, RefreshCw, Loader2,
  ExternalLink, Copy, Check, AlertCircle, QrCode,
} from 'lucide-react'

// Unique canvas ID — used by toDataURL() for download
const QR_CANVAS_ID = 'restaurant-qr-canvas';

export default function QRManagement() {
  // ─── Context ───────────────────────────────────────────────────────────────
  const { restaurant } = useOutletContext() || {};

  const restaurantId    = restaurant?.id          ?? null;
  const restaurantName  = restaurant?.restaurant_name || restaurant?.name || 'Restaurant';
  const googleReviewLink = restaurant?.google_review_link || restaurant?.google_review_url || '';

  // The QR encodes the review FUNNEL URL — customer goes through rating, AI suggestions, then redirects to Google
  const FRONTEND_BASE = window.location.origin;  // e.g. http://localhost:5173
  const reviewFunnelUrl = restaurantId ? `${FRONTEND_BASE}/review/${restaurantId}` : '';

  // ─── State ─────────────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');
  // qrKey forces a re-render of QRCodeCanvas when Regenerate is clicked
  const [qrKey, setQrKey]             = useState(0);

  // ─── Regenerate ────────────────────────────────────────────────────────────
  // No backend call — just forces QRCodeCanvas to re-render with current value.
  const handleRegenerate = () => {
    if (!restaurantId) {
      setError('Restaurant data not loaded. Please refresh and try again.');
      return;
    }
    if (!googleReviewLink) {
      setError('Please add your Google Review URL in Settings first (required for the review funnel redirect).');
      return;
    }
    setError('');
    console.log('[QRManagement] Regenerating QR — Funnel URL:', reviewFunnelUrl);
    setQrKey(k => k + 1);   // bump key → React remounts QRCodeCanvas → fresh render
    console.log('[QRManagement] QR Generated');
  };

  // ─── Download — canvas → PNG blob → anchor click ──────────────────────────
  // No backend fetch. No FastAPI call. Pure browser canvas API.
  const handleDownload = () => {
    if (!reviewFunnelUrl) {
      setError('Restaurant data not loaded. Please refresh and try again.');
      return;
    }
    setError('');
    setDownloading(true);

    try {
      console.log('[QRManagement] Downloading QR — Google URL:', googleReviewLink);
      const canvas = document.getElementById(QR_CANVAS_ID);
      if (!canvas) {
        throw new Error('QR canvas element not found. Try clicking Regenerate first.');
      }

      const pngUrl = canvas.toDataURL('image/png');
      const safeName = restaurantName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const downloadLink = document.createElement('a');
      downloadLink.href     = pngUrl;
      downloadLink.download = `${safeName || 'restaurant'}-qr.png`;
      downloadLink.click();

      console.log('[QRManagement] QR PNG downloaded as:', downloadLink.download);
    } catch (err) {
      console.error('[QRManagement] download error:', err.message);
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // ─── Copy review funnel URL ────────────────────────────────────────────────
  const handleCopyUrl = async () => {
    if (!reviewFunnelUrl) return;
    try {
      await navigator.clipboard.writeText(reviewFunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available — silent
    }
  };

  // ─── Loading state while outlet context resolves ──────────────────────────
  if (!restaurantId) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">QR Code</h1>
          <p className="text-sm text-slate-400 mt-1">Your restaurant QR code for Google Reviews.</p>
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/5 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <span className="text-sm text-slate-400 font-display">Loading restaurant data…</span>
        </div>
      </div>
    );
  }

  const hasUrl = !!reviewFunnelUrl && !!googleReviewLink;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">QR Code</h1>
          <p className="text-sm text-slate-400 mt-1">
            One QR code for{' '}
            <span className="text-white font-semibold">{restaurantName}</span>.
            {' '}Print and place it on tables for customers to scan.
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handleRegenerate}
            disabled={!hasUrl}
            whileHover={{ scale: hasUrl ? 1.02 : 1 }}
            whileTap={{ scale: hasUrl ? 0.98 : 1 }}
            title={!hasUrl ? 'Add a Google Review URL in Settings first' : 'Regenerate QR'}
            className="bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-white/10 rounded-xl py-2.5 px-4 font-display font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </motion.button>

          <motion.button
            onClick={handleDownload}
            disabled={!hasUrl || downloading}
            whileHover={{ scale: hasUrl ? 1.02 : 1 }}
            whileTap={{ scale: hasUrl ? 0.98 : 1 }}
            title={!hasUrl ? 'Add a Google Review URL in Settings first' : 'Download QR as PNG'}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 px-4 font-display font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg border border-brand-400/20 cursor-pointer"
          >
            {downloading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            <span>{downloading ? 'Downloading…' : 'Download PNG'}</span>
          </motion.button>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No-URL warning */}
      {!hasUrl && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            No Google Review URL configured.{' '}
            <a href="/dashboard/settings" className="underline underline-offset-2 hover:text-amber-200">
              Go to Settings
            </a>
            {' '}and save your Google Maps Review link first.
          </span>
        </div>
      )}

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl border border-white/5 overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">

          {/* QR Panel */}
          <div className="flex flex-col items-center justify-center p-10 md:border-r border-white/5 bg-white/[0.01]">
            <div className="bg-white rounded-2xl p-5 shadow-xl flex flex-col items-center gap-3">
              {hasUrl ? (
                /* QRCodeCanvas renders entirely in the browser — no network request */
                /* QR encodes the review FUNNEL URL — not the Google link directly */
                <QRCodeCanvas
                  key={qrKey}
                  id={QR_CANVAS_ID}
                  value={reviewFunnelUrl}
                  size={192}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center bg-slate-100 rounded-xl gap-3 px-4 text-center">
                  <QrCode className="w-12 h-12 text-slate-300" />
                  <span className="text-[10px] text-slate-400 leading-snug">
                    Add your Google Review URL in Settings to generate this QR
                  </span>
                </div>
              )}
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                {hasUrl ? 'SCAN ME' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Info Panel */}
          <div className="flex-1 flex flex-col gap-6 p-8">
            <div>
              <h2 className="text-xl font-display font-bold text-white">{restaurantName}</h2>
              <p className="text-xs text-slate-400 mt-1">Google Review QR Code</p>
            </div>

            {/* QR Content — Funnel URL */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-display">
                QR Encodes (Customer Review Funnel)
              </span>
              {hasUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono truncate">
                      {reviewFunnelUrl}
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className="flex-shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 text-slate-300 transition-colors cursor-pointer"
                      title="Copy funnel URL"
                    >
                      {copied
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <Copy className="w-4 h-4" />
                      }
                    </button>
                    <a
                      href={reviewFunnelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 text-slate-300 hover:text-emerald-300 transition-colors"
                      title="Test funnel in browser"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Google URL: <span className="text-slate-400 truncate font-mono">{googleReviewLink}</span>
                    <a href={googleReviewLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-brand-400 hover:underline">↗</a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-300">
                    Not configured — add your Google Review link in Settings.
                  </span>
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-display mb-2">
                How it works
              </p>
              <ol className="flex flex-col gap-1.5 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
                <li>Paste your Google Review URL in Settings and save</li>
                <li>Return here — QR auto-generates your customer review funnel</li>
                <li>Click "Download PNG" and print it</li>
                <li>Customer scans → rates experience → AI generates review</li>
                <li>Positive: redirected to Google Reviews. Negative: private feedback</li>
              </ol>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
