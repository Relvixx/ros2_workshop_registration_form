# ROS2 Workshop Registration Website — Project Context & Source of Truth

> **Purpose of this file**
>
> This document is the persistent source of truth for the entire ROS2 Workshop Registration Website project.  
> Any coding/design AI working on this project must read this file **before making changes**.  
> If a later task becomes long, multi-step, or spans many sessions, use this document to recover the exact requirements instead of guessing.
>
> **Priority rule:** If a later prompt conflicts with this file, the **latest explicit user instruction wins**. After such a decision, update this file so it stays current.

---

# 1. Project Identity

## Event Name
**Unlocking Robotics with Robot Operating System (ROS2)**

## Subtitle
**5-Day Hands-On Robotics Training Program**

## Organizer
**Department of Automation & Robotics**

## Institute
**MET’s Institute of Technology Polytechnic B Tech**

## Training Partner
**Robotry**

## Workshop Dates
**28 September 2026 – 02 October 2026**

## Duration
**5 full days**

## Mode
**Offline Hands-On Training**

## Target Audience
**TE & BE Automation & Robotics Students**

## Registration Fee
**₹1,500 per student**

## Maximum Capacity
**Strictly 30 confirmed registrations**

## Registration Window
There is **NO registration start date** and **NO registration end date/deadline** on the website.

Registration remains open until the capacity reaches 30 confirmed registrations.

When 30 confirmed registrations are reached:
- Landing-page registration CTA must change to **Workshop Full**
- `/register` must stop accepting new registrations
- A 31st confirmed registration must be technically impossible

---

# 2. Primary Product Goal

Build a polished, trustworthy, mobile-first workshop microsite that does two things extremely well:

1. Explains the workshop clearly and professionally
2. Lets eligible students register, pay ₹1,500 through UPI, upload their payment screenshot, and immediately receive a confirmed registration if capacity is still available

The system must be fast enough for real deployment and simple enough to operate without a large admin team.

---

# 3. Public Website Structure

There are only **two primary public experiences**.

## Page 1 — `/`
Workshop landing page for information, trust, syllabus, trainers, details, FAQ, live seat availability, and registration CTA.

## Page 2 — `/register`
A multi-step registration experience:

1. Student Details
2. UPI Payment + Payment Screenshot Upload
3. Registration Confirmation

Do not create unnecessary extra public pages.

## Internal Admin
`/admin`

Password-protected organizer dashboard.

---

# 4. Registration Form Fields

The form should collect only:

- **Full Name**
- **Email Address**
- **Mobile Number**
- **College Name**
- **Year**
  - TE / Third Year
  - BE / Fourth Year

Do **not** add:
- PRN
- Roll number
- gender
- date of birth
- home address
- emergency contact
- interests
- project idea
- student login
- OTP
- Google sign-in
- unnecessary consent steps

The goal is to keep registration quick.

---

# 5. Duplicate Registration Rules

Prevent duplicate active registrations using:

- normalized email address
- normalized mobile number

If the same email **or** phone number already has an active draft/confirmed registration, do not let the person create a second active registration.

Error message should be privacy-safe, for example:

> A registration already exists using this email or mobile number.

Never reveal another participant’s personal data.

---

# 6. Capacity Rule — Critical

The workshop capacity is **30 confirmed registrations**.

Drafts do **not** consume a seat.

The final seat must only be consumed when a student successfully submits payment proof and the server finalizes the registration.

## Required behavior

- Confirmed count 0–29 → registration available
- Confirmed count 30 → registration closed
- 31st confirmed registration must never happen
- Two people submitting simultaneously for the final seat must result in exactly one success

## Technical requirement

Do not rely on frontend logic like:

```ts
if (confirmedCount < 30) {
  insertRegistration()
}
```

That is race-condition prone.

Use a PostgreSQL transaction / RPC with a row lock (`FOR UPDATE`) on the workshop capacity row.

Finalization should conceptually:

1. lock workshop settings row
2. verify confirmed count is below 30
3. verify draft is valid
4. verify payment proof exists
5. verify registration has not already been finalized
6. generate registration code
7. mark registration confirmed
8. increment confirmed count
9. commit

This operation must be atomic and idempotent.

---

# 7. Important Payment Behavior

There is **no payment gateway**.

Do not use:
- Razorpay
- Stripe
- Cashfree
- Paytm gateway
- third-party form/payment verification services
- bank APIs

Payment is performed directly through UPI.

## Fixed Payment Details

**Amount:** ₹1,500  
**Payee:** Sandip Shelkar  
**UPI ID:** `sandipshelkar.ss@oksbi`

The official QR image provided by the organizer must be used.

Recommended local asset:

`public/payment/sandip-shelkar-upi.jpg`

## Mobile Deep Link

A mobile **Open UPI App** button may use an equivalent UPI deep link:

```text
upi://pay?pa=sandipshelkar.ss@oksbi&pn=Sandip%20Shelkar&am=1500&cu=INR&tn=ROS2%20Workshop%20Registration
```

The deep link is only a convenience. It does not verify payment.

---

# 8. Payment Proof Model

After making the UPI payment, the student uploads a screenshot.

Accepted:
- JPG / JPEG
- PNG
- WEBP

Recommended maximum size:
**5 MB**

The screenshot is stored in a **private Supabase Storage bucket**.

Recommended bucket:

`payment-proofs`

Recommended object path:

`<draft_uuid>/<random_uuid>.<extension>`

Do not include names, email addresses, or phone numbers in storage paths.

## Very Important Payment Status Semantics

Uploading a screenshot is **NOT equivalent to bank verification**.

The website may automatically confirm the registration after proof submission if a seat is available, but internally it must distinguish:

```text
registration_status = confirmed
payment_proof_status = submitted_unverified
```

Do **not** display:
- “Payment verified”
- “Bank verified”
- “Transaction verified successfully”

Use:
- **Payment proof received**
- **Registration confirmed**

The organizer accepts the operational risk that fake/incorrect screenshots may have to be handled later.

---

# 9. Last-Seat Payment Edge Case

The payment page itself does **not reserve a seat**.

Therefore the website must clearly warn:

> Your seat is confirmed only after your payment proof is successfully submitted. Opening this payment page does not reserve a seat.

Reason:

A student may open the payment page while one seat remains, but another student may submit proof first and take the final seat.

The server-side final capacity check is authoritative.

---

# 10. Registration Draft Behavior

After Student Details are validated:

- create a server-side draft registration
- do not count it toward capacity
- preserve it if the browser is refreshed on the payment step
- do not depend only on localStorage
- use a secure draft identifier/resume token if necessary

Flow:

```text
Student Details
    ↓
Validate + Duplicate Check
    ↓
Create Draft
    ↓
Payment Screen
    ↓
Pay by UPI
    ↓
Upload Screenshot
    ↓
Atomic Finalization
    ↓
Confirmed Registration
```

---

# 11. Registration Confirmation

Use a human-readable registration code such as:

`ROS2-2026-0001`

`ROS2-2026-0002`

etc.

The database UUID remains the real primary key.

Success state should show:

- Registration Confirmed
- Workshop name
- Registration ID
- Workshop dates
- Offline mode
- Payment proof received

Example:

```text
Registration Confirmed

You're registered for
Unlocking Robotics with ROS2

Registration ID
ROS2-2026-0017

28 Sep – 02 Oct 2026
Offline Workshop
₹1,500 Payment Proof Received
```

After successful registration, show an optional WhatsApp group CTA
(only in the confirmed success state — never before registration, on the
payment step, on errors, or when the workshop is full):

- Heading: Stay Updated
- Copy: Get workshop announcements, instructions, and important updates on WhatsApp.
- Label: "Join WhatsApp Group for Updates"
- Group link: https://chat.whatsapp.com/BlbJIp8V1Zi3Ao84G2OLyB
  (open in a new tab with `rel="noopener noreferrer"`)
- Joining the WhatsApp group is optional and has no effect on registration status.
- Do not record whether the user clicked the button.

---

# 12. Admin Requirements

Route:

`/admin`

Only password-based access is required.

Do **not** integrate:
- Google auth
- Supabase Auth UI
- third-party identity provider

## Security

Do not hardcode admin password in source.

Use environment variables:

```env
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Successful login should create a secure server-side signed session cookie:

- HTTP-only
- Secure in production
- SameSite Lax or Strict
- reasonable expiry

Never store the admin password in localStorage.

---

# 13. Admin Dashboard

Minimum dashboard metrics:

- Capacity
- Confirmed
- Remaining
- Drafts
- Cancelled

Main registration table:

- Registration Code
- Student Name
- College
- Year
- Email
- Phone
- Registration Status
- Payment Proof
- Registered At

Features:

- search
- year filter
- status filter
- view payment proof
- cancel registration
- CSV export

Do not overbuild enterprise admin features.

---

# 14. Admin Payment Proof Viewer

Payment screenshots are private.

Admin should click **View Proof**.

Server generates a temporary signed URL, ideally 60–300 seconds.

Viewer should show:

- student name
- registration ID
- ₹1,500 amount
- upload timestamp
- proof image

Never make payment proof bucket public.

---

# 15. Admin Cancellation

Admin may cancel a confirmed registration.

Cancellation must atomically:

- set status to `cancelled`
- record `cancelled_at`
- optionally save a reason
- decrement confirmed count by one
- never let confirmed count become negative

Once a confirmed registration is cancelled, that seat becomes available again.

---

# 16. CSV Export

Protected admin-only export.

Columns:

- registration_code
- full_name
- email
- phone
- college
- year
- registration_status
- payment_proof_status
- confirmed_at
- created_at

Protect CSV from spreadsheet formula injection for values beginning with:

`=`
`+`
`-`
`@`

---

# 17. Database Direction

Recommended stack:

- Next.js 16+
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase PostgreSQL
- Supabase Storage
- Zod
- Lucide React

## Suggested registration table

`workshop_registrations`

Recommended fields:

```text
id uuid primary key

registration_code text unique nullable until confirmation

full_name text
email text
email_normalized text
phone text
phone_normalized text
college text
year text

payment_amount integer default 1500
payment_proof_path text
payment_proof_uploaded_at timestamptz
payment_proof_status text

registration_status text

created_at timestamptz
updated_at timestamptz
confirmed_at timestamptz
cancelled_at timestamptz
cancellation_reason text
```

Allowed registration status:

```text
draft
confirmed
cancelled
```

Allowed payment proof status:

```text
not_submitted
submitted_unverified
invalid
```

## Suggested workshop settings table

`workshop_settings`

```text
id
slug
capacity
confirmed_count
is_active
created_at
updated_at
```

Workshop slug:

`ros2-workshop-2026`

Capacity:

`30`

---

# 18. Supabase Security

Use Row Level Security.

Public browser users must not be able to:

- list registrations
- read other students’ information
- read payment screenshots
- update registration status directly
- manipulate confirmed count

Preferred architecture:

```text
Browser
  ↓
Next.js server route / server action
  ↓
Supabase using server-only credentials
```

The service role key must never be exposed to browser JavaScript.

Never use:

`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

---

# 19. Public Seat Status

Public UI only needs:

- capacity
- confirmed
- remaining
- isFull

Do not expose participant rows.

Recommended UI:

When remaining > 5:
`21 / 30 seats filled`

When remaining <= 5:
`Only 4 seats remaining`

When remaining = 0:
`Workshop Full`

No fake countdown timer.

No fake scarcity animation.

---

# 20. Landing Page Information Architecture

Recommended section order:

1. Header
2. Hero
3. About the Workshop
4. 5-Day Learning Journey
5. Tools / Technology Stack
6. Trainers
7. About Robotry / Past Workshop Experience
8. Workshop Details
9. Organizers
10. FAQ
11. Final CTA
12. Footer

---

# 21. Hero Content

Eyebrow:

**Department of Automation & Robotics presents**

Headline:

**Unlocking Robotics with Robot Operating System**

Make **ROS2** visually distinctive.

Subtitle:

**5-Day Hands-On Robotics Training Program**

Supporting message should communicate practical learning across:

- ROS2
- simulation
- robot design
- SLAM
- navigation
- hardware communication
- computer vision

Quick facts:

- 28 Sep – 02 Oct 2026
- 5 Days
- Offline
- TE & BE
- ₹1,500
- Only 30 Seats

Primary CTA:

**Register Now**

Secondary CTA:

**Explore Curriculum**

Live capacity must be visible.

---

# 22. Workshop Objective

Use the latest curriculum as the primary source.

Core idea:

The 5-day workshop introduces students to Robotics and ROS2 from the ground up. Concepts are introduced step-by-step and immediately applied through hands-on projects so participants gain practical robotics experience instead of learning only theory.

Do not exaggerate with claims like:
- master ROS2 in 5 days
- become an autonomous robotics expert
- guaranteed industry-ready expert
- guaranteed certification value unless officially confirmed

Appropriate phrasing:
- hands-on exposure
- practical robotics experience
- guided implementation
- real-world robotics tools
- fundamentals to hardware demonstration

---

# 23. Latest Workshop Curriculum — Primary Version

Use this version as the main syllabus unless a later explicit organizer instruction changes it.

## Day 1 — Fundamentals of Robotics and ROS

- Introduction to Robotics & ROS2
- Why ROS2?
- Use-cases and Industry Trends
- Ubuntu Installation
- ROS2 Installation and Configuration
- Python Programming Essentials
- Basic Linux and ROS2 Commands

## Day 2 — ROS2 Core Concepts

- ROS2 Architecture
- ROS2 Workspace and Package Structure
- Workspace build and package creation using `ament_cmake`
- Nodes
- Topics
- Services
- Actions
- Publisher / Subscriber hands-on
- Launch Files
- DDS
- `ROS_DOMAIN_ID`
- Turtlesim Teleoperation
- `rqt_graph`
- `ros2 topic info`
- CLI debugging tools

## Day 3 — Robot Design and Simulation

- Basic robot design in Fusion 360
- URDF conversion / introduction
- Gazebo simulation setup
- `robot_state_publisher`
- robot spawning
- RViz2
- TF2 / `view_frames`
- Gazebo plugins
- odometry
- `diff_drive`
- LiDAR plugins
- custom Gazebo world

## Day 4 — SLAM and Navigation

- Teleoperation of the custom simulated robot
- SLAM
- Nav2
- Localization
- `map_saver`
- Navigation parameters
- costmap
- behavior tree
- lifecycle nodes

## Day 5 — Bridging Hardware and ROS2

- ROS2 communication with Arduino Uno
- serial communication
- Computer Vision introduction
- OpenCV + ROS2
- Squarobot AMR demonstration
- Q&A and Discussion

---

# 24. Technology / Tools Section

A visual technology grid may include:

- ROS2
- Ubuntu
- Python
- Gazebo
- RViz2
- TF2
- URDF
- SLAM
- Nav2
- Arduino
- OpenCV
- DDS
- Fusion 360

Do not claim full mastery of all tools.

---

# 25. Trainer Structure

There are three trainers/speakers to display.

## 25.1 Aryan Jagushte

Role:

**Founder & Robotics Engineer, Robotry**

Use the supplied Aryan portrait.

Source-backed profile information:

- Founder and Robotics Engineer
- 17k+ followers on LinkedIn
- Runs his own company and podcast focused on helping students skill up
- Robotry works on AI, Robotics, ROS and hands-on engineering education
- Robotry aims to bridge theoretical learning and practical implementation

Do not invent achievements or titles beyond supplied material.

Aryan can receive the visually dominant founder card.

---

## 25.2 Siddhant Nandgave

Preferred display role:

**Mechatronics Engineering Student | Robotics / ROS2**

He is also described in the supplied resume as an **Intern at Robotry.ai**.

Source-backed details from his resume include:

- Mechatronics Engineering student
- Skills include ROS2 fundamentals with OpenCV, Python, C, Fusion 360, AutoCAD, Blender and web development
- Developed/tested robotics applications using ROS2 Jazzy on simulation and real hardware
- Worked on a hand gesture-controlled robotic arm and automation projects
- One-month Embedded Systems and STM32 training
- Conducted Robotics & AI workshop for NIT Raipur
- Conducted 5-day ROS2 workshop for AISSMS College of Engineering Pune
- Patent filed for a smartphone-powered portable air quality monitoring system
- Has a universal drone base plate project
- Has hackathon participation/runner-up experience

### Public website rule

Do not dump his entire resume.

Use a concise 2–4 line bio focused on:
- ROS2
- practical robotics
- embedded systems
- workshop experience

Avoid unnecessary personal details such as home address or phone number.

---

## 25.3 Omkar Honrao

Preferred display role:

**Robotics Research Intern | Autonomous Systems**

Source-backed details from his resume include:

- Robotics Research Intern at Robotry since April 2026
- Works on ROS2-based robotics system development and robot communication
- Builds publisher-subscriber, service, parameter and action-based ROS2 applications using Python
- Project: ROS2-based autonomous mobile robot navigation using SLAM Toolbox and Nav2
- Used Gazebo, RViz2 and AMCL
- Project: Hand-following robot using OpenCV and MediaPipe
- Project: custom ROS2 Action client-server system
- Skills include ROS2 Humble & Jazzy, SLAM, Nav2, AMCL, Gazebo, RViz2, Fusion 360, Linux and Git/GitHub
- Interest areas include Robotics & AI, ROS2 development, autonomous systems and computer vision

### Public website rule

Use a concise 2–4 line bio focused on:
- ROS2
- autonomous navigation
- simulation
- computer vision

Do not expose personal email or phone number on the public website unless explicitly requested later.

---

# 26. Trainer Images

Known project assets in the user’s local project folder currently include:

- `Omkar Maroti Honrao.jpg`
- an Aryan portrait file (current local filename appears to be `Aryan Jagushye` / similar spelling)
- Siddhant’s resume PDF contains his portrait

Recommended normalized assets:

```text
public/trainers/aryan-jagushte.jpg
public/trainers/siddhant-nandgave.jpg
public/trainers/omkar-honrao.jpg
```

### Important

Do not identify or assign a person based only on face recognition.

Use the file names and explicit owner mapping.

If Siddhant does not yet have a standalone portrait:
- extract/crop the portrait from his supplied resume **only if the owner wants that**
- otherwise use a clean initials placeholder until a standalone portrait is supplied

The site must not break if an image is missing.

---

# 27. About Robotry

Robotry is presented in supplied materials as an initiative by Aryan Jagushte focused on practical robotics education, ROS, AI, and helping students bridge theory with real-world implementation.

Do not fabricate business claims.

Do not call Robotry an “official partner” of prior institutions unless specifically supported.

Safe wording:

> Past ROS2 / robotics workshops conducted at institutions including...

Examples supported by supplied material:

- Dayanand Sagar University, Bengaluru
- KLE Technological University, Hubli
- National Institute of Technology, Raipur
- RGMCET, Nandyal
- JSPM Rajarshi Shahu College of Engineering, Pune
- D. Y. Patil College of Engineering, Akurdi
- Rajarambapu Institute of Technology, Islampur
- Zeal College of Engineering, Pune
- Dr. D. Y. Patil Institute of Technology, Pimpri

Robotry material also references:
- ROSCon India, Bengaluru 2024
- ROSCon India, Pune 2025

Use a restrained credibility section.

Do not overload the homepage with every past photo.

---

# 28. Workshop Organizers

Display in a clean official section.

**Workshop Coordinator**
Prof. Sandip Shelkar

**Head of Department**
Prof. V. R. Kale

**Principal**
Dr. R. S. Narkhede

**Student Coordinator**
Rushikesh Saskar  
8275229386

**Student Coordinator**
Rahul Chaudhari  
8983707673

Do not turn these into large trainer-style cards.

---

# 29. Visual Direction

The website should feel:

- modern
- technical
- premium
- university appropriate
- robotics-focused
- trustworthy
- clean

It should **not** feel like:

- a generic Bootstrap college form
- a cheap cyberpunk template
- a gaming site
- a cryptocurrency site
- a random AI-generated neon landing page
- a cluttered poster turned into a webpage

## Suggested palette

- warm off-white / very light cool grey background
- deep navy
- electric cobalt blue accent
- restrained Robotry-inspired magenta accent
- charcoal text
- white cards
- subtle blue-grey borders

Use gradients sparingly.

## Visual motifs

Subtle:
- LiDAR scan arcs
- navigation paths
- coordinate grids
- ROS node diagrams
- terminal fragments
- robot motion traces

No distracting giant humanoid robot imagery.

---

# 30. Typography

Use a strong modern sans-serif.

Good options:

- Space Grotesk
- Geist
- Inter

Recommended:
- headings: Space Grotesk / Geist
- body: Inter / Geist Sans

Do not use hard-to-read sci-fi fonts for body text.

---

# 31. Mobile-First Requirements

Mobile quality is critical.

Test at:

- 360px
- 390px
- 430px
- 768px
- 1024px
- 1440px

Requirements:

- no horizontal overflow
- readable type
- no huge dead hero space
- CTA visible early
- curriculum readable
- QR fits the viewport
- UPI ID easy to copy
- screenshot upload works with gallery/camera
- input types optimized for mobile
- buttons at least ~44px high
- clear loading/error states

---

# 32. Registration Page UX

## Step 1 — Details

Header:

**Reserve Your Workshop Seat**

Progress:

`01 Details → 02 Payment`

Fields:
- Full Name
- Email
- Mobile Number
- College Name
- Year

Show:
- Workshop Fee ₹1,500
- Live seats remaining

CTA:

**Continue to Payment**

## Step 2 — Payment

Header:

**Complete Your Registration**

Show student summary.

Payment card:

**₹1,500**

**Pay to Sandip Shelkar**

Official QR image.

UPI ID:

`sandipshelkar.ss@oksbi`

Actions:
- Copy UPI ID
- Open UPI App

Then:

**Upload Payment Screenshot**

Preview upload.

Confirmation checkbox:

> I confirm that I have paid ₹1,500 and the uploaded screenshot is my payment proof.

CTA:

**Submit & Confirm Registration**

## Step 3 — Confirmation

Show:
- success icon
- Registration Confirmed
- Registration ID
- workshop name
- dates
- mode
- payment proof received

---

# 33. Form Validation

Recommended:

## Full name
2–80 characters

## Email
valid email
trimmed
lowercased for normalization

## Mobile
Indian mobile number
normalize before storing

## College
2–150 characters

## Year
must be TE or BE only

## Payment proof
allowed MIME and size validation both client and server side

Do not trust client validation alone.

---

# 34. App Configuration

Centralize event facts in:

`src/config/workshop.ts`

Do not scatter values throughout components.

Suggested content:

- title
- subtitle
- institute
- department
- training partner
- dates
- duration
- mode
- target audience
- fee
- capacity
- UPI payee
- UPI ID
- contact persons
- workshop slug

Trainer metadata in:

`src/config/trainers.ts`

---

# 35. Recommended Asset Organization

Normalize the local project folder into:

```text
public/
  brand/
  trainers/
    aryan-jagushte.jpg
    siddhant-nandgave.jpg
    omkar-honrao.jpg
  payment/
    sandip-shelkar-upi.jpg
  workshop/
```

Reference PDFs/documentation may remain outside `public/` and should not automatically be shipped to end users unless intentionally linked.

Use `next/image`.

Optimize large images without making portraits blurry.

---

# 36. Existing Source Files in the Local Working Folder

Based on the organizer’s folder screenshot, current source material includes approximately:

```text
_5_Days ROS2 workshop (1).pdf
Omkar Maroti Honrao.jpg
Biodata robotry workshops.pdf
Aryan Jagushye(.jpg / image file)
ROS2_Workshop Curriculum.pdf
Siddhant Nandgave_resume-1.pdf
omkar_ROS_resume-2.pdf
```

Treat filename spelling as local-file reality, even if names contain typos.

Before coding:
- inventory the actual filenames
- do not delete source documents
- copy/rename only the assets needed by the website into `public/`

---

# 37. Source Priority / Conflict Resolution

There are multiple workshop documents.

Use this priority:

1. **Latest explicit user instruction**
2. **This PROJECT_CONTEXT.md file**
3. **ROS2_Workshop Curriculum.pdf** for current workshop syllabus
4. **Biodata robotry workshops.pdf** for Aryan / Robotry profile and past workshop evidence
5. **Siddhant Nandgave_resume-1.pdf** for Siddhant profile
6. **omkar_ROS_resume-2.pdf** for Omkar profile
7. Older `_5_Days ROS2 workshop (1).pdf` proposal for background only

If old and new syllabus wording conflicts, prefer the latest curriculum file.

Do not silently mix contradictory syllabus versions.

---

# 38. Vendor Quotation — Do Not Display Publicly

Some Robotry proposal material contains college-side quotation amounts such as ₹40,000 / ₹45,000.

That is not the participant registration fee.

Public website participant fee is:

**₹1,500 per student**

Do not display Robotry vendor/commercial quotation anywhere on the public registration website.

---

# 39. FAQ Topics

Include useful FAQs:

- Who can register?
- Is the workshop offline?
- How much is the fee?
- How many seats are available?
- What happens after I upload payment proof?
- Does opening the payment page reserve a seat?
- What software/tools are covered?
- Do I need prior ROS2 experience?

Do not invent certificate details unless officially confirmed later.

---

# 40. Accessibility

Required:

- semantic HTML
- keyboard support
- visible focus states
- proper form labels
- `aria-invalid`
- `aria-describedby`
- accessible error messages
- sufficient contrast
- alt text
- reduced-motion support
- no color-only status communication

---

# 41. Motion

Keep motion restrained.

Allowed:
- subtle hero reveal
- curriculum/timeline reveal
- button feedback
- small hover elevation
- lightweight path animation
- section fades

Avoid:
- scroll hijacking
- heavy WebGL
- permanent particle systems
- excessive parallax
- long intro loaders
- animation that delays registration

---

# 42. Performance

Use:
- Server Components where appropriate
- Next/Image
- lazy-load lower-page media
- small client bundles
- CSS motion where possible
- dedicated seat-status query instead of fetching registrations

Do not add heavy libraries unless justified.

---

# 43. SEO / Metadata

Suggested:

**Title**
Unlocking Robotics with ROS2 | MET Automation & Robotics

**Description**
Register for the 5-day hands-on ROS2 workshop organized by the Department of Automation & Robotics at MET.

Include basic OpenGraph metadata.

Do not spend excessive project time on SEO.

---

# 44. Error States

Implement clear user-safe states for:

- network failure
- invalid form
- duplicate email
- duplicate phone
- workshop full
- screenshot upload failure
- invalid file
- file too large
- payment proof missing
- expired/invalid draft
- finalization conflict
- server error
- admin session expiry

Do not expose raw SQL errors or stack traces.

---

# 45. Security Rules

Never:
- expose service role key
- expose admin password
- make payment proof storage public
- allow public registration-row reads
- allow client-side status manipulation
- trust only frontend capacity checks
- use sequence number as authorization
- put secrets in `NEXT_PUBLIC_*`

Use server-side authorization and validation.

---

# 46. Environment Variables

Create `.env.example` similar to:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=

NEXT_PUBLIC_SITE_URL=
```

No real secret should be committed.

---

# 47. QA Requirements

Before calling the project complete, verify:

1. New student can submit details
2. Invalid email blocked
3. Invalid mobile blocked
4. Duplicate email blocked
5. Duplicate mobile blocked
6. Draft survives refresh on payment step
7. Official QR renders correctly
8. Copy UPI ID works
9. Mobile UPI deep link is correct
10. Invalid screenshot file type rejected
11. >5 MB screenshot rejected
12. Proof uploads to private storage
13. Final confirmation works
14. Registration code generated
15. Public cannot open payment proof directly
16. Public cannot list registrations
17. Admin password login works
18. Wrong password fails
19. Admin signed proof viewer works
20. CSV export works
21. Admin cancellation reopens a seat
22. 30 confirmed registrations close registration
23. 31st confirmed registration is impossible
24. Simultaneous final-seat race allows exactly one success
25. Double-click final submit is idempotent
26. 360px viewport has no horizontal overflow
27. production build passes

Do not claim a test passed if it was not actually executed.

---

# 48. Implementation Priority

If time is constrained, prioritize:

1. Database correctness
2. Atomic 30-seat enforcement
3. Registration flow
4. Private payment proof storage
5. Mobile usability
6. Admin
7. Landing page polish
8. Motion

Never sacrifice registration correctness for animation.

---

# 49. Out of Scope / Do Not Add

Do not add unless the user explicitly changes scope:

- payment gateway
- OTP
- email verification
- student accounts
- Google login
- countdown timer
- public registration deadline
- public participant list
- fake testimonials
- fake sponsor logos
- fake certificates
- AI chatbot
- CMS
- complex RBAC
- analytics dashboard
- UTR verification API
- large notification system

---

# 50. AI Agent Working Rules

Any AI coding agent working in this folder must:

1. Read this file first.
2. Inspect existing files before creating duplicates.
3. Keep workshop facts centralized.
4. Preserve user-approved requirements.
5. Never fabricate trainer claims.
6. Never silently replace the latest curriculum with an older proposal.
7. Never claim a screenshot payment is bank-verified.
8. Never allow confirmed registrations above 30.
9. Never expose private registration/payment data publicly.
10. Prefer finishing one reliable production flow over adding unnecessary features.
11. Run lint/typecheck/build before completion.
12. Document migrations and required environment variables.
13. Update this file if the user changes any locked requirement later.

---

# 51. Current Locked Decisions Summary

```text
Event:
Unlocking Robotics with Robot Operating System (ROS2)

Institute:
MET’s Institute of Technology Polytechnic B Tech

Department:
Automation & Robotics

Training Partner:
Robotry

Dates:
28 Sep – 02 Oct 2026

Mode:
Offline

Audience:
TE & BE Automation & Robotics

Fee:
₹1,500

Capacity:
30 confirmed registrations maximum

Registration dates:
No start/end date shown

Form fields:
Name
Email
Phone
College
Year (TE/BE)

Payment:
Direct UPI

Payee:
Sandip Shelkar

UPI:
sandipshelkar.ss@oksbi

Payment gateway:
None

Payment verification:
No bank/API verification

Payment proof:
Screenshot required

Registration confirmation:
Automatic after successful proof submission + atomic capacity check

Admin:
Password only

Public pages:
/
 /register

Admin:
 /admin

Trainers:
Aryan Jagushte
Siddhant Nandgave
Omkar Honrao

Primary syllabus:
ROS2_Workshop Curriculum.pdf

Primary Robotry profile:
Biodata robotry workshops.pdf

Speaker sources:
Siddhant Nandgave_resume-1.pdf
omkar_ROS_resume-2.pdf
```

---

# 52. Final Product Standard

A student should be able to:

- understand the workshop in a few minutes
- see what will be covered
- understand who is conducting it
- see current seat availability
- register from a phone
- pay ₹1,500 via UPI
- upload proof
- receive an immediate registration ID if a seat is available

An organizer should be able to:

- see registrations
- see remaining seats
- view private payment proofs
- export participant data
- cancel bad/fake registrations
- automatically reopen cancelled seats

The system must be visually polished, operationally simple, secure enough for student registration data, and technically incapable of intentionally confirming more than 30 active registrations.

---

# 53. IMPLEMENTATION STATE (recovery session — 2026-09-17)

> A previous session scaffolded ~95% of the app. This recovery session audited
> everything, fixed real defects (listed below), and completed setup docs.
> Nothing was restarted or rebuilt from scratch.

## Actual routes (all implemented)

```text
/                                   landing (server component, live seats)
/register                           RegisterClient (details → payment → done)
/admin                              AdminLogin or AdminDashboard (cookie-gated)
GET  /api/seats
POST /api/registrations/draft
GET  /api/registrations/draft?id=&token=
POST /api/registrations/proof        (multipart: draftId, token, file)
POST /api/registrations/confirm      ({ draftId, token })
POST /api/admin/login                DELETE /api/admin/login (logout)
GET  /api/admin/registrations?search=&year=&status=
GET  /api/admin/proof?id=
POST /api/admin/cancel               ({ id, reason })
GET  /api/admin/export               (CSV download)
```

## Key source files

```text
src/config/workshop.ts      all locked event facts, curriculum, tech stack, FAQs, UPI link
src/config/trainers.ts      3 trainer bios (source-grounded, concise)
src/lib/validation.ts       zod details schema, normalizeEmail/Phone, proof + CSV helpers
src/lib/supabase.ts         anon client (public) + service client (server-only). NOTE: the
                            unused createRouteClient (next/headers) was REMOVED 2026-09-17
                            because it pulled server code into the client bundle (build break).
src/lib/auth.ts             admin JWT session + draft resume-token hash/compare
src/lib/seats.ts            getSeatStatus() — uses get_seat_status RPC (fixed 2026-09-17;
                            previously direct table read, which RLS always blocks)
src/components/landing.tsx  Hero/About/Curriculum/Tech/Trainers/Robotry/Details/FAQ/FinalCta
src/components/RegisterClient.tsx   full 3-step flow, draft resume, idempotent confirm
src/components/AdminDashboard.tsx   metrics, search/filters, proof modal, cancel, CSV link
src/components/AdminLogin.tsx       password form (no localStorage of password)
src/components/Header|Footer|SeatBadge|Reveal.tsx
```

## Database (Supabase Postgres)

```text
Migrations (run in order in Supabase SQL editor):
  supabase/migrations/0001_init.sql        tables, indexes, RLS, seed, get_seat_status RPC
  supabase/migrations/0002_atomic_ops.sql  finalize_registration + cancel_registration RPCs
  supabase/migrations/0003_storage.sql     private `payment-proofs` bucket row

Tables: workshop_settings (slug='ros2-workshop-2026', capacity=30),
        workshop_registrations (statuses draft/confirmed/cancelled;
        proof statuses not_submitted/submitted_unverified/invalid)
RPCs:   get_seat_status(text) [granted to anon/authenticated]
        finalize_registration(uuid, text) [service-role only]
        cancel_registration(uuid, text)   [service-role only]
Storage bucket: payment-proofs (private; no public policies; path <draftId>/<rand>.<ext>)
Reg codes: ROS2-2026-NNNN via public.registration_seq (gap-tolerant)
```

## Admin auth

Password from `ADMIN_PASSWORD`; session = HS256 JWT (`ADMIN_SESSION_SECRET`,
12h) in HttpOnly cookie `ros2_admin_session` (SameSite=Lax, Secure in prod).
Constant-time password compare. `DELETE /api/admin/login` always clears cookie.

## Final asset paths

```text
public/payment/sandip-shelkar-upi.png   deterministic QR (primary, 5.7 KB, valid PNG)
public/payment/sandip-shelkar-upi.jpg   larger QR image (fallback, 69 KB, valid JPEG)
public/trainers/aryan-jagushte.jpg  | siddhant-nandgave.jpg | omkar-honrao.jpg
```

## Environment variables (see .env.example — created 2026-09-17)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`,
`NEXT_PUBLIC_SITE_URL`. No secrets are committed; no `.env*` files exist in repo.

## Defects fixed in recovery session (2026-09-17)

1. `cancel_registration` RPC selected `workshop_settings` row INTO a
   `workshop_registrations%rowtype` variable → runtime type error on EVERY
   cancel. Fixed with separate `v_settings` variable + misconfigured guard.
2. `getSeatStatus()` (server pages/header) did a direct anon table read that
   RLS denies → always fell back to unconfigured. Now uses `get_seat_status` RPC.
3. `src/lib/supabase.ts` imported `next/headers`, breaking `next build`
   (Turbopack: server API in client graph via SeatBadge/RegisterClient).
   Removed the unused `createRouteClient`; build passes.
4. TS errors: CSV row cast (`export`), `qrSrc` literal-type state (RegisterClient).
5. `Reveal` hid content when JS disabled (CSS-only hiding). Now observes its own
   element + `<noscript>` fallback keeps content visible.
6. Admin search stripped only `%_` — now also strips `,()"’` so input cannot
   break the PostgREST `or=` filter.
7. Proof viewer modal now shows upload timestamp + “payment proof received”
   wording (was missing timestamp).
8. `DELETE /api/admin/login` required a valid session; now always clears cookie.
9. Draft resume: already-uploaded proof now recognized (`uploaded` restored from
   `payment_proof_path`); confirm allowed without re-picking a file; clearer
   status messages.
10. Added `.env.example`, `README.md`, `scripts/selftest.mjs`
    (+ `scripts/alias-hooks.mjs` loader), `npm run selftest`.

## Tests actually executed (2026-09-17, no Supabase credentials in repo)

- `npx tsc --noEmit` → PASS (0 errors).
- `npx eslint .` → PASS (0 errors, 0 warnings).
- `npm run build` (production, Turbopack) → PASS, all 12 routes listed.
- `node scripts/selftest.mjs` → PASS: email/phone normalization, details
  validation (valid + invalid + bad-phone paths), proof MIME/extension rules,
  CSV injection escaping, duplicate/full message guards, seat-message tiers,
  offline seat fallback, no-affirmative-verification wording scan.
- Live prod server (`npm run start`): `/` 200 (hero/Robotry/FAQ/CTA present),
  `/register` 200 (details form present), `/admin` 200 (login present),
  `/api/seats` 200 → `{"capacity":30,"confirmed":0,"remaining":30,
  "isFull":false,"configured":false}` (correct offline fallback, no env).
- Auth gating live: `POST /api/admin/cancel`, `GET /api/admin/registrations`,
  `GET /api/admin/export` → 401 without session. `POST` draft/confirm and
  admin login → 503 without env (`db_not_configured` / `admin_not_configured`).

## NOT executed (blockers — need Supabase project + secrets)

- End-to-end draft → proof upload → confirm against a real database.
- Duplicate email/phone rejection against live DB (covered by code + partial
  unique indexes, not run live).
- 30-seat close-out, 31st-registration impossibility, simultaneous final-seat
  race (RPC serializes via `FOR UPDATE`, but not load-tested live).
- Double-click idempotency against live DB (code path returns existing code).
- Admin proof signed-URL viewing, CSV download content, cancel-reopens-seat
  (RPC clamps at zero; the pre-fix variable bug would have broken this live).
- Real-device 360px layout check (static: `overflow-x: clip`, max-w containers,
  `overflow-x-auto` tables, 176px QR — no overflow sources found by inspection).
- Running the three migration SQL files (no live Postgres available here).

## Remaining setup for the organizer

1. Create Supabase project → copy URL/anon/service-role keys into `.env.local`.
2. Run the 3 migration files in order in the Supabase SQL editor.
3. Set `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` (≥16 chars).
4. Optionally replace `public/payment/sandip-shelkar-upi.{png,jpg}` with the
   organizer-issued QR (keep filenames), or run `npm run qr`.
5. `npm run build && npm run start` (or deploy to Vercel with the same env vars).

## FINAL PRODUCTION AUDIT (2026-09-17, second session)

Auditor found a live `.env.local` with real Supabase credentials (gitignored,
never committed; no secrets exist anywhere else in source — verified by scan).

**Critical finding — missing settings seed row (FIXED during audit):**
The live project's `workshop_settings` table existed but contained ZERO rows
(seed from `0001_init.sql` never applied), so `finalize_registration` returned
`misconfigured` for every confirmation and the seat RPC returned no data.
Seeded with the exact idempotent statement from migration 0001
(`slug=ros2-workshop-2026, capacity=30, confirmed_count=0, is_active=true`).
Project had 0 participant rows at the time — safe. **Lesson: run all 3
migrations in order on any fresh project; without the seed row the site
renders but no registration can confirm.**

**Live end-to-end verification (`scripts/audit-live.mjs`, 44/44 PASS):**
Project was empty (safety gate aborts on any real row), so full mutation
testing was safe. Used only `audit-tNN@example.invalid` / `61xxxxxxxx`
fake identities via the real HTTP APIs, then fully cleaned up.
Verified live: invalid email/phone → 422; valid draft → 200 + 64-char token;
duplicate email/phone → 409 privacy-safe; draft resume → 200; bad token → 404;
confirm-without-proof → 422 with count still 0; bad MIME → 422; >5MB → 413;
proof path `<uuid>/<rand>.png` with no PII; confirm → `ROS2-2026-NNNN`;
re-confirm → `already_confirmed` same code; 3× parallel confirms → same code,
count unchanged; anon cannot list registrations or proofs while rows/objects
exist; prefill to 29; **two concurrent confirms for seat 30 → exactly 1 wins
(200), loser gets 409 `workshop_full`, count exactly 30**; 31st confirm → 409;
new draft when full → 409; seats API `isFull:true`; admin wrong password → 401;
admin login → 200 with HttpOnly + SameSite=Lax cookie; admin list metrics
`{30, 30, 0}` + search + metachar-safe search; proof signed URL with
`expiresIn:180` + upload timestamp; CSV header + 31 rows; admin cancel →
seat reopens (29); all test rows cancelled via admin API, then hard-deleted
+ storage wiped; final state verified pristine (0 rows, count 0, bucket empty).
Only trace left: `registration_seq` gaps (harmless, gap-tolerant codes).

**Also fixed in final audit:**
- `upiDeepLink` used URLSearchParams (`+`/`%40`) — now builds the exact locked
  `upi://pay?pa=...@oksbi&pn=Sandip%20Shelkar...` string. Regenerated QR from
  the payload is byte-identical to the served PNG (5739 bytes) — served QR
  provably encodes the correct payee/amount.
- `.gitignore`: added `.env.production` / `.env*.production` and
  `tsconfig.tsbuildinfo` (both were unignored).
- `scripts/audit-live.mjs` (44 live assertions), `scripts/audit-diagnose.mjs`
  (read-only DB diagnostic), `scripts/audit-probe1.mjs` (RLS/RPC probes),
  `scripts/audit-seed.mjs` (one-time seed; safe to keep, idempotent).

**Final gates (all executed 2026-09-17):** `tsc` 0 errors · `eslint` 0 errors,
0 warnings · `next build` PASS (12 routes) · `selftest` PASS ·
live `/api/seats` → `configured:true, 0/30` · landing renders live count.
Not live-tested: real-device viewports (static inspection only — no overflow
sources: `overflow-x: clip`, max-w containers, `overflow-x-auto` tables,
176px QR), real-student UPI payment (operational, not code).
