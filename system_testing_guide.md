# Luggo System Testing & Function Verification Guide

Use this step-by-step guide to verify every key feature and database transition in the Luggo Storage System.

---

## 🔑 Seeding Test Data (Completed)
To allow testing immediately, we have already seeded **10 test reusable bag tags** in your database:
* Codes: `CMB-A-101` to `CMB-A-110`
* Hub: **Luggo Colombo Fort** (CMB)
* Status: `available` (unassigned)

---

## 🧳 Step 1: Staff Walk-In Customer Flow
1. **Log in to the Staff Portal** (assigned to Hub: *Luggo Colombo Fort*).
2. On the **Staff Dashboard**, click the **Walk-in** button in the top navigation bar.
3. Fill out the Walk-in Form:
   * **Full Name**: Enter any test name (e.g. `John Doe`).
   * **Phone Number**: Enter a Sri Lankan phone number (e.g. `0771234567`).
   * **NIC / Passport Number**: Enter an ID reference (e.g. `950123456V`).
   * **Luggage Details**: Add 2 bags (e.g. select `Laptop / Handbag` and `Large Suitcase`).
   * **Expected Collection Time**: Pick a future time (e.g., tomorrow).
   * *Verify pricing calculation preview updates dynamically based on the selected hours.*
   * **Payment Mode**: Choose **Cash Collected at Hub**.
4. Click **Create & Continue**.
   * *Verify that you are redirected directly to the Bag Registration page:* `/staff/booking/[bookingId]/bags`.

---

## 🔒 Step 2: Reusable Tag & Seal Registration (Drop-off)
1. On the Bag Registration page:
   * **Bag 1**: 
     * Enter Tag Code: `CMB-A-101`
     * Enter Seal Number: `S-55555`
   * **Bag 2**:
     * Check **"Seal cannot be applied (backpack/zipper-less)"**.
     * *Verify that the Seal Number field disappears and the "Notes" field is requested.*
     * Input Note: `Standard backpack, side zippers only`.
2. Click **Confirm & Move to active_storage**.
   * *Verify that the booking is successfully created, tags are locked, and you are redirected back to the Dashboard.*
3. On the Dashboard:
   * Click the **Stored** tab.
   * Search for `John Doe` or tag code `CMB-A-101` in the search bar.
   * *Verify that your walk-in booking is found instantly.*
   * Click on the booking card to view details. Confirm the tags and seal details are listed correctly.

---

## ⚠️ Step 3: Incident Report & Exception Hold Lock
1. Go to the Staff Dashboard and locate the active booking (`John Doe`).
2. Click the booking to view details.
3. Scroll to the actions footer (or navigate to `/staff/pickup/[bookingId]`).
4. Click **Process Incident** (or create an incident report in database/console):
   * **Incident Type**: Choose `seal_broken` or `seal_missing`.
   * **Description**: Enter details (e.g. `Outer bag pocket seal broken during audit`).
   * Submit the incident report.
5. On the Dashboard:
   * *Verify that the booking is locked under **Holds ⚠️** tab and shows a red operations alert.*
   * Try to complete pickup as standard staff. *Verify that the handover action is completely blocked and prompts for supervisor approval.*

---

## 🛡️ Step 4: Supervisor Incident Override
1. Log in with a **Supervisor** profile (`support_admin`, `ops_admin`, or `master_admin`).
2. Navigate to the pickup page: `/staff/pickup/[bookingId]`.
3. In the active incidents list:
   * Enter a resolution note (e.g. `Checked bag contents with customer, replaced seal CMB-A-101 with new seal S-66666`).
   * Click **Resolve & Unlock Booking**.
   * *Verify that the booking status is unlocked to `ready_for_release` and the incident is resolved.*

---

## 💵 Step 5: Overdue Late Fee Waiver (Supervisor Override)
1. Adjust the booking's expected pickup time in the database to be in the past to trigger a late fee, OR test with an overdue check.
2. If late fee applies:
   * *Verify that the late fee collection form appears.*
3. As a **Supervisor**, click **Authorize Waiver (Supervisor Override)**.
   * *Verify that late fees are successfully waived, database updates payment records, and booking moves to `ready_for_release`.*

---

## 📦 Step 6: Handover Complete & Tag Release (Pickup)
1. Once status is unlocked/ready for release, click **Confirm Handover Complete & Release Tags**.
2. *Verify the transactional changes in Supabase database:*
   * Booking status moves to `completed`.
   * Booking bags status moves to `released`.
   * Reusable Bag Tags (`CMB-A-101`, etc.) return to `available` status with `current_booking_id` set to `null` so they can be reused for the next customer booking.
