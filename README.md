# EV-ChargeOps — ระบบจัดการตู้ชาร์จ EV, Alarm และงานซ่อมบำรุง

ระบบล็อกอินด้วยอีเมล/รหัสผ่าน ควบคุมสิทธิ์ตามบทบาท และจัดการข้อมูลตู้ชาร์จ, Alarm และงานซ่อมบำรุง บน Next.js 14 (App Router) ที่เชื่อมต่อ Supabase ด้วย `@supabase/ssr`

## เริ่มใช้งาน

```bash
npm install
copy .env.example .env.local     # บน PowerShell: Copy-Item .env.example .env.local
npm run dev
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยบัญชีทดลอง (รหัสผ่านเดียวกันทั้งหมด `Password123!`)

| อีเมล | บทบาท |
| --- | --- |
| `admin@evchargeops.co.th` | Admin |
| `tech1@evchargeops.co.th` | Technician |
| `tech2@evchargeops.co.th` | Technician |

## Environment Variables

ต้องมีเพียง 2 ตัว ดึงจาก Supabase Dashboard > Project Settings > API

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

ทั้งสองตัวเป็น public key ซึ่งปลอดภัยเพราะข้อมูลถูกคุ้มด้วย Row Level Security

**service_role key ไม่ถูกใช้ในโปรเจกต์นี้เลย** การตรวจสิทธิ์ทั้งหมดใช้ anon key ร่วมกับ RLS จึงไม่มีเหตุผลที่จะเก็บ service_role key ไว้ หากวันหนึ่งจำเป็นต้องใช้จริง ๆ ให้ตั้งชื่อ **ไม่มี** prefix `NEXT_PUBLIC_` เก็บไว้เฉพาะ `.env.local` และอ่านจากฝั่ง server เท่านั้น ห้าม import ในไฟล์ `"use client"` และห้ามส่งผ่าน props เด็ดขาด เพราะตัวแปรที่มี prefix `NEXT_PUBLIC_` จะถูกฝังลง bundle และเปิดดูได้จาก devtools

## ติดตั้งฐานข้อมูล

รันแต่ละไฟล์แยกกันใน Supabase Dashboard > SQL Editor > New query **ตามลำดับ**

1. `01_schema.sql` — ตาราง, constraint, index, trigger สร้าง profile จากผู้ใช้ใหม่
2. `02_rls.sql` — เปิด RLS และสร้าง policy ตามสิทธิ์รายบทบาท **(สำคัญที่สุด)**
3. `03a_users.sql`, `03b1_machines.sql`, `03b2_alarms.sql`, `03b3_logs.sql` — ข้อมูลตัวอย่างและบัญชีทดลอง
4. `04_dashboard_views.sql` — view สำหรับกราฟบน `/dashboard`

> `04_dashboard_views.sql` ใช้ `security_invoker = true` เพื่อคงพฤติกรรมตาม RLS ของผู้เรียก (ต้องเป็น PostgreSQL 15 ขึ้นไป ซึ่ง Supabase เป็นอยู่แล้ว) ถ้าไม่รันไฟล์นี้ หน้า `/dashboard` จะแสดงผลว่างเพราะไม่มี view ให้อ่าน

## เส้นทาง

| เส้นทาง | หน้า | ใครใช้ได้ |
| --- | --- | --- |
| `/dashboard` | ภาพรวม: KPI, กราฟสถานะ, Top 5 Alarm, Alarm ล่าสุด | ทุกบทบาท |
| `/machines` | ตู้ชาร์จ: เพิ่ม / แก้ไข / ลบ / เปลี่ยนสถานะ | ดูทุกบทบาท, เขียนเฉพาะ Admin |
| `/alarms` | Alarm: เปิดใหม่, แก้ไข, เปลี่ยนสถานะ, ลบ | ดูทุกบทบาท, เปลี่ยนสถานะ Admin+ช่าง |
| `/maintenance` | งานซ่อมบำรุง: เพิ่ม, แก้ไข, เปลี่ยนสถานะ, ลบ | ดูทุกบทบาท, เขียน Admin+ช่าง |
| `/dashboard/team` | สมาชิกและการเปลี่ยนบทบาท | เฉพาะ Admin |

URL เก่า `/dashboard/machines`, `/dashboard/alarms`, `/dashboard/maintenance` ยังใช้ได้ผ่าน redirect และคง query string เดิมไว้ ทั้งหมดอยู่ใน route group `app/(app)/` ซึ่งมี layout กลางคุม auth guard และเมนูเพียงจุดเดียว

## การค้นหาและกรองข้อมูล

ทุกหน้า master data กรองฝั่ง server จาก query string ไม่ใช่กรองในเบราว์เซอร์ ข้อดีคือข้อมูลถูกต้องไม่ว่าจะใหญ่แค่ไหน และ URL ที่กรองแล้วเป็นลิงก์ที่แชร์ต่อได้ (ปุ่มย้อนกลับของเบราว์เซอร์เดินย้อนตามสถานะตัวกรอง)

| หน้า | เงื่อนไข (รวมกันแบบ AND) |
| --- | --- |
| `/machines` | ค้นหา, สถานะ, สถานที่ตั้ง, ประเภท |
| `/alarms` | ค้นหา, สถานะ, เครื่องจักร, ช่วงวันที่ |
| `/maintenance` | ค้นหา, สถานะ, เครื่องจักร, ช่วงวันที่ |

รายละเอียดที่ควรรู้:

- ช่องค้นหากด Enter หรือออกจากช่องก่อนค้น ส่วน dropdown และวันที่ใช้ทันทีที่เปลี่ยน เพื่อไม่ให้ยิง request ทุกตัวอักษร
- ช่วงวันที่รวมทั้งสองปลาย และเบราว์เซอร์บังคับไม่ให้เลือกวันที่ที่ย้อนกลับ จึงไม่มีกรณีได้ผลลัพธ์ว่างโดยไม่มีคำอธิบาย
- ช่วงวันที่คำนวณจากเขตเวลาของผู้ใช้ ระบบจะส่ง `tz` (UTC offset) ไปกับ URL เพื่อให้วันที่ที่เลือกหมายถึงวันปฏิทินของผู้ใช้จริง ไม่ใช่วัน UTC
- ค่าจาก URL ทุกตัวถูกตรวจก่อนนำไปต่อกับ PostgREST: enum ต้องอยู่ในรายการที่อนุญาต, วันที่ต้องเป็น `yyyy-mm-dd`, uuid ต้องมีรูปแบบถูกต้อง และ `%` `_` ในคำค้นถูก escape ไม่ให้กลายเป็น wildcard
- หน้าจอแสดง `แสดง X จาก Y` โดย Y มาจาก query นับทั้งหมดที่ไม่มีตัวกรอง เพื่อให้เห็นว่าตัวกรองซ่อนข้อมูลไปเท่าไร

## การตรวจสอบข้อมูลก่อนบันทึก

`lib/validation.ts` เป็นชั้น UX: คืนข้อความภาษาไทยที่ระบุว่าช่องไหนผิด และแสดงผิดกับช่องนั้นในฟอร์มควบคู่กับ toast เพื่อไม่ให้ข้อความหลุดไป

- รหัสเครื่องจักร: อังกฤษ ตัวเลข และ `. _ -` เท่านั้น (กันสถานีชื่อ `EVB-01` กับ `EVB 01` ที่ดูเหมือนกันแต่แยกกันได้)
- รหัส Alarm: อังกฤษ ตัวเลข และ `. _ -`
- ช่องบังคับ: รหัส, ชื่อ, ประเภท และรายละเอียด
- สถานะต้องเป็นค่าในรายการที่กำหนด ตาม `01_schema.sql` เพราะ CHECK constraint บังคับอยู่แล้ว
- ความยาวสูงสุดตามช่อง กันการวางข้อความยาวเหมือน log file

ชั้นนี้ไม่ใช่ความปลอดภัย Constraint ในฐานข้อมูลคือตัวบังคับจริง และโค้ดยังจัดการรหัส error `23505` (unique) กับ `23503` (foreign key) เผื่อมี request ชนกันพร้อมกัน

งานซ่อมบำรุงที่ผูกกับ Alarm ต้องเป็น Alarm ของเครื่องเดียวกัน เพราะ `maintenance_records` อ้างอิง `alarms (id, machine_id)` แบบ composite key ระบบตรวจให้ก่อนบันทึก และ dropdown ก็กรอง Alarm ตามเครื่องที่เลือกไว้ เพื่อไม่ให้เลือกคู่ที่ผิดได้ตั้งแต่ต้น

## โครงสร้างไฟล์

```
middleware.ts                     ป้องกันเส้นทาง + refresh session
lib/
  auth.ts                         getUser, getProfile, requireUser, requireRole, requirePermission
  permissions.ts                  ตารางสิทธิ์รายบทบาท (ชั้น UX เท่านั้น ไม่ใช่ความปลอดภัย)
  validation.ts                   ตรวจฟอร์ม + ActionState ที่ทุก server action คืน
  filters.ts                      อ่าน/ตรวจ query string, escape LIKE, ช่วงวันที่ตามเขตเวลา
  options.ts                      ตัวเลือกของ dropdown (เครื่องจักร, Alarm)
  constants.ts                    ค่าคงที่สถานะและป้ายภาษาไทย
  format.ts                       จัดรูปแบบวันที่และ CSS class
  supabase/
    client.ts                     Browser client
    server.ts                     Server client (RSC, Server Actions, Route Handlers)
    middleware.ts                 updateSession
    types.ts                      Database type ที่ตรงกับ 01_schema.sql
app/
  (app)/                          route group: หน้าที่ต้องล็อกอินทั้งหมด
    layout.tsx                    ใส่ AppShell (auth guard + เมนู) จุดเดียว
    dashboard/                    ภาพรวม + สมาชิก + redirect จาก URL เก่า
    machines/page.tsx             เครื่องจักร
    alarms/page.tsx               Alarm
    maintenance/page.tsx          งานซ่อมบำรุง
  machines/actions.ts             server actions (ย้ายออกจาก route group เพื่อให้ import path สะอาด)
  alarms/actions.ts
  maintenance/actions.ts
  login/                          หน้าเข้าสู่ระบบ + server actions
  unauthorized/                   หน้าแจ้งว่าไม่มีสิทธิ์
  auth/callback/                  จุดรับ code สำหรับ magic link / OAuth
components/
  filter/FilterShell.tsx          ตัวคุมตัวกรองที่ผูก state กับ URL
  filter/FilterFields.tsx         ช่องกรองสำเร็จรูป (สถานะ, ข้อความ, เครื่อง, ช่วงวันที่)
  ui/Field.tsx                    label + input + ข้อความผิดพลาดแบบ inline
  ui/SubmitButton.tsx             ปุ่ม submit ที่ผูกกับสถานะ pending
  ui/Toaster.tsx                  toast ของ Sonner (mount ที่ root layout)
  machines/ alarms/ maintenance/  ฟอร์ม ตาราง และตัวกรองของแต่ละหน้า
  shell/AppShell.tsx              header, เมนู, และ auth guard
  shell/AppNav.tsx                เมนูฝั่ง client เพื่อทำ active state
  dashboard/                      KPI, กราฟ (lazy load), ตาราง Alarm ล่าสุด
```

## การทำงานของระบบล็อกอิน

1. `middleware.ts` ทำงานทุก request เพื่อ **refresh session** ถ้า access token หมดอายุ Supabase จะออก token ใหม่และ middleware เขียน cookie กลับ นี่คือเหตุผลหลักที่ต้องมี middleware แม้ RLS จะถูกต้องแล้ว
2. ผู้ใช้ที่ยังไม่ล็อกอินและเปิดหน้าใดก็ได้ที่ไม่ใช่สาธารณะ จะถูกส่งไป `/login?next=<เส้นทาง>` middleware ครอบคลุมทุกเส้นทางโดยไม่ต้องลงชื่อรายหน้า และจะไม่ดึง query string เดิมมาปนกับ URL ของหน้า login
3. `login()` server action เรียก `signInWithPassword` แล้ว redirect กลับไปหน้าเดิม
4. ทุกหน้าใน `app/(app)/` เรียก guard ผ่าน `AppShell` ซึ่งดึง `role` จากตาราง `profiles` **เท่านั้น** ไม่อ่านจาก user metadata ผู้ใช้จึงปลอมเป็น Admin เองไม่ได้
5. `logout()` เป็น POST ผ่าน server action ไม่ใช่ลิงก์ GET เพราะ GET สามารถถูกเรียกจากเว็บอื่นด้วย `<img>` ได้

## สิทธิ์รายบทบาท

| ความสามารถ | Admin | Technician | Viewer |
| --- | --- | --- | --- |
| ดูข้อมูลทั้งหมด | ✓ | ✓ | ✓ |
| CRUD เครื่องจักร | ✓ | — | — |
| เปิด Alarm ใหม่ | ✓ | — | — |
| แก้ไขรายละเอียด Alarm (เครื่อง/รหัส/สาเหตุ) | ✓ | — | — |
| เปลี่ยนสถานะ Alarm | ✓ | ✓ | — |
| ลบ Alarm | ✓ | — | — |
| สร้างงานซ่อมบำรุง | ✓ | ✓ | — |
| แก้ไขงานซ่อมบำรุง | ทุกรายการ | เฉพาะของตัวเอง | — |
| ลบงานซ่อมบำรุง | ✓ | — | — |
| เปลี่ยนบทบาทสมาชิก | ✓ | — | — |

## ชั้นความปลอดภัย 3 ชั้น

โค้ดนี้ตรวจสิทธิ์ซ้ำกัน 3 จุด โดยแต่ละชั้นมีหน้าที่ต่างกัน

1. **UI** — `lib/permissions.ts` ซ่อนปุ่มที่กดไม่ได้ เพื่อไม่ให้ผู้ใช้เห็นสิ่งที่จะถูกปฏิเสธ เป็นแค่ชั้นความสะดวกสบาย **ไม่ใช่** ความปลอดภัย
2. **Server** — ทุก server action เรียก `requirePermission()` ก่อนแตะข้อมูลเสมอ
3. **ฐานข้อมูล** — RLS policies ใน `02_rls.sql`

ชั้นที่ 3 คือชั้นที่บังคับใช้จริง เพราะ anon key เปิดเผยต่อสาธารณะ ผู้ใช้ที่แก้โค้ดหน้าเว็บหรือยิง REST API ตรง ๆ ก็ถูก RLS ปฏิเสธเหมือนกัน

> เมื่อแก้สิทธิ์ใน `lib/permissions.ts` ให้แก้ `02_rls.sql` ให้ตรงกันเสมอ โดยถือว่า `02_rls.sql` เป็นตัวกำหนดจริง

จุดที่ระวังเป็นพิเศษ:

- `createMaintenance()` ดึง `technician_id` จาก session เสมอ ไม่รับค่าจากฟอร์ม มิฉะนั้นช่างที่ส่ง `technician_id` ของคนอื่นมาจะผ่านเงื่อนไขใน RLS และแก้ไขงานของคนอื่นได้
- เครื่องจักรเป็น **Admin เท่านั้น** ที่เขียนได้ (`machines_insert/update` ใช้ `is_admin()`) เพราะเป็นข้อมูลการตั้งค่าระบบ ไม่ใช่สถานะการปฏิบัติงาน ช่างรายงานอาการเสียและลงมือซ่อม แต่ไม่ย้ายชื่อสถานีหรือเปลี่ยนอุปกรณ์
- RLS จำกัดได้ระดับแถว ไม่ได้ระดับคอลัมน์ `alarms_update` จึงต้องเปิดให้ช่างอัปเดตได้ เพื่อให้เปลี่ยนสถานะได้ ผลคือช่างที่ยิง request ตรง ๆ อาจแก้ `description` หรือ `cause` ได้ด้วย การจำกัดให้แน่นอนต้องใช้ trigger ที่ตรวจคอลัมน์ ซึ่งยังไม่ได้ทำ — เป็นข้อจำกัดที่ควรบันทึกไว้
- ปุ่มแก้ไขในหน้างานซ่อมบำรุงจะไม่แสดงบนแถวของคนอื่นสำหรับช่าง เพื่อไม่ให้กดแล้วถูกฐานข้อมูลปฏิเสธ ตรงกับนโยบาย `technician_id = auth.uid()`

## สคริปต์

```bash
npm run dev        # โหมดพัฒนา
npm run build      # build production
npm run start      # รัน production build
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

## หมายเหตุด้านความปลอดภัยของ dependency

`npm audit` ยังรายงานช่องโหว่ใน `next@14.2.35` และ `postcss` ที่มากับ Next.js 14 ซึ่งยังไม่มีแพตช์ในสาย 14.x (ต้องอัปเกรดเป็น Next 16 ซึ่งเป็น breaking change) รายการที่พบ:

- Next.js Image Optimization RCE เมื่อมีการประมวลผลไฟล์ AVIF — โปรเจกต์นี้ไม่ได้ใช้ `next/image` กับไฟล์ภายนอก จึงยังไม่กระทบ
- postcss XSS และ path traversal ผ่าน `sourceMappingURL` — กระทบตอน build เท่านั้น ไม่กระทบ production runtime

แนะนำให้วางแผนอัปเกรด Next.js เมื่อโครงการพร้อมรับการเปลี่ยนแปลง
