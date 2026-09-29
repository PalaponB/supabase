# EV-ChargeOps — Authentication และ Role-Based Access Control

ระบบล็อกอินด้วยอีเมล/รหัสผ่าน พร้อมควบคุมสิทธิ์ตามบทบาท สำหรับ Next.js 14 (App Router) ที่เชื่อมต่อ Supabase ด้วย `@supabase/ssr`

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

## โครงสร้างไฟล์

```
middleware.ts                     ป้องกันเส้นทาง + refresh session
lib/
  auth.ts                         getUser, getProfile, requireUser, requireRole, requirePermission
  permissions.ts                  ตารางสิทธิ์รายบทบาท (ชั้น UX เท่านั้น ไม่ใช่ความปลอดภัย)
  constants.ts                    ค่าคงที่สถานะและป้ายภาษาไทย
  format.ts                       จัดรูปแบบวันที่และ CSS class
  supabase/
    client.ts                     Browser client
    server.ts                     Server client (RSC, Server Actions, Route Handlers)
    middleware.ts                 updateSession
    types.ts                      Database type ที่ตรงกับ 01_schema.sql
app/
  login/                          หน้าเข้าสู่ระบบ + server actions
  unauthorized/                   หน้าแจ้งว่าไม่มีสิทธิ์
  auth/callback/                  จุดรับ code สำหรับ magic link / OAuth
  dashboard/                      ภาพรวม
  dashboard/machines/             เครื่องจักร
  dashboard/alarms/               Alarms
  dashboard/maintenance/          งานซ่อมบำรุง
  dashboard/team/                 สมาชิกและสิทธิ์ (เฉพาะ Admin)
```

## การทำงานของระบบล็อกอิน

1. `middleware.ts` ทำงานทุก request เพื่อ **refresh session** ถ้า access token หมดอายุ Supabase จะออก token ใหม่และ middleware เขียน cookie กลับ นี่คือเหตุผลหลักที่ต้องมี middleware แม้ RLS จะถูกต้องแล้ว
2. ผู้ใช้ที่ยังไม่ล็อกอินและพยายามเปิด `/dashboard` จะถูกส่งไป `/login?next=/dashboard`
3. `login()` server action เรียก `signInWithPassword` แล้ว redirect กลับไปหน้าเดิม
4. ทุกหน้าใต้ `/dashboard` เรียก `requireUser()` ซึ่งดึง `role` จากตาราง `profiles` **เท่านั้น** ไม่อ่านจาก user metadata ผู้ใช้จึงปลอมเป็น Admin เองไม่ได้
5. `logout()` เป็น POST ผ่าน server action ไม่ใช่ลิงก์ GET เพราะ GET สามารถถูกเรียกจากเว็บอื่นด้วย `<img>` ได้

## สิทธิ์รายบทบาท

| ความสามารถ | Admin | Technician | Viewer |
| --- | --- | --- | --- |
| ดูข้อมูลทั้งหมด | ✓ | ✓ | ✓ |
| CRUD เครื่องจักร | ✓ | — | — |
| อัปเดตสถานะ Alarm | ✓ | ✓ | — |
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

> เมื่อแก้สิทธิ์ใน `lib/permissions.ts` ให้แก้ `02_rls.sql` ให้ตรงกันด้วยเสมอ โดยถือว่า `02_rls.sql` เป็นตัวกำหนดจริง

จุดที่ระวังเป็นพิเศษ: `saveMaintenance()` ดึง `technician_id` จาก session เสมอ ไม่รับค่าจากฟอร์ม มิฉะนั้นช่างที่ส่ง `technician_id` ของคนอื่นมาจะผ่านเงื่อนไขใน RLS และแก้ไขงานของคนอื่นได้

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
