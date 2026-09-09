import { supabase } from './supabase';

const BACKEND_HOST = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${BACKEND_HOST}:8001`;

/**
 * Makes an authenticated request to the FastAPI backend.
 * Automatically attaches the Supabase JWT as a Bearer token.
 */
export async function callBackendWithAuth(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Upload a syllabus (file or text) and generate a study plan.
 */
export async function generateStudyPlan({
  file,
  subjectName,
  examDate,
  weeklyStudyHours,
  syllabusText,
}) {
  const formData = new FormData();
  formData.append('subject_name', subjectName);
  formData.append('exam_date', examDate);
  formData.append('weekly_study_hours', String(weeklyStudyHours));

  if (file) {
    formData.append('file', file);
  }
  if (syllabusText) {
    formData.append('syllabus_text', syllabusText);
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${BACKEND_URL}/api/v1/generate-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch all subjects for the current user.
 */
export async function fetchSubjects() {
  return callBackendWithAuth('/api/v1/subjects');
}

/**
 * Fetch the study plan for a specific subject.
 */
export async function fetchPlan(subjectId) {
  return callBackendWithAuth(`/api/v1/subjects/${subjectId}/plan`);
}

export async function updatePlan(subjectId, planData) {
  return callBackendWithAuth(`/api/v1/subjects/${subjectId}/plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ plan_data: planData })
  });
}

/**
 * Delete a specific subject by ID.
 */
export async function deleteSubject(subjectId) {
  return callBackendWithAuth(`/api/v1/subjects/${subjectId}`, {
    method: 'DELETE',
  });
}

