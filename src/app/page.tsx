'use client';

import { useState } from 'react';
import { apiClient, getStoredToken } from '@/shared/api-client';

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
        Giao diện tối giản dùng để kiểm thử API backend theo từng giai đoạn.
      </p>

      <section className="mt-6 rounded border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">
              Giai đoạn 0 — Kiểm tra kết nối Backend & PostgreSQL
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
    </main>
  );
}
