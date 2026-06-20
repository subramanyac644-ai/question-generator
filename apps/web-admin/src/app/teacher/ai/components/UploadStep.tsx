'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../AuthContext';

interface UploadStepProps {
  onNext: () => void;
}

export default function UploadStep({ onNext }: UploadStepProps) {
  const { session, user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.access_token) {
      fetchDocuments();
    }
  }, [session, user]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setUploadError('File exceeds the 20 MB limit. Please choose a smaller PDF.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Only PDF files (.pdf) are accepted.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setUploadError('');
    }
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    if (!selectedFile) {
      setUploadError('Please select a PDF file first.');
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (user?.departmentId) formData.append('departmentId', user.departmentId);
    if (uploadTitle) formData.append('title', uploadTitle);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error (${res.status}): ${responseText || 'No response details'}`);
      }

      if (!res.ok) throw new Error(data.message || 'Failed to upload document.');

      // Store the uploaded document info so Generate page can use it
      localStorage.setItem('qgp_upload_docId', data.id);
      localStorage.setItem('qgp_upload_docTitle', data.title || selectedFile.name);

      setUploadSuccess(`✅ Successfully uploaded: "${data.title}" — proceeding...`);

      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (err: any) {
      setUploadError(err.message || 'Error occurred during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Delete failed.');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setUploadError(err.message || 'Could not delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Upload Form */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="text-brand-500">📤</span> Upload Source Document
        </h2>
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <form onSubmit={handleUpload} className="space-y-4">
            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-400 font-medium">
                ⚠️ {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                {uploadSuccess}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-left">
                Document Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={uploadTitle}
                placeholder="e.g. Chapter 3 - Data Structures"
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-left">
                Select PDF File <span className="text-red-500">*</span>
              </label>
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                required
                onChange={handleFileChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-600 file:bg-slate-200 file:border-0 file:rounded-lg file:text-slate-700 file:px-3 file:py-1 file:mr-3 hover:file:bg-slate-300 file:font-semibold file:cursor-pointer transition"
              />
              <p className="text-[10px] text-slate-500 mt-1 text-left">
                PDF only · Max 20 MB · Magic-byte validated
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-700 text-left space-y-0.5">
                <p><span className="font-bold">File:</span> {selectedFile.name}</p>
                <p><span className="font-bold">Size:</span> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                  Uploading...
                </span>
              ) : 'Upload PDF & Continue'}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl py-3 text-sm transition-all shadow-sm"
            >
              Skip Upload (Text Only)
            </button>
          </form>


        </div>
      </div>

      {/* Document Repository */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="text-amber-500">📂</span> Document Repository
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Size</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <span className="text-3xl">📄</span>
                      <p>No documents uploaded yet.</p>
                      <p className="text-[10px]">Upload a PDF to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800 max-w-[180px]">
                      <p className="truncate">{doc.title}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{doc.fileType}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                         <button
                          onClick={() => {
                            localStorage.setItem('qgp_upload_docId', doc.id);
                            localStorage.setItem('qgp_upload_docTitle', doc.title);
                            onNext();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition text-xs font-bold shadow-sm"
                        >
                          Use Document
                        </button>
                        <a
                          href={doc.fileUrl ? (doc.fileUrl.startsWith('http') ? doc.fileUrl : 'http://localhost:5000' + doc.fileUrl) : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 hover:bg-brand-100 hover:border-brand-300 transition text-xs font-bold shadow-sm"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 transition text-xs font-bold shadow-sm disabled:opacity-50"
                        >
                          {deletingId === doc.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
