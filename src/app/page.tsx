'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  toUiCategory,
  toUiRole,
  toUiSeverity,
} from '@/adapters/domain.adapter';
import { mapPublicIssueToUiIncident } from '@/adapters/issue.adapter';
import type {
  BackendCategoryCode,
  BackendIssueStatus,
  BackendMediaStage,
  BackendRoleName,
} from '@/contracts/api.types';
import { aiApi, type ClassifyImageResultDto } from '@/features/ai/api';
import { authApi, type AuthUserDto } from '@/features/auth/api';
import { issuesApi } from '@/features/issues/api';
import { masterDataApi } from '@/features/master-data/api';
import { mediaApi } from '@/features/media/api';
import {
  apiClient,
  getStoredToken,
  subscribeTokenChange,
} from '@/shared/api-client';

const TEST_FLOWS = [
  {
    id: 'Flow 0',
    stage: 'Giai đoạn 0 & 3',
    title: 'Healthcheck & Demo Role Switcher (CITIZEN / STAFF / VOLUNTEER)',
    endpoints:
      'GET /health, POST /auth/demo-switch, POST /auth/login, GET /auth/me, PATCH /auth/me/preferences, GET /roles, GET /auth/staff-check',
  },
  {
    id: 'Flow 1',
    stage: 'Giai đoạn 4 & 6 (R03)',
    title:
      'Danh mục, Tìm kiếm quanh tôi (nearby) & Chi tiết công khai (zero-PII)',
    endpoints:
      'GET /categories, GET /departments, GET /issues/nearby, GET /issues, GET /issues/:publicId',
  },
  {
    id: 'Flow 2',
    stage: 'Giai đoạn 4, 5 & 7 (R01, R02)',
    title:
      'Dân gửi 3 bước + Upload Cloudinary + AI gợi ý + "Tôi cũng gặp" + Phản ánh của tôi',
    endpoints:
      'POST /media/upload, POST /ai/classify-image, POST /issues, POST /issues/:publicId/me-too, GET /issues/mine',
  },
  {
    id: 'Flow 3',
    stage: 'Giai đoạn 8 (R04)',
    title: 'Cán bộ điều phối: Triage, Reject, Gộp trùng (Merge) & Giao bộ phận',
    endpoints:
      'GET /staff/issues, PATCH .../triage, PATCH .../reject, POST .../merge, PATCH .../assign',
  },
  {
    id: 'Flow 4',
    stage: 'Giai đoạn 9',
    title: 'Thanh niên tình nguyện nhận & nộp kết quả xác minh hiện trường',
    endpoints:
      'POST /staff/issues/:publicId/verifications, GET /volunteer/verifications, POST .../claim, POST .../submit',
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
    title:
      'Dân đánh giá hài lòng / chưa hài lòng & Cán bộ mở lại hồ sơ (REOPENED)',
    endpoints:
      'POST /issues/:publicId/feedback, PATCH /staff/feedbacks/:publicId/review',
  },
] as const;

export default function TestHarnessHomePage() {
  const [output, setOutput] = useState<string>('Chưa thực hiện thao tác nào');
  const [currentUser, setCurrentUser] = useState<AuthUserDto | null>(null);
  const [phone, setPhone] = useState('0901000001');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<BackendMediaStage>('BEFORE');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string>(
    'https://res.cloudinary.com/demo/image/upload/v1/ngap-nuoc.jpg',
  );
  const [aiHint, setAiHint] = useState<string>('');
  const [aiResult, setAiResult] = useState<ClassifyImageResultDto | null>(null);
  const [nearbyLat, setNearbyLat] = useState('10.9512');
  const [nearbyLng, setNearbyLng] = useState('106.8245');
  const [nearbyRadius, setNearbyRadius] = useState('500');
  const [forDuplicateCheck, setForDuplicateCheck] = useState(false);
  const [listStatus, setListStatus] = useState<string>('');
  const [listSearch, setListSearch] = useState('');
  const [issueLookup, setIssueLookup] = useState('HT-2026-001');
  const [loading, setLoading] = useState(false);

  const hasToken = useSyncExternalStore(
    subscribeTokenChange,
    () => Boolean(getStoredToken()),
    () => false,
  );

  async function runAction(fn: () => Promise<unknown>) {
    setLoading(true);
    try {
      const res = await fn();
      setOutput(JSON.stringify(res, null, 2));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoSwitch(
    role: Extract<BackendRoleName, 'CITIZEN' | 'STAFF' | 'VOLUNTEER'>,
  ) {
    await runAction(async () => {
      const res = await authApi.demoSwitch(role);
      if (res.success) {
        setCurrentUser(res.data.user);
      }
      return res;
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const res = await authApi.login(phone);
      if (res.success) {
        setCurrentUser(res.data.user);
      }
      return res;
    });
  }

  async function handleFetchMe() {
    await runAction(async () => {
      const res = await authApi.me();
      if (res.success) {
        setCurrentUser(res.data);
      }
      return res;
    });
  }

  async function handleToggleLargeText() {
    const next = !(currentUser?.largeTextMode ?? false);
    await runAction(async () => {
      const res = await authApi.updatePreferences(next);
      if (res.success) {
        setCurrentUser(res.data);
      }
      return res;
    });
  }

  function handleLogout() {
    authApi.logout();
    setCurrentUser(null);
    setOutput('Đã xóa token khỏi localStorage.');
  }

  async function handleUploadMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setOutput('Vui lòng chọn file ảnh trước khi upload.');
      return;
    }
    await runAction(async () => {
      const res = await mediaApi.upload(selectedFile, uploadStage);
      if (res.success) {
        setUploadedUrl(res.data.url);
        setAiImageUrl(res.data.url);
      }
      return res;
    });
  }

  async function handleClassifyImage(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const res = await aiApi.classifyImage(aiImageUrl, aiHint);
      if (res.success) {
        setAiResult(res.data);
      }
      return res;
    });
  }

  return (
    <main
      className={`mx-auto max-w-4xl p-6 font-sans ${
        currentUser?.largeTextMode ? 'text-base' : 'text-sm'
      }`}
    >
      <h1 className="text-xl font-bold">
        NaiSee API Test Harness &amp; Integration Kit
      </h1>
      <p className="mt-1 text-gray-600">
        Giao diện tối giản dùng để kiểm chứng API backend &amp; adapter theo từng
        giai đoạn (xem <code>INTEGRATION.md</code>).
      </p>

      {/* Flow 0: Healthcheck + Auth + Demo Role Switcher + RBAC */}
      <section className="mt-6 space-y-4 rounded border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">
              Flow 0 (Giai đoạn 0 &amp; 3) — Healthcheck, Auth &amp; RBAC
            </div>
            <div className="text-xs text-gray-500">
              API:{' '}
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}{' '}
              | Token: {hasToken ? 'Đã lưu' : 'Chưa có'}
              {currentUser &&
                ` | User: ${currentUser.fullName} (BE: ${currentUser.role} / UI: ${toUiRole(currentUser.role)})`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction(() => apiClient.get('/health'))}
              disabled={loading}
              className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
            >
              Test /health
            </button>
            <button
              type="button"
              onClick={() => runAction(() => authApi.getRoles())}
              disabled={loading}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              GET /roles
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="font-medium">Demo Switch:</span>
          <button
            type="button"
            onClick={() => handleDemoSwitch('CITIZEN')}
            disabled={loading}
            className="rounded border px-2.5 py-1 hover:bg-gray-100"
          >
            CITIZEN (0901000001)
          </button>
          <button
            type="button"
            onClick={() => handleDemoSwitch('STAFF')}
            disabled={loading}
            className="rounded border px-2.5 py-1 hover:bg-gray-100"
          >
            STAFF (0901000002)
          </button>
          <button
            type="button"
            onClick={() => handleDemoSwitch('VOLUNTEER')}
            disabled={loading}
            className="rounded border px-2.5 py-1 hover:bg-gray-100"
          >
            VOLUNTEER (0901000003)
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="rounded border px-2.5 py-1 text-red-600"
          >
            Đăng xuất
          </button>
        </div>

        <form
          onSubmit={handleLogin}
          className="flex flex-wrap items-center gap-2 border-t pt-3"
        >
          <label className="font-medium" htmlFor="phone-input">
            SĐT Login:
          </label>
          <input
            id="phone-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded border px-2 py-1"
            placeholder="0901000001"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded border px-3 py-1"
          >
            POST /auth/login
          </button>
          <button
            type="button"
            onClick={handleFetchMe}
            disabled={loading}
            className="rounded border px-3 py-1"
          >
            GET /auth/me
          </button>
          <label className="ml-2 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={currentUser?.largeTextMode ?? false}
              onChange={handleToggleLargeText}
              disabled={loading || !hasToken}
            />
            <span>Chế độ chữ lớn (largeTextMode)</span>
          </label>
          <button
            type="button"
            onClick={() => runAction(() => authApi.staffCheck())}
            disabled={loading}
            className="rounded border px-3 py-1"
          >
            Test RBAC STAFF-only
          </button>
        </form>
      </section>

      {/* Flow 1A & Flow 2 Bước 1: Master Data + Cloudinary Upload */}
      <section className="mt-6 space-y-4 rounded border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">
            Giai đoạn 4 — Master Data &amp; Upload Ảnh Cloudinary
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction(() => masterDataApi.getCategories())}
              disabled={loading}
              className="rounded border px-3 py-1"
            >
              GET /categories
            </button>
            <button
              type="button"
              onClick={() => runAction(() => masterDataApi.getDepartments())}
              disabled={loading}
              className="rounded border px-3 py-1"
            >
              GET /departments (STAFF)
            </button>
          </div>
        </div>

        <form
          onSubmit={handleUploadMedia}
          className="flex flex-wrap items-center gap-2 border-t pt-3"
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <select
            value={uploadStage}
            onChange={(e) =>
              setUploadStage(e.target.value as BackendMediaStage)
            }
            className="rounded border px-2 py-1"
          >
            <option value="BEFORE">BEFORE (cho phép chưa login)</option>
            <option value="VERIFICATION">VERIFICATION (TNV / Cán bộ)</option>
            <option value="AFTER">AFTER (chỉ Cán bộ)</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          >
            POST /media/upload
          </button>
        </form>

        {uploadedUrl && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs">
              Cloudinary URL:{' '}
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                {uploadedUrl}
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uploadedUrl}
              alt="Cloudinary upload preview"
              className="max-h-40 rounded border object-contain"
            />
          </div>
        )}
      </section>

      {/* Giai đoạn 5: AI Classify Image */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 5 — AI Gợi ý Phân loại Ảnh (POST /ai/classify-image)
        </div>
        <form
          onSubmit={handleClassifyImage}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            value={aiImageUrl}
            onChange={(e) => setAiImageUrl(e.target.value)}
            placeholder="URL ảnh (tự điền sau khi upload)"
            className="min-w-72 flex-1 rounded border px-2 py-1 text-xs"
          />
          <input
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            placeholder="Gợi ý thêm (VD: ổ gà, ngập nước...)"
            className="rounded border px-2 py-1 text-xs"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          >
            Phân tích AI
          </button>
        </form>

        {aiResult && (
          <div className="rounded bg-gray-50 p-2.5 text-xs">
            <div>
              Gợi ý: <strong>{aiResult.categoryName}</strong> (BE:{' '}
              <code>{aiResult.categoryCode}</code> / UI:{' '}
              <code>
                {toUiCategory(aiResult.categoryCode as BackendCategoryCode)}
              </code>
              ) | Ưu tiên: <code>{aiResult.suggestedPriority}</code> (UI:{' '}
              <code>{toUiSeverity(aiResult.suggestedPriority)}</code>) | Độ tin
              cậy: {Math.round(aiResult.confidence * 100)}% |{' '}
              {aiResult.isMocked ? 'Rule fallback' : 'Vision API'}
            </div>
            <div className="mt-1 text-gray-600">
              Tiêu đề gợi ý: {aiResult.suggestedTitle}
            </div>
          </div>
        )}
      </section>

      {/* Giai đoạn 6: Nearby, List & Detail Public (R03) */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 6 — Flow 1: Quanh tôi (nearby), Danh sách &amp; Chi tiết
          Công khai (zero-PII)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={nearbyLat}
            onChange={(e) => setNearbyLat(e.target.value)}
            placeholder="Lat"
            className="w-28 rounded border px-2 py-1 text-xs"
          />
          <input
            value={nearbyLng}
            onChange={(e) => setNearbyLng(e.target.value)}
            placeholder="Lng"
            className="w-28 rounded border px-2 py-1 text-xs"
          />
          <input
            value={nearbyRadius}
            onChange={(e) => setNearbyRadius(e.target.value)}
            placeholder="Radius (m)"
            className="w-24 rounded border px-2 py-1 text-xs"
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={forDuplicateCheck}
              onChange={(e) => setForDuplicateCheck(e.target.checked)}
            />
            <span>forDuplicateCheck (R01)</span>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                issuesApi.getNearby({
                  lat: Number(nearbyLat),
                  lng: Number(nearbyLng),
                  radiusMeters: Number(nearbyRadius),
                  forDuplicateCheck,
                }),
              )
            }
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          >
            GET /issues/nearby
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <select
            value={listStatus}
            onChange={(e) => setListStatus(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="VERIFYING">VERIFYING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Tìm theo mã / tiêu đề / địa chỉ..."
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                issuesApi.list({
                  page: 1,
                  limit: 10,
                  status: (listStatus || undefined) as
                    | BackendIssueStatus
                    | undefined,
                  search: listSearch || undefined,
                }),
              )
            }
            className="rounded border px-3 py-1"
          >
            GET /issues
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            value={issueLookup}
            onChange={(e) => setIssueLookup(e.target.value)}
            placeholder="publicId (UUID) hoặc code (HT-2026-001)"
            className="min-w-64 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction(() => issuesApi.getDetail(issueLookup))}
            className="rounded border px-3 py-1"
          >
            GET /issues/:id (Raw BE)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(async () => {
                const res = await issuesApi.getDetail(issueLookup);
                if (!res.success) return res;
                return {
                  adaptedUiIncident: mapPublicIssueToUiIncident(res.data),
                };
              })
            }
            className="rounded border px-3 py-1"
          >
            Xem bản Adapter UI
          </button>
        </div>
      </section>

      {/* Output console */}
      <section className="mt-6 rounded border p-4">
        <div className="font-semibold">API Response Output</div>
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-gray-100 p-3 text-xs">
          {output}
        </pre>
      </section>

      {/* Bản đồ các Flow thực hành */}
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
