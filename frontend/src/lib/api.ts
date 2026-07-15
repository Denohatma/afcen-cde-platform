const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export interface DashboardStats {
  projects: number;
  pending_review: number;
  open_flags: number;
  published: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  source_id: string;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  code: string;
  title: string;
  state: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  deliverable_id: string;
  version_number: number;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  extraction_confirmed: boolean;
  created_at: string;
}

export interface Flag {
  id: string;
  version_id: string;
  extraction_id: string | null;
  deliverable_id: string;
  check_type: string;
  check_id: string;
  severity: string;
  title: string;
  description: string;
  chain: Record<string, unknown> | null;
  status: string;
  resolved_by: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Extraction {
  id: string;
  version_id: string;
  metric: string;
  value: number;
  unit: string;
  source_location: string;
  confirmed: boolean;
  confirmed_by: string | null;
  created_at: string;
}

export const api = {
  dashboard: {
    stats: () => request<DashboardStats>("/dashboard/stats"),
  },
  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { name: string; description: string; source_id?: string }) =>
      request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    export: (id: string) =>
      fetch(`${API_BASE}/projects/${id}/export`, { method: "POST" }),
  },
  deliverables: {
    list: (projectId: string) => request<Deliverable[]>(`/projects/${projectId}/deliverables`),
    get: (id: string) => request<Deliverable>(`/deliverables/${id}`),
    create: (projectId: string, data: { code: string; title: string; due_date?: string }) =>
      request<Deliverable>(`/projects/${projectId}/deliverables`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    uploadVersion: async (deliverableId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/deliverables/${deliverableId}/versions`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return res.json() as Promise<Version>;
    },
    transition: (id: string, data: { to_state: string; actor: string; reason?: string }) =>
      request<Deliverable>(`/deliverables/${id}/transition`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    versions: (deliverableId: string) => request<Version[]>(`/deliverables/${deliverableId}/versions`),
    fileUrl: (versionId: string) => `${API_BASE}/versions/${versionId}/file`,
  },
  flags: {
    list: (deliverableId: string, versionId?: string) => {
      const params = versionId ? `?version_id=${versionId}` : "";
      return request<Flag[]>(`/deliverables/${deliverableId}/flags${params}`);
    },
    resolve: (id: string, data: { status: string; resolved_by: string; resolution_note: string }) =>
      request<Flag>(`/flags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  extractions: {
    list: (versionId: string) => request<Extraction[]>(`/versions/${versionId}/extractions`),
    add: (versionId: string, data: { metric: string; value: number; unit: string; source_location: string }) =>
      request<Extraction>(`/versions/${versionId}/extractions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    confirm: (versionId: string, data: { extraction_ids: string[]; confirmed_by: string }) =>
      request<Record<string, unknown>>(`/versions/${versionId}/extractions/confirm`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  versions: {
    list: (deliverableId: string) =>
      request<Version[]>(`/deliverables/${deliverableId}/versions`),
  },
  benchmarks: {
    validate: () => request<Record<string, unknown>>("/benchmarks/validate"),
    sources: () => request<Record<string, unknown>>("/benchmarks/sources"),
    list: (metric?: string) => {
      const params = metric ? `?metric=${metric}` : "";
      return request<Record<string, unknown>[]>(`/benchmarks/list${params}`);
    },
    check: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/benchmarks/check", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
