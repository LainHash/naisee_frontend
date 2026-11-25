'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  STAGE_LABEL_VI,
  toUiCategory,
  toUiRole,
  toUiSeverity,
} from '@/adapters/domain.adapter';
import { mapPublicIssueToUiIncident } from '@/adapters/issue.adapter';
import type {
  BackendCategoryCode,
  BackendIssueStatus,
  BackendMediaStage,
  BackendPriority,
  BackendRoleName,
  BackendVerificationOutcome,
} from '@/contracts/api.types';
import { aiApi, type ClassifyImageResultDto } from '@/features/ai/api';
import { authApi, type AuthUserDto } from '@/features/auth/api';
import { dashboardApi } from '@/features/dashboard/api';
import { feedbackApi } from '@/features/feedback/api';
import { issuesApi, type MyIssueItemDto } from '@/features/issues/api';
import { masterDataApi } from '@/features/master-data/api';
import { mediaApi } from '@/features/media/api';
import { staffApi, type StaffIssueItemDto } from '@/features/staff/api';
import {
  verificationsApi,
  type VerificationTaskDto,
} from '@/features/verifications/api';
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
  const [createCategoryCode, setCreateCategoryCode] = useState('ROAD_SURFACE');
  const [createTitle, setCreateTitle] = useState('Ổ gà mới tại đường 30/4');
  const [createDesc, setCreateDesc] = useState('Ngập nước và khó đi vào buổi tối');
  const [createLat, setCreateLat] = useState('10.9521');
  const [createLng, setCreateLng] = useState('106.8251');
  const [createAddress, setCreateAddress] = useState(
    'Số 88 đường 30 Tháng 4, Phường Trấn Biên',
  );
  const [meTooTarget, setMeTooTarget] = useState('HT-2026-001');
  const [myIssues, setMyIssues] = useState<MyIssueItemDto[]>([]);
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('');
  const [staffOverdueOnly, setStaffOverdueOnly] = useState(false);
  const [staffIssues, setStaffIssues] = useState<StaffIssueItemDto[]>([]);
  const [staffTargetId, setStaffTargetId] = useState('HT-2026-001');
  const [staffPriority, setStaffPriority] = useState<BackendPriority>('HIGH');
  const [staffIntakeNote, setStaffIntakeNote] = useState('');
  const [staffRejectReason, setStaffRejectReason] = useState(
    'Không thuộc phạm vi quản lý của phường',
  );
  const [staffDeptCode, setStaffDeptCode] = useState('ROAD_MAINTENANCE');
  const [staffSlaHours, setStaffSlaHours] = useState('48');
  const [staffMergeSources, setStaffMergeSources] = useState('');
  const [verifyInstruction, setVerifyInstruction] = useState(
    'Kiểm tra thực tế tại hiện trường và chụp ảnh đối chiếu',
  );
  const [volunteerTasks, setVolunteerTasks] = useState<VerificationTaskDto[]>(
    [],
  );
  const [verifyTargetId, setVerifyTargetId] = useState('');
  const [verifyOutcome, setVerifyOutcome] =
    useState<BackendVerificationOutcome>('STILL_EXISTS');
  const [verifyNote, setVerifyNote] = useState(
    'Đã có mặt tại hiện trường, ghi nhận đúng thực tế phản ánh',
  );
  const [verifyImageUrl, setVerifyImageUrl] = useState(
    'https://res.cloudinary.com/demo/image/upload/v1/verify-field.jpg',
  );
  const [resolveNote, setResolveNote] = useState(
    'Đơn vị chuyên trách đã hoàn thành khắc phục sự cố và vệ sinh sạch khu vực.',
  );
  const [resolveAfterUrl, setResolveAfterUrl] = useState('');
  const [feedbackSatisfied, setFeedbackSatisfied] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState(
    'Sau xử lý vẫn còn đọng nước khi mưa lớn',
  );
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
        setCreateCategoryCode(res.data.categoryCode);
        setCreateTitle(res.data.suggestedTitle);
      }
      return res;
    });
  }

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();
    const imageUrl = uploadedUrl ?? aiImageUrl;
    await runAction(() =>
      issuesApi.create({
        categoryCode: createCategoryCode,
        title: createTitle,
        description: createDesc || undefined,
        latitude: Number(createLat),
        longitude: Number(createLng),
        addressText: createAddress,
        imageUrls: [imageUrl],
        ...(aiResult
          ? {
              aiSuggestedCategoryPublicId: aiResult.categoryPublicId,
              aiConfidence: aiResult.confidence,
            }
          : {}),
      }),
    );
  }

  async function handleMeToo() {
    await runAction(() =>
      issuesApi.meToo(meTooTarget, {
        description: 'Tôi cũng gặp sự cố này tại cùng khu vực.',
        latitude: Number(createLat),
        longitude: Number(createLng),
        addressText: createAddress,
      }),
    );
  }

  async function handleFetchMyIssues() {
    await runAction(async () => {
      const res = await issuesApi.getMine({ page: 1, limit: 20 });
      if (res.success) {
        setMyIssues(res.data);
      }
      return res;
    });
  }

  async function handleFetchStaffIssues() {
    await runAction(async () => {
      const res = await staffApi.listIssues({
        page: 1,
        limit: 20,
        status: (staffStatusFilter || undefined) as
          | BackendIssueStatus
          | undefined,
        overdue: staffOverdueOnly || undefined,
      });
      if (res.success) {
        setStaffIssues(res.data);
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

      {/* Giai đoạn 7: Flow 2 — Citizen 3-Step Report, Me-Too & My Issues (R01, R02) */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 7 — Flow 2: Gửi phản ánh 3 bước, &quot;Tôi cũng gặp&quot;
          &amp; Phản ánh của tôi (R01, R02)
        </div>

        <form onSubmit={handleCreateIssue} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={createCategoryCode}
              onChange={(e) => setCreateCategoryCode(e.target.value)}
              className="rounded border px-2 py-1 text-xs"
            >
              <option value="ROAD_SURFACE">ROAD_SURFACE (Mặt đường)</option>
              <option value="STREET_LIGHT">STREET_LIGHT (Đèn đường)</option>
              <option value="WASTE">WASTE (Rác thải)</option>
              <option value="FLOODING">FLOODING (Ngập nước)</option>
              <option value="OTHER">OTHER (Khác)</option>
            </select>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Tiêu đề sự cố"
              className="min-w-64 flex-1 rounded border px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={createLat}
              onChange={(e) => setCreateLat(e.target.value)}
              placeholder="Lat"
              className="w-28 rounded border px-2 py-1 text-xs"
            />
            <input
              value={createLng}
              onChange={(e) => setCreateLng(e.target.value)}
              placeholder="Lng"
              className="w-28 rounded border px-2 py-1 text-xs"
            />
            <input
              value={createAddress}
              onChange={(e) => setCreateAddress(e.target.value)}
              placeholder="Địa chỉ"
              className="min-w-64 flex-1 rounded border px-2 py-1 text-xs"
            />
          </div>
          <input
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Mô tả bổ sung"
            className="w-full rounded border px-2 py-1 text-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runAction(() =>
                  issuesApi.getNearby({
                    lat: Number(createLat),
                    lng: Number(createLng),
                    radiusMeters: 150,
                    forDuplicateCheck: true,
                  }),
                )
              }
              className="rounded border px-3 py-1"
            >
              Bước 2: Check trùng (150m)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
            >
              Bước 3B: POST /issues (Gửi mới)
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            value={meTooTarget}
            onChange={(e) => setMeTooTarget(e.target.value)}
            placeholder="Mã/publicId hồ sơ trùng (VD: HT-2026-001)"
            className="w-56 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={handleMeToo}
            className="rounded border px-3 py-1"
          >
            Bước 3A: Tôi cũng gặp (POST /me-too)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleFetchMyIssues}
            className="rounded border px-3 py-1"
          >
            GET /issues/mine (R02)
          </button>
        </div>

        {myIssues.length > 0 && (
          <div className="space-y-1 border-t pt-2 text-xs">
            <div className="font-medium">
              Phản ánh của tôi ({myIssues.length}):
            </div>
            {myIssues.map((item) => (
              <div key={item.publicId} className="rounded bg-gray-50 p-2">
                <strong>{item.code}</strong> — {item.title} |{' '}
                <span>
                  {STAGE_LABEL_VI[item.stage]} ({item.status} / {item.stage})
                </span>{' '}
                | {item.reportCount} lượt | [{item.myReportTypes.join(', ')}]
                {item.intakeNote && (
                  <div className="text-gray-600">
                    Ghi chú tiếp nhận: {item.intakeNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Giai đoạn 8: Flow 3 — Staff Triage, Reject, Merge & Assign (R04) */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 8 — Flow 3: Cán bộ Điều phối (Triage, Reject, Merge &amp;
          Assign)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={staffStatusFilter}
            onChange={(e) => setStaffStatusFilter(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="VERIFYING">VERIFYING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={staffOverdueOnly}
              onChange={(e) => setStaffOverdueOnly(e.target.checked)}
            />
            <span>Quá hạn (overdue=true)</span>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={handleFetchStaffIssues}
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          >
            GET /staff/issues
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            value={staffTargetId}
            onChange={(e) => setStaffTargetId(e.target.value)}
            placeholder="Mã/publicId hồ sơ (VD: HT-2026-001)"
            className="w-52 rounded border px-2 py-1 text-xs"
          />
          <select
            value={staffPriority}
            onChange={(e) =>
              setStaffPriority(e.target.value as BackendPriority)
            }
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <input
            value={staffIntakeNote}
            onChange={(e) => setStaffIntakeNote(e.target.value)}
            placeholder="Ghi chú tiếp nhận / yêu cầu bổ sung"
            className="min-w-48 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.triage(staffTargetId, {
                  priority: staffPriority,
                  intakeNote: staffIntakeNote || undefined,
                }),
              )
            }
            className="rounded border px-2.5 py-1 text-xs"
          >
            PATCH /triage (Tiếp nhận)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.triage(staffTargetId, {
                  needsInformation: true,
                  intakeNote:
                    staffIntakeNote || 'Vui lòng chụp rõ hơn vị trí sự cố.',
                }),
              )
            }
            className="rounded border px-2.5 py-1 text-xs"
          >
            Yêu cầu bổ sung
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            value={staffRejectReason}
            onChange={(e) => setStaffRejectReason(e.target.value)}
            placeholder="Lý do từ chối"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.reject(staffTargetId, {
                  rejectionReason: staffRejectReason,
                }),
              )
            }
            className="rounded border px-2.5 py-1 text-xs text-red-600"
          >
            PATCH /reject
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.updatePublicReview(staffTargetId, { verified: true }),
              )
            }
            className="rounded border px-2.5 py-1 text-xs"
          >
            PATCH /public-review (verified=true)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <select
            value={staffDeptCode}
            onChange={(e) => setStaffDeptCode(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="ROAD_MAINTENANCE">ROAD_MAINTENANCE</option>
            <option value="LIGHTING">LIGHTING</option>
            <option value="ENVIRONMENT">ENVIRONMENT</option>
            <option value="DRAINAGE">DRAINAGE</option>
          </select>
          <input
            value={staffSlaHours}
            onChange={(e) => setStaffSlaHours(e.target.value)}
            placeholder="SLA (giờ)"
            className="w-24 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.assign(staffTargetId, {
                  departmentCode: staffDeptCode,
                  slaHours: Number(staffSlaHours) || 48,
                  publicReviewVerified: true,
                }),
              )
            }
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            PATCH /assign (Giao bộ phận)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            value={staffMergeSources}
            onChange={(e) => setStaffMergeSources(e.target.value)}
            placeholder="Các mã/UUID nguồn cần gộp (cách nhau dấu phẩy)"
            className="min-w-64 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.merge(staffTargetId, {
                  sourceIssuePublicIds: staffMergeSources
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }),
              )
            }
            className="rounded border px-3 py-1 text-xs"
          >
            POST /merge (Gộp trùng)
          </button>
        </div>

        {staffIssues.length > 0 && (
          <div className="space-y-1 border-t pt-2 text-xs">
            <div className="font-medium">
              Danh sách điều phối ({staffIssues.length}):
            </div>
            {staffIssues.slice(0, 8).map((item) => (
              <div
                key={item.publicId}
                className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 p-2"
              >
                <div>
                  <strong>{item.code}</strong> — {item.title} | {item.status} /{' '}
                  {item.stage} | {item.priority} | {item.reportCount} lượt
                </div>
                <button
                  type="button"
                  onClick={() => setStaffTargetId(item.code)}
                  className="rounded border px-2 py-0.5 text-[11px]"
                >
                  Chọn
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Giai đoạn 9: Flow 4 — Thanh niên Tình nguyện Xác minh Thực địa */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 9 — Flow 4: Thanh niên Tình nguyện Xác minh Thực địa
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={staffTargetId}
            onChange={(e) => setStaffTargetId(e.target.value)}
            placeholder="Mã/UUID hồ sơ"
            className="w-44 rounded border px-2 py-1 text-xs"
          />
          <input
            value={verifyInstruction}
            onChange={(e) => setVerifyInstruction(e.target.value)}
            placeholder="Hướng dẫn xác minh gửi TNV"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(async () => {
                const res = await verificationsApi.requestForIssue(
                  staffTargetId,
                  { instruction: verifyInstruction, slaHours: 24 },
                );
                if (res.success) {
                  setVerifyTargetId(res.data.publicId);
                }
                return res;
              })
            }
            className="rounded border px-3 py-1 text-xs"
          >
            STAFF: POST /verifications
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(async () => {
                const res = await verificationsApi.listVolunteerTasks();
                if (res.success) {
                  setVolunteerTasks(res.data);
                  if (!verifyTargetId && res.data[0]) {
                    setVerifyTargetId(res.data[0].publicId);
                  }
                }
                return res;
              })
            }
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            VOLUNTEER: GET /volunteer/verifications
          </button>
          <input
            value={verifyTargetId}
            onChange={(e) => setVerifyTargetId(e.target.value)}
            placeholder="Verification publicId hoặc Issue code"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() => verificationsApi.claimTask(verifyTargetId))
            }
            className="rounded border px-3 py-1 text-xs"
          >
            POST /claim (Nhận việc)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={verifyOutcome}
            onChange={(e) =>
              setVerifyOutcome(e.target.value as BackendVerificationOutcome)
            }
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="STILL_EXISTS">STILL_EXISTS</option>
            <option value="ALREADY_RESOLVED">ALREADY_RESOLVED</option>
            <option value="NOT_FOUND_OR_UNCLEAR">NOT_FOUND_OR_UNCLEAR</option>
          </select>
          <input
            value={verifyNote}
            onChange={(e) => setVerifyNote(e.target.value)}
            placeholder="Ghi chú xác minh"
            className="min-w-52 flex-1 rounded border px-2 py-1 text-xs"
          />
          <input
            value={verifyImageUrl}
            onChange={(e) => setVerifyImageUrl(e.target.value)}
            placeholder="URL ảnh VERIFICATION"
            className="min-w-52 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                verificationsApi.submitTask(verifyTargetId, {
                  outcome: verifyOutcome,
                  verifiedLatitude: 10.9512,
                  verifiedLongitude: 106.8245,
                  resultNote: verifyNote,
                  imageUrls: verifyImageUrl.trim() ? [verifyImageUrl.trim()] : [],
                }),
              )
            }
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            POST /submit (Nộp xác minh)
          </button>
        </div>

        {volunteerTasks.length > 0 && (
          <div className="space-y-1 border-t pt-2 text-xs">
            <div className="font-medium">
              Nhiệm vụ TNV ({volunteerTasks.length}):
            </div>
            {volunteerTasks.slice(0, 6).map((task) => (
              <div
                key={task.publicId}
                className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 p-2"
              >
                <div>
                  <strong>{task.issue.code}</strong> — {task.issue.title} |{' '}
                  {task.status} | {task.outcome ?? 'Chưa nộp'}
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyTargetId(task.publicId)}
                  className="rounded border px-2 py-0.5 text-[11px]"
                >
                  Chọn
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Giai đoạn 10 & 11: Flow 5 & Flow 6 — Nghiệm thu AFTER, Dashboard & Feedback / Reopen */}
      <section className="mt-6 space-y-3 rounded border p-4">
        <div className="font-semibold">
          Giai đoạn 10 &amp; 11 — Flow 5 &amp; Flow 6: Nghiệm thu AFTER, Dashboard
          &amp; Đánh giá / Mở lại
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Nội dung kết quả nghiệm thu"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <input
            value={resolveAfterUrl}
            onChange={(e) => setResolveAfterUrl(e.target.value)}
            placeholder="URL ảnh AFTER (để trống để test lỗi 400)"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.updateProgress(staffTargetId, {
                  stage: 'resolution_submitted',
                  note: resolveNote,
                }),
              )
            }
            className="rounded border px-2.5 py-1 text-xs"
          >
            PATCH /progress
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                staffApi.resolve(staffTargetId, {
                  resolutionNote: resolveNote,
                  imageUrls: resolveAfterUrl.trim()
                    ? [resolveAfterUrl.trim()]
                    : [],
                }),
              )
            }
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            PATCH /resolve (R05)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction(() => dashboardApi.getStaffDashboard())}
            className="rounded border px-3 py-1 text-xs"
          >
            GET /staff/dashboard
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction(() => dashboardApi.getPublicDashboard())}
            className="rounded border px-3 py-1 text-xs"
          >
            GET /dashboard/public
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={feedbackSatisfied}
              onChange={(e) => setFeedbackSatisfied(e.target.checked)}
            />
            <span>Hài lòng (isSatisfied)</span>
          </label>
          <input
            value={feedbackReason}
            onChange={(e) => setFeedbackReason(e.target.value)}
            placeholder="Lý do / nhận xét của người dân"
            className="min-w-56 flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                feedbackApi.submit(staffTargetId, {
                  isSatisfied: feedbackSatisfied,
                  rating: feedbackSatisfied ? 5 : 2,
                  reason: feedbackReason,
                }),
              )
            }
            className="rounded border px-3 py-1 text-xs"
          >
            CITIZEN: POST /feedback (R06)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runAction(() =>
                feedbackApi.review(staffTargetId, {
                  reviewStatus: 'REOPENED',
                  reviewNote: 'Mở lại để kiểm tra bổ sung',
                  slaHours: 24,
                }),
              )
            }
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            STAFF: PATCH /review (REOPENED)
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
