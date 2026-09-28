# SentryAgent Live Testing Sites & Benchmarks

The following live public websites and local proving grounds are curated for testing SentryAgent across all capabilities (Forms, HTML Tables, Signatures/Canvases, and Government Portals):

---

## 1. Complex Form Redaction & PII Inputs
* **[DemoQA Automation Practice Form](https://demoqa.com/automation-practice-form)**
  * **URL:** `https://demoqa.com/automation-practice-form`
  * **Test Focus:** Tests all standard and custom form controls:
    * First & Last Names (`<PERSON_1>`, `<PERSON_2>`)
    * Email (`<EMAIL_1>`)
    * Gender Radio Button (`<GENDER_1>`)
    * Mobile 10-Digit Number (`<PHONE_NO_1>`)
    * Date of Birth (`<DOB_1>`)
    * Subjects Multi-Select Auto-complete (`<CONFIDENTIAL_1>`)
    * Hobbies Checkboxes (`<PREFERENCE_1>`)
    * Picture File Upload (`<DOCUMENT_1>`)
    * Current Address (`<ADDRESS_1>`)
    * State & City Dropdowns (`<LOCATION_1>`, `<LOCATION_2>`)

---

## 2. Structured HTML Data Tables
* **[W3Schools HTML Tables](https://www.w3schools.com/html/html_tables.asp)**
  * **URL:** `https://www.w3schools.com/html/html_tables.asp`
  * **Test Focus:** Tests automatic table column detection and cell blackboxing:
    * `Company` column $\rightarrow$ `<COMPANY_n>`
    * `Contact` column $\rightarrow$ `<PERSON_n>`
    * `Country` column $\rightarrow$ `<LOCATION_n>`
* **[Wikipedia - List of Space Agencies](https://en.wikipedia.org/wiki/List_of_space_agencies)**
  * **URL:** `https://en.wikipedia.org/wiki/List_of_space_agencies`
  * **Test Focus:** Large-scale real-world table with Agency, Country, Established Date, and Budget.

---

## 3. On-Device Vision & Digital Signature Canvas
* **[Signature Pad Testbed](https://szimek.github.io/signature_pad/)**
  * **URL:** `https://szimek.github.io/signature_pad/`
  * **Test Focus:** Draw any signature or handwritten text on the HTML5 canvas; SentryAgent runs DBNet neural vision / CCL to burn opaque blackboxes over the signature strokes locally.

---

## 4. Government & Enterprise Portals
* **[ISRO Official Portal](https://www.isro.gov.in)**
  * **URL:** `https://www.isro.gov.in`
  * **Test Focus:** Navigation, DOM parsing, and mission telemetry.
* **[Central Public Procurement Portal (CPPP)](https://eprocure.gov.in)**
  * **URL:** `https://eprocure.gov.in`
  * **Test Focus:** Government tender contracts, GSTIN numbers, and commercial quotes.
* **[Income Tax India e-Filing](https://www.incometax.gov.in)**
  * **URL:** `https://www.incometax.gov.in`
  * **Test Focus:** Indian PAN and 12-digit Aadhaar input fields with Verhoeff checksum validation.

---

## 5. Local Offline Testbed (SIH26171 Proving Ground)
* **[Local Testbed Dashboard](file:///c:/Users/iqand/Downloads/HACK/SIH_3/testbed/index.html)**
  * **Path:** `testbed/index.html` (open directly in Chrome)
  * **Test Focus:** 3 interactive portals:
    1. **e-Procurement Portal:** Commercial tender bids, GSTIN, and vector signature canvas.
    2. **Internal HR & Deputation:** Employee records, Aadhaar numbers, and biometric badge avatar.
    3. **ISTRAC Mission Operations:** Satellite telemetry clusters and Tier-4 hardware execution gates.
