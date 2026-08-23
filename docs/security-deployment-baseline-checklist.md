# Security & Deployment Baseline Checklist

เอกสารนี้เป็นแผนปฏิบัติการสำหรับ hardening ระบบแปลงภาพ (Next.js + Sharp) ก่อน deploy จริง โดยเรียงลำดับจากทำได้ทันทีไปจนถึง production readiness

## เป้าหมาย

- ลดความเสี่ยงจาก malicious uploads และ resource abuse
- ควบคุม throughput ให้ระบบเสถียรภายใต้โหลดสูง
- ทำให้ pipeline deploy และ server config มี baseline ด้านความปลอดภัย

---

## 1) Application Security (Code Layer)

### 1.1 Input Validation
- [x] จำกัดขนาดไฟล์ต่อไฟล์: `15MB`
- [x] บล็อก SVG input 100% (`SVG_BLOCKED`)
- [x] ตรวจ input signature (magic bytes)
- [x] รองรับเฉพาะ input ที่ตรวจได้ว่าเป็น `jpeg/png/webp/avif`
- [x] reject ไฟล์ signature ไม่ถูกต้อง (`INVALID_FILE_SIGNATURE`)

### 1.2 Processing Safety
- [x] จำกัดมิติภาพ: สูงสุด `8192x8192`
- [x] จำกัดพิกเซลรวม: สูงสุด `40,000,000`
- [x] timeout ต่อ conversion job: `60s` (`PROCESSING_TIMEOUT`)

### 1.3 Error Contract
- [x] ส่ง `code` ที่ชัดเจนใน error response
- [x] ใช้ `429` + `Retry-After` สำหรับ capacity pressure
- [x] มี reason code สำหรับ backpressure:
  - `QUEUE_FULL`
  - `MEMORY_BUDGET_EXCEEDED`

### 1.4 Verification
- [x] สคริปต์ตรวจ error codes: `scripts/verify-convert-error-codes.sh`
- [x] เคสที่ตรวจผ่าน:
  - `SVG_BLOCKED`
  - `INVALID_FILE_SIGNATURE`
  - `FILE_TOO_LARGE`
  - `NO_FILE_PROVIDED`
  - `INVALID_OUTPUT_FORMAT`

---

## 2) Queue, Concurrency, and Backpressure Baseline

### 2.1 Limits
- [x] Client parallelism: `5` jobs/client
- [x] Server active processing: `5`
- [x] Server queue cap: `100` (pending + active)
- [x] Server memory budget: `100MB` (reserved input bytes)

### 2.2 Backpressure Behavior
- [x] Server ปฏิเสธงานใหม่ด้วย `429` เมื่อเกิน queue/memory budget
- [x] Client retry อัตโนมัติด้วย backoff เมื่อโดน `429`
- [x] มี SSE status สำหรับ:
  - queue total
  - active processing
  - memory usage

### 2.3 UI Surface
- [x] แสดงสถานะ: `Server Queue • Processing • Memory`
- [x] Convert/clear controls อยู่จุดเดียวกัน
- [x] Queue/Preview behavior ชัดเจนและสอดคล้องกับระบบคิว

### 2.4 Video-to-Audio Resource Controls
- [x] จำกัดไฟล์วิดีโอสูงสุด `8 GiB` ต่อไฟล์
- [x] อัปโหลดแบบ sequential raw chunks ขนาดสูงสุด `16 MiB`
- [x] stream chunk ลง temporary disk โดยไม่สร้าง full-file Buffer
- [x] จำกัด media jobs ที่ยังมีชีวิต `10` งาน
- [x] จำกัด reserved media input `24 GiB`
- [x] จำกัด FFmpeg concurrency เริ่มต้น `1`
- [x] ตรวจ free disk ก่อนรับ upload และก่อนเริ่ม output
- [x] ลบ input หลังสำเร็จ และ cleanup งาน/output เมื่อครบ `6 ชั่วโมง`
- [x] FFprobe ยืนยัน media และ audio stream ก่อน FFmpeg
- [x] ใช้ `spawn` argument arrays และไม่ผ่าน shell
- [x] download รองรับ HTTP byte range โดยไม่โหลด output เข้า memory

---

## 3) Docker Baseline (ยังต้องทำ)

### 3.1 Container Build
- [ ] ทำ `Dockerfile` แบบ multi-stage
- [ ] pin เวอร์ชัน base image และ runtime ให้ชัดเจน
- [ ] ลด attack surface ของ runtime image (เฉพาะของจำเป็น)

### 3.2 Runtime Security
- [ ] รัน process เป็น non-root user
- [ ] ตั้ง memory/cpu limit ตอนรัน container
- [ ] เพิ่ม healthcheck endpoint + Docker HEALTHCHECK
- [ ] ตั้ง `NODE_ENV=production`
- [ ] (ทางเลือก) read-only filesystem + tmpfs เฉพาะจุดจำเป็น

---

## 4) CI/CD Baseline (GitHub Actions - ยังต้องทำ)

### 4.1 CI Quality Gates
- [ ] install -> lint/typecheck -> build
- [ ] fail เมื่อ build/typecheck ไม่ผ่าน

### 4.2 Security Gates
- [ ] dependency audit
- [ ] container image scan
- [ ] fail เมื่อเจอ critical CVE

### 4.3 Secrets and Release Hygiene
- [ ] ใช้ GitHub Secrets เท่านั้น (ไม่ hardcode)
- [ ] คุม branch protection + required checks

---

## 5) Ubuntu DO Server Baseline (ยังต้องทำ)

### 5.1 Edge/Proxy
- [ ] วาง Nginx/Caddy หน้า app
- [ ] บังคับ HTTPS + HTTP redirect
- [ ] ตั้ง request body limit แยกตาม route: `15MB` สำหรับ `/api/convert` และอย่างน้อย `17MB` สำหรับ media chunk routes
- [ ] ตั้ง rate limit สำหรับ `/api/convert`
- [ ] ตั้ง rate limit/session quota สำหรับ `/api/video-to-audio/jobs`
- [ ] ปิด proxy buffering สำหรับ media download streams (`X-Accel-Buffering: no`)
- [ ] mount `MEDIA_TEMP_DIR` บน volume ที่เขียนได้และมี capacity มากกว่า active reservations

### 5.2 Host Hardening
- [ ] เปิด firewall เฉพาะพอร์ตจำเป็น
- [ ] จำกัด SSH access (key-based, disable password)
- [ ] ตั้ง restart policy + log rotation

### 5.3 Monitoring and Alerts
- [ ] เก็บ metrics ขั้นต่ำ:
  - 429 rate
  - queue depth
  - processing count
  - memory pressure
  - media reserved bytes / free disk
  - active FFmpeg process และ conversion latency
- [ ] ตั้ง alert เมื่อมี spike/pressure ต่อเนื่อง

---

## 6) Remaining Recommended Enhancements

- [ ] เพิ่ม rate limit ระดับ app ต่อ IP (เสริม edge rate limit)
- [ ] เพิ่ม structured security logs (ip, code, size, latency)
- [ ] pin และ patch FFmpeg/FFprobe build พร้อมตรวจ LGPL/GPL obligations
- [ ] ทำ load test หลาย client เพื่อตรวจพฤติกรรม backpressure
- [ ] ทำ runbook incident (queue full, memory pressure, timeout spike)

---

## 7) Definition of Done (Production Readiness)

ระบบถือว่า baseline พร้อมใช้งาน production เมื่อ:

- [ ] App security controls ผ่านทุกเคสหลัก
- [ ] Docker runtime hardening เสร็จ
- [ ] CI security gates พร้อมบล็อก critical
- [ ] Reverse proxy + TLS + rate/body limits ทำงานจริง
- [ ] Monitoring + alert พร้อมใช้งาน
- [ ] Load test ยืนยันว่า queue/backpressure เสถียร

---

## Quick Commands

```bash
# Build check
yarn build

# Verify API security error codes
bash scripts/verify-convert-error-codes.sh http://localhost:3000
```
