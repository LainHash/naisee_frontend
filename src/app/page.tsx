'use client';

import { useState } from 'react';
import { apiClient, getStoredToken } from '@/shared/api-client';

/**
 * Danh sách các flow thực hành sẽ được bổ sung dần theo từng giai đoạn triển khai Backend.
 * Mục tiêu: chỉ dùng form/button tối giản để test API contract & 5 luồng E2E (UI đẹp đã có sẵn riêng).
 */
const TEST_FLOWS = [
  {
    id: 'Flow 0',
    stage: 'Giai đoạn 0 & 3',
    title: 'Healthcheck & Demo Role Switcher (CITIZEN / STAFF / VOLUNTEER)',
    endpoints: 'GET /health, POST /auth/demo-switch, GET /auth/me, PATCH /auth/me/preferences',
  },
  {
    id: 'Flow 1',
    stage: 'Giai đoạn 4 & 6 (R03)',
    title: 'Danh mục, Tìm kiếm quanh tôi (nearby) & Chi tiết công khai (zero-PII)',
    endpoints: 'GET /categories, GET /issues/nearby, GET /issues, GET /issues/:publicId',
  },
  {
    id: 'Flow 2',
    stage: 'Giai đoạn 4, 5 & 7 (R01, R02)',
    title: 'Dân gửi 3 bước + Upload ảnh + AI gợi ý + "Tôi cũng gặp" + Phản ánh của tôi',
    endpoints: 'POST /media/upload, POST /ai/classify-image, POST /issues, POST /issues/:publicId/me-too, GET /issues/mine',
  },
  {
    id: 'Flow 3',
    stage: 'Giai đoạn 8 (R04)',
    title: 'Cán bộ điều phối: Triage, Gộp trùng (Merge) & Giao bộ phận (Assign)',
    endpoints: 'GET /staff/issues, PATCH .../triage, POST .../merge, PATCH .../assign',
  },
  {
    id: 'Flow 4',
    stage: 'Giai đoạn 9',
    title: 'Thanh niên tình nguyện nhận & nộp kết quả xác minh hiện trường',
    endpoints: 'POST /staff/issues/:publicId/verifications, GET /volunteer/verifications, POST .../claim, POST .../submit',
  },
  {
    id: 'Flow 5',
    stage: 'Giai đoạn 10 (R05)',
    title: 'Cán bộ nghiệm thu (bắt buộc ảnh AFTER) & Dashboard thống kê',
    endpoints: 'PATCH /staff/issues/:publicId/resolve, GET /staff/dashboard',
  },
  {
    id: 'Flow 6',
    stage: 'Giai đoạn 11 (R06)',
    title: 'Dân đánh giá hài lòng / chưa hài lòng & Cán bộ mở lại hồ sơ (REOPENED)',
    endpoints: 'POST /issues/:publicId/feedback, PATCH /staff/feedbacks/:publicId/review',
  },
] as const;

export default function TestHarnessHomePage() {
  const [result, setResult] = useState<string>('Chưa kiểm tra');
  const [loading, setLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    try {
      const res = await apiClient.get<{ status: string; database: string }>(
        '/health',
      );
      setResult(JSON.stringify(res, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const hasToken = typeof window !== 'undefined' && Boolean(getStoredToken());

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans text-sm">
      <h1 className="text-xl font-bold">NaiSee API Test Harness</h1>
      <p className="mt-1 text-gray-600">
        Giao diện tối giản dùng để kiểm thử API backend theo từng giai đoạn (không
        đầu tư styling).
      </p>

      {/* Flow 0: Healthcheck */}
      <section className="mt-6 rounded border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">
              Flow 0 (Giai đoạn 0) — Kiểm tra kết nối Backend & PostgreSQL
            </div>
            <div className="text-xs text-gray-500">
              API Base:{' '}
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}{' '}
              | Token: {hasToken ? 'Đã lưu' : 'Chưa có'}
            </div>
          </div>
          <button
            type="button"
            onClick={checkHealth}
            disabled={loading}
            className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50"
          >
            {loading ? 'Đang kiểm tra...' : 'Test /health'}
          </button>
        </div>

        <pre className="mt-3 overflow-auto rounded bg-gray-100 p-3 text-xs">
          {result}
        </pre>
      </section>

      {/* Chú thích bản đồ các Flow thực hành trên Test Harness */}
      <section className="mt-6 rounded border p-4">
        <h2 className="font-semibold">
          Bản đồ các Flow thực hành trên Frontend Test Harness
        </h2>
        <ul className="mt-3 space-y-2">
          {TEST_FLOWS.map((flow) => (
            <li key={flow.id} className="rounded bg-gray-50 p-2.5">
              <div className="font-medium">
                {flow.id} [{flow.stage}]: {flow.title}
              </div>
              <div className="mt-0.5 font-mono text-xs text-gray-600">
                {flow.endpoints}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
