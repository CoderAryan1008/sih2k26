import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { DocumentItem } from '../types';
import { 
  Files, 
  Upload, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  Plus, 
  History, 
  ShieldCheck 
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('VERIFIED');
  const [verifyNotes, setVerifyNotes] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeRole]);

  const handleReplaceDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      const res = await api.replaceDocument(selectedDoc.id, {
        documentName: newDocName || `Renewed_${selectedDoc.document_name}`,
        expiryDate: newExpiryDate,
      });
      if (res.success) {
        setReplaceModalOpen(false);
        setNewDocName('');
        setNewExpiryDate('');
        await fetchDocuments();
      } else {
        alert(res.error || 'Replacement failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      const res = await api.verifyDocument(selectedDoc.id, verifyStatus, verifyNotes);
      if (res.success) {
        setVerifyModalOpen(false);
        setVerifyNotes('');
        await fetchDocuments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-blue-400">Statutory Documents</div>
          <h2 className="text-2xl font-bold text-white font-heading mt-0.5">Document Registry & Renewal Tracking</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracks validity expiration dates, renewal countdowns, and auditable version trees (v1, v2).
          </p>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Document Details</th>
                <th className="px-4 py-3.5">Institution</th>
                <th className="px-4 py-3.5">Version & History</th>
                <th className="px-4 py-3.5">Validity & Expiry</th>
                <th className="px-4 py-3.5">Verification Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Files className="w-4 h-4 text-blue-400" />
                      <span>{doc.document_name}</span>
                    </div>
                    <div className="text-[11px] text-blue-400 mt-0.5 font-semibold">{doc.document_type}</div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-300">
                    {doc.institution_name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                      v{doc.version}.0
                    </span>
                    {doc.replacement_of_doc_id && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Replaced {doc.replacement_of_doc_id}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {doc.expiry_date ? (
                      <div className="space-y-0.5">
                        <div className="text-slate-300 font-semibold">{new Date(doc.expiry_date).toLocaleDateString()}</div>
                        <div className={`text-[11px] font-bold ${
                          doc.isExpired ? 'text-rose-400' : (doc.daysUntilExpiry || 0) < 60 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {doc.isExpired ? `Expired ${Math.abs(doc.daysUntilExpiry || 0)}d ago` : `${doc.daysUntilExpiry}d remaining`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Permanent Record</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      doc.verification_status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : doc.verification_status === 'EXPIRED'
                        ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {doc.verification_status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    {/* Institution Admin Action: Upload replacement document */}
                    {activeRole === 'institution_admin' && (
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setReplaceModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                        title="Upload replacement document with version preservation"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Renew / Replace</span>
                      </button>
                    )}

                    {/* Officer Action: Verify */}
                    {['scrutiny_officer', 'regional_officer', 'super_admin'].includes(activeRole) && (
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setVerifyModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Verify Authenticity</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Replace Document */}
      {replaceModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleReplaceDocument} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Upload Renewed Replacement Document</h3>
            <p className="text-xs text-slate-300">
              Preserves version {selectedDoc.version}.0 in history and issues version {selectedDoc.version + 1}.0.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Document Title:</label>
              <input
                type="text"
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder={`Renewed_${selectedDoc.document_name}`}
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">New Expiration Date:</label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={e => setNewExpiryDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplaceModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Commit Replacement v{selectedDoc.version + 1}.0
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Verify Document */}
      {verifyModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleVerifyDocument} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Document Verification Determination</h3>
            <p className="text-xs text-slate-300">
              Document: <span className="font-semibold text-blue-400">{selectedDoc.document_name}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Determination:</label>
              <select
                value={verifyStatus}
                onChange={e => setVerifyStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-xl text-xs text-slate-100"
              >
                <option value="VERIFIED">VERIFIED (Authentic & Valid)</option>
                <option value="REJECTED">REJECTED (Deficient / Expired)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Officer Verification Notes:</label>
              <textarea
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                placeholder="Verified against statutory authority seal..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md"
              >
                Save Determination
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
