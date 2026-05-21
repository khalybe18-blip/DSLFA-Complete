/**
 * useClassrooms — data hook for classroom operations.
 * Wraps all /api/v1/classrooms calls and exposes loading/error state.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const BASE = `${API}/api/v1/classrooms`;

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const fetchClassrooms = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/`);
      setClassrooms(res.data.classrooms || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClassrooms(); }, [fetchClassrooms]);

  const createClassroom = useCallback(async (payload) => {
    const res = await axios.post(`${BASE}/create`, payload);
    setClassrooms(prev => [res.data.classroom, ...prev]);
    return res.data.classroom;
  }, []);

  const joinClassroom = useCallback(async (class_code) => {
    const res = await axios.post(`${BASE}/join`, { class_code });
    setClassrooms(prev => [res.data.classroom, ...prev]);
    return res.data;
  }, []);

  const getResources = useCallback(async (class_id) => {
    const res = await axios.get(`${BASE}/${class_id}/resources`);
    return res.data;
  }, []);

  const getStudents = useCallback(async (class_id) => {
    const res = await axios.get(`${BASE}/${class_id}/students`);
    return res.data.students;
  }, []);

  const createQuiz = useCallback(async (class_id, payload) => {
    const res = await axios.post(`${BASE}/${class_id}/quizzes`, payload);
    return res.data.quiz;
  }, []);

  const getQuizzes = useCallback(async (class_id) => {
    const res = await axios.get(`${BASE}/${class_id}/quizzes`);
    return res.data.quizzes;
  }, []);

  const deleteQuiz = useCallback(async (class_id, quiz_id) => {
    await axios.delete(`${BASE}/${class_id}/quizzes/${quiz_id}`);
  }, []);

  const getQuiz = useCallback(async (class_id, quiz_id) => {
    const res = await axios.get(`${BASE}/${class_id}/quizzes/${quiz_id}`);
    return res.data.quiz;
  }, []);

  const uploadResource = useCallback(async (class_id, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post(`${BASE}/${class_id}/resources/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.document;
  }, []);

  const getAnnouncements = useCallback(async (class_id) => {
    const res = await axios.get(`${BASE}/${class_id}/announcements`);
    return res.data.announcements;
  }, []);

  const postAnnouncement = useCallback(async (class_id, content) => {
    const res = await axios.post(`${BASE}/${class_id}/announcements`, { content });
    return res.data.announcement;
  }, []);

  const getAnalytics = useCallback(async (class_id) => {
    const res = await axios.get(`${API}/api/teacher/analytics/${class_id}`);
    return res.data;
  }, []);

  const getSubmissions = useCallback(async (quiz_id) => {
    const res = await axios.get(`${API}/api/teacher/submissions/${quiz_id}`);
    return res.data;
  }, []);

  const toggleVisibility = useCallback(async (doc_id, is_visible) => {
    const res = await axios.patch(`${API}/api/documents/${doc_id}/visibility`, { is_visible });
    return res.data;
  }, []);

  const deleteDocument = useCallback(async (doc_id) => {
    await axios.delete(`${API}/api/documents/${doc_id}`);
  }, []);

  return {
    classrooms, loading, error,
    fetchClassrooms,
    refresh: fetchClassrooms,
    createClassroom, joinClassroom,
    getResources, getStudents,
    createQuiz, getQuizzes, getQuiz, deleteQuiz,
    uploadResource,
    getAnnouncements, postAnnouncement,
    getAnalytics, getSubmissions, toggleVisibility, deleteDocument,
  };
}
