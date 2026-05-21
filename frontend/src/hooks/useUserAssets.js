import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Global cache for assets
let globalDocumentsCache = null;
let fetchPromise = null;

export const useUserAssets = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState(globalDocumentsCache || []);
  const [loading, setLoading] = useState(!globalDocumentsCache);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = useCallback(async (force = false) => {
    if (globalDocumentsCache && !force) {
      setDocuments(globalDocumentsCache);
      setLoading(false);
      return;
    }
    
    if (fetchPromise && !force) {
      setLoading(true);
      await fetchPromise;
      setDocuments(globalDocumentsCache || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPromise = axios.get(`${API_BASE}/api/documents`)
      .then(res => {
        globalDocumentsCache = res.data.documents || [];
        setDocuments(globalDocumentsCache);
        setError('');
      })
      .catch(err => {
        setError('Failed to fetch documents');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
        fetchPromise = null;
      });
      
    await fetchPromise;
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (file) => {
    if (!file) return false;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/api/documents/upload`, formData);
      await fetchDocuments(true); // Force refresh
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return false;
    try {
      await axios.delete(`${API_BASE}/api/documents/${id}`);
      await fetchDocuments(true); // Force refresh
      return true;
    } catch (err) {
      setError('Failed to delete document');
      return false;
    }
  };

  const renameDocument = async (id, newTitle) => {
    // For now, visually update or mock
    const updated = documents.map(d => d.id === id ? { ...d, title: newTitle } : d);
    setDocuments(updated);
    globalDocumentsCache = updated;
    return true;
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const lower = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lower) || 
      doc.file_type.toLowerCase().includes(lower) ||
      (doc.status && doc.status.toLowerCase().includes(lower))
    );
  }, [documents, searchQuery]);

  const personalDocs = useMemo(() => {
    return filteredDocs.filter(doc => doc.class_id === null || doc.uploader_id === user?.id);
  }, [filteredDocs, user]);
  const classDocs = useMemo(() => {
    return filteredDocs.filter(doc => doc.class_id !== null && doc.uploader_id !== user?.id);
  }, [filteredDocs, user]);


  const copyAssetToPersonalVault = async (id) => {
    try {
      const res = await axios.post(`${API_BASE}/api/documents/${id}/copy`);
      await fetchDocuments(true); // Force refresh
      return res.data.document;
    } catch (err) {
      setError('Failed to copy document to personal vault');
      return null;
    }
  };

  return {
    documents,
    filteredDocs,
    personalDocs,
    classDocs,
    loading,
    uploading,
    error,
    searchQuery,
    setSearchQuery,
    uploadDocument,
    deleteDocument,
    renameDocument,
    copyAssetToPersonalVault,
    refreshAssets: () => fetchDocuments(true),
    setError
  };
};
