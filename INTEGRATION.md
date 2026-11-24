# NaiSee Frontend Integration Guide (Contract & Half-Puzzle Kit)

Thư mục `naisee_frontend` đóng vai trò **cầu nối tích hợp (Contract + Headless SDK + Adapters + Test Harness)** giữa:
- **Backend thật:** `naisee_backend` (NestJS 12 + TypeORM, chạy tại `http://localhost:3001/api/v1`, OpenAPI JSON tại `http://localhost:3001/docs/openapi.json`).
- **Frontend UI độc lập:** dự án UI riêng của team (ví dụ cấu trúc tương tự `example/NaiSee/cham-pho`).

> **Dành cho Agent đang phát triển ở repo/thư mục Frontend độc lập:**
> Không đoán tên field hay payload của Backend. Hãy sử dụng trực tiếp các lớp dưới đây (hoặc copy thẳng sang dự án UI của bạn) và kiểm tra type bằng `npm run typecheck`.

---

## 1. Cấu trúc lớp tích hợp trong `naisee_frontend`

```text
naisee_frontend/src/
├── contracts/
│   ├── api.types.ts        # Enum & Envelope chuẩn khớp Backend DTO
│   └── openapi.d.ts        # File type tự sinh từ Swagger bằng `npm run sync:types`
├── shared/
│   └── api-client.ts       # Fetch wrapper (Bearer token + ApiEnvelope<T>)
├── features/               # (Sẽ bổ sung dần theo từng Giai đoạn 3 -> 11)
│   └── <feature>/api.ts    # Headless SDK functions (không chứa JSX/CSS)
├── adapters/
│   └── domain.adapter.ts   # Chuyển đổi enum/field giữa Backend DTO <-> Standalone UI
└── app/
    └── page.tsx            # Test Harness tối giản để verify luồng API thật
```

---

## 2. Cách đồng bộ Type tự động từ Backend

1. Chạy Backend: `cd naisee_backend && npm run start:dev`
2. Đồng bộ OpenAPI types sang Frontend:
   ```powershell
   cd naisee_frontend
   npm run sync:types
   ```
3. Kiểm tra lệch type toàn project:
   ```powershell
   npm run typecheck
   ```

---

## 3. Bảng Mapping Contract (Backend DTO ↔ Standalone UI)

| Khái niệm | Backend (`naisee_backend`) | Standalone UI (`cham-pho`) | Adapter xử lý |
| --- | --- | --- | --- |
| Vai trò Cán bộ | `STAFF` | `'officer'` | `toUiRole` / `toBackendRole` |
| Vai trò Dân / TNV | `CITIZEN`, `VOLUNTEER` | `'citizen'`, `'volunteer'` | `toUiRole` / `toBackendRole` |
| Loại sự cố | `ROAD_SURFACE`, `STREET_LIGHT`, `WASTE`, `FLOODING`, `OTHER` | `'road'`, `'streetlight'`, `'waste'`, `'flooding'` | `toUiCategory` / `toBackendCategory` |
| Trạng thái | `PENDING_REVIEW`, `RECEIVED`, `VERIFYING`, `IN_PROGRESS`, `RESOLVED` + `needsReopenReview` | `'new'`, `'verifying'`, `'in_progress'`, `'resolved'`, `'reopened'` | `toUiStatus(status, needsReopenReview)` |
| Mức độ | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | `'low'`, `'medium'`, `'high'`, `'critical'` | `toUiSeverity` / `toBackendPriority` |
| Định danh URL | `publicId` (UUID) & `code` (`HT-2026-001`) | `id` & `code` | Map `id: dto.publicId` |
| Tọa độ & Địa chỉ | `latitude`, `longitude`, `addressText`, `ward` | `lat`, `lng`, `address`, `neighborhood` | Mapper theo `Issue` detail/list |
| Số lượt ghi nhận | `reportCount` | `confirmationsCount` | `confirmationsCount: dto.reportCount` |
| Hạn xử lý | `dueAt` (+ cờ dẫn xuất `isOverdue`) | `deadlineAt` | `deadlineAt: dto.dueAt` |
| Ảnh minh chứng | `media[]` phân loại theo `stage` (`BEFORE`, `VERIFICATION`, `AFTER`) | `imageUrl`, `resolvedImageUrl`, `verification.evidenceImageUrl` | Lọc từ `media[]` theo `stage` |

---

## 4. Điểm thay thế ở Frontend UI Độc lập

Khi tích hợp vào Frontend UI chính thức:
1. **`auth-context.tsx`:** thay mock `PERSONAS` & `switchPersona` bằng `POST /api/v1/auth/demo-switch` (`0901000001`, `0901000002`, `0901000003`) và `toggleLargeTextMode` bằng `PATCH /api/v1/auth/me/preferences`.
2. **`incident-store.ts`:** thay dữ liệu tĩnh bằng các hàm trong `src/features/*/api.ts` + mapper trong `src/adapters/`.
3. **Envelope chuẩn:** mọi response thành công có dạng `{ success: true, data, meta? }`; lỗi có dạng `{ success: false, error: { code, message, details? } }`.

