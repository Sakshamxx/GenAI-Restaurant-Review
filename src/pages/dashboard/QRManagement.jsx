import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { QrCode, Plus, Download, Trash2, Loader2 } from 'lucide-react'
import { getQRCodes, createQRCode, deleteQRCode } from '../../services/supabase_db.js'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Generates a URL-safe random token
function generateToken(label) {
  const slug = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}`;
}

export default function QRManagement() {
  const { restaurant } = useOutletContext() || {};
  const restaurantId = restaurant?.id;

  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTableName, setNewTableName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await getQRCodes(restaurantId);
        console.log('[QRManagement] QR codes:', data);
        setQrCodes(data);
      } catch (err) {
        console.error('[QRManagement] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId]);

  const handleCreateQR = async (e) => {
    e.preventDefault();
    if (!newTableName.trim() || !restaurantId) return;
    setCreating(true);
    const token = generateToken(newTableName);
    const newQR = await createQRCode({
      restaurantId,
      qrToken: token,
      qrImageUrl: null,
    });
    if (newQR) {
      // Annotate with the label for display (stored in qr_token prefix)
      setQrCodes(prev => [{ ...newQR, _label: newTableName }, ...prev]);
    }
    setNewTableName('');
    setShowAddModal(false);
    setCreating(false);
  };

  const handleDeleteQR = async (id) => {
    const ok = await deleteQRCode(id);
    if (ok) setQrCodes(prev => prev.filter(q => q.id !== id));
  };

  const handleDownload = async (qr) => {
    const token = qr.qr_token;
    const downloadUrl = `${BACKEND_URL}/api/qr/download/${restaurantId}/${token}`;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Backend unavailable');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reviewflow_qr_${token}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(downloadUrl, '_blank');
    }
  };

  // Display label: use _label (just-created) or parse from qr_token prefix
  const getLabel = (qr) => {
    if (qr._label) return qr._label;
    // token format: "table-15-abc123" → "Table 15"
    const parts = qr.qr_token?.split('-') || [];
    if (parts.length > 1) {
      return parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return qr.qr_token || 'QR Code';
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">QR Code Placards</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and download tableside QR codes to capture customer reviews.</p>
        </div>
        <motion.button
          onClick={() => setShowAddModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 px-4 font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg border border-brand-400/20"
        >
          <Plus className="w-4 h-4" />
          <span>Generate QR Code</span>
        </motion.button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {qrCodes.length === 0 ? (
              <div className="col-span-full glass-panel rounded-3xl p-12 text-center border border-white/5 flex flex-col items-center gap-3">
                <QrCode className="w-10 h-10 text-slate-600" />
                <span className="text-sm font-semibold text-slate-400 font-display">No QR codes yet</span>
                <p className="text-xs text-slate-500">Click "Generate QR Code" to create your first tableside placard.</p>
              </div>
            ) : qrCodes.map((qr) => (
              <motion.div
                key={qr.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="glass-panel rounded-3xl p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex gap-4 items-start">
                  {/* QR Preview */}
                  <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center gap-1.5 border border-slate-200 shadow-md flex-shrink-0">
                    <img
                      src={`${BACKEND_URL}/api/qr/preview/${restaurantId}/${qr.qr_token}`}
                      alt={`QR code for ${getLabel(qr)}`}
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback SVG */}
                    <svg className="w-20 h-20 text-slate-950 hidden" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="0" y="0" width="25" height="25" />
                      <rect x="5" y="5" width="15" height="15" fill="white" />
                      <rect x="10" y="10" width="5" height="5" />
                      <rect x="75" y="0" width="25" height="25" />
                      <rect x="80" y="5" width="15" height="15" fill="white" />
                      <rect x="85" y="10" width="5" height="5" />
                      <rect x="0" y="75" width="25" height="25" />
                      <rect x="5" y="80" width="15" height="15" fill="white" />
                      <rect x="10" y="85" width="5" height="5" />
                      <rect x="35" y="10" width="10" height="5" />
                      <rect x="50" y="5" width="5" height="15" />
                      <rect x="30" y="30" width="15" height="15" />
                      <rect x="55" y="35" width="25" height="5" />
                      <rect x="40" y="55" width="20" height="20" />
                    </svg>
                    <span className="text-[8px] font-bold text-slate-500 tracking-wider font-display uppercase">SCAN ME</span>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 flex flex-col justify-between h-full pt-1">
                    <div>
                      <h3 className="font-display font-bold text-white text-base leading-none">{getLabel(qr)}</h3>
                      <span className="text-[10px] text-slate-500 mt-1 block truncate">Token: {qr.qr_token}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                      <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-lg py-1 px-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold font-display">Scans</span>
                        <span className="text-sm font-bold text-white mt-0.5">{qr.total_scans || 0}</span>
                      </div>
                      <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-lg py-1 px-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold font-display">Created</span>
                        <span className="text-[10px] font-bold text-slate-300 mt-0.5">
                          {new Date(qr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-5 border-t border-white/5 pt-4">
                  <button
                    onClick={() => handleDownload(qr)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={() => handleDeleteQR(qr.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl p-2 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete QR"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 relative z-10 flex flex-col gap-5 text-left"
            >
              <div>
                <h3 className="text-lg font-display font-bold text-white">Generate QR Placard</h3>
                <p className="text-xs text-slate-400 mt-1">Add a new table number or location to register a tracking ID.</p>
              </div>
              <form onSubmit={handleCreateQR} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-display">
                    Placard Label / Table Name
                  </label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="e.g. Table 15, Patio Bar"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all select-text"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-transparent hover:bg-white/5 text-slate-400 border border-white/10 rounded-xl py-2 px-3 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-md cursor-pointer border border-brand-400/20 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Create Placard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
