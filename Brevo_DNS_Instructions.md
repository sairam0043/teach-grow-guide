# Guide: Verifying `cuvasol.com` in Brevo via AWS Route 53

Follow this step-by-step guide to manually configure the DNS records for **`cuvasol.com`** inside your AWS Route 53 dashboard.

---

## 💡 Why we are configuring `cuvasol.com` instead of `tutor.cuvasol.com`

* **CNAME Conflict:** The subdomain `tutor.cuvasol.com` already has a CNAME record pointing to our website hosting. Under DNS rules, a hostname with a CNAME record cannot have any other records (like a TXT record) on it. 
* **The Solution:** By authenticating the root domain `cuvasol.com` instead, we avoid this conflict entirely. This successfully authorizes both `@cuvasol.com` and its subdomains (like `@tutor.cuvasol.com`) to send emails via Brevo.
* **Amazon SES Compatibility:** You can have multiple TXT records on the root domain, so we will append the Brevo verification code to your existing Amazon SES TXT record in AWS.

---

## Quick Reference: Records to Add in AWS Route 53

In the AWS Route 53 Console, select the hosted zone for **`cuvasol.com`**, and add or update these four records:

| Record # | Record Type | Record Name (Subdomain) | Value (Route traffic to) | Action in Route 53 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **TXT** | `@` *(leave blank)* | `"brevo-code:8c6ac149994a0120496cdaa0682cb117"` | **Edit Existing Record** (Append on a new line) |
| **2** | **CNAME** | `brevo1._domainkey` | `b1.cuvasol-com.dkim.brevo.com` | **Create New Record** |
| **3** | **CNAME** | `brevo2._domainkey` | `b2.cuvasol-com.dkim.brevo.com` | **Create New Record** |
| **4** | **TXT** | `_dmarc` | `"v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com"` | **Create New Record** (or edit existing if it exists) |

---

## Detailed Step-by-Step Instructions

### Step 1: Open AWS Route 53
1. Log in to the [AWS Management Console](https://console.aws.amazon.com) using your AWS credentials.
2. In the search bar at the top, type and select **Route 53**.
3. In the left navigation panel, click **Hosted zones**.
4. Click on **`cuvasol.com`** (your root domain).

---

### Step 2: Add the Brevo Verification Code (TXT Record)
*Note: Since you already have a TXT record for Amazon SES, we will append Brevo to it.*
1. Scroll through your records and find the existing **TXT** record for **`cuvasol.com`** (the one containing your Amazon SES verification string).
2. Select it and click **Edit record**.
3. In the **Value** text box, add the following code on a **new line** at the bottom (including the double-quotes):
   ```text
   "brevo-code:8c6ac149994a0120496cdaa0682cb117"
   ```
4. Click **Save**.

---

### Step 3: Add DKIM Record 1 (CNAME Record)
1. Click the **Create record** button (top right).
2. **Record name**: Enter `brevo1._domainkey` (it will display as `brevo1._domainkey.cuvasol.com`).
3. **Record type**: Select **CNAME - Routes traffic to another domain name**.
4. **Value**: Paste the following exactly, **without quotes**:
   ```text
   b1.cuvasol-com.dkim.brevo.com
   ```
5. Click **Create records** at the bottom.

---

### Step 4: Add DKIM Record 2 (CNAME Record)
1. Click **Create record**.
2. **Record name**: Enter `brevo2._domainkey` (it will display as `brevo2._domainkey.cuvasol.com`).
3. **Record type**: Select **CNAME - Routes traffic to another domain name**.
4. **Value**: Paste the following exactly, **without quotes**:
   ```text
   b2.cuvasol-com.dkim.brevo.com
   ```
5. Click **Create records**.

---

### Step 5: Add DMARC Security Policy (TXT Record)
1. Check if a record named **`_dmarc`** already exists in your list.
   * **If it exists:** Select it, click **Edit record**, and update the value.
   * **If it does not exist:** Click **Create record**.
2. **Record name**: Enter `_dmarc` (it will display as `_dmarc.cuvasol.com`).
3. **Record type**: Select **TXT - Text**.
4. **Value**: Paste the following exactly, **including the double-quotes**:
   ```text
   "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com"
   ```
5. Click **Save** or **Create records**.

---

### Step 6: Verify in Brevo
1. Go back to your open Brevo browser tab.
2. Click the green button at the bottom: **"Authenticate this email domain"**.
3. *Note: If it does not authenticate immediately, wait 2–5 minutes for the AWS DNS changes to update globally, then click the button again.*
