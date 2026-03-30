# 🍽 Restaurant Website

A full-featured restaurant ordering platform built with React + Vite + Supabase.

## ✨ Features

### User
- Google OAuth login (mandatory)
- Browse menu with filters (category, veg/non-veg, price, rating)
- Today's special with discount display
- Cart with quantity controls, coupon auto-apply
- Checkout with address confirmation
- Real-time order status with sound notifications
- Floating progress bar (10% → 35% → 70% → 100%)
- Rate & review orders after delivery
- Profile management

### Owner (hidden in About page — click restaurant name 5 times)
- Live order dashboard with real-time alerts + sound
- Update order status (auto-reflected to user in real time)
- Full menu management (add/edit/delete/toggle availability)
- Set Today's Special item & price
- Create/manage discount coupons
- Open/close restaurant (banner shown to all users)
- Change delivery charges & tax percentage
- View complete order history
- Change owner password from dashboard

---

## 🚀 Setup Instructions

### Step 1 — Unzip and Install Dependencies

Unzip the project folder, open a terminal inside it, and run:

```bash
npm install
```

> ⚠️ You may see 2 moderate severity vulnerabilities related to `vite`. These are
> known issues in certain Vite versions and do **not** affect your production build
> or your users. They only relate to the local dev server. You can safely ignore them,
> or run `npm audit fix` and verify nothing breaks.

---

### Step 2 — Create a Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and sign in (or create a free account).
2. Click **"New Project"**.
3. Fill in:
   - **Project name**: anything you like (e.g. `restaurant-site`)
   - **Database password**: choose a strong password and **save it somewhere safe**
   - **Region**: pick the one closest to your location (e.g. South Asia)
4. Click **"Create new project"** and wait about 1–2 minutes for it to finish provisioning.

---

### Step 3 — Run the Database Schema

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar.
2. Click **"New query"**.
3. Open the `schema.sql` file from this project in any text editor.
4. **Select all** the text and **paste** it into the SQL Editor.
5. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter).
6. You should see a success message. This creates all your tables, policies, and sample data.

> ⚠️ **Important:** The last section of `schema.sql` contains lines starting with `--`.
> Those are SQL comments — they are NOT commands. The SQL editor ignores them automatically.
> They are just notes for you to follow manually in later steps. Do not worry about them.

---

### Step 4 — Get Your Supabase Keys

1. In your Supabase dashboard, go to **Settings** (gear icon at the bottom of left sidebar) → **API**.
2. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`
3. In the project folder, find the file called `.env.example`.
4. Make a **copy** of it and rename the copy to exactly `.env` (remove the `.example` part).
5. Open `.env` and replace the placeholder values with yours:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-actual-anon-key-here
```

> 🔒 Never share your `.env` file or upload it to GitHub. The `.gitignore` already excludes it.

---

### Step 5 — Set Up Google OAuth (for User Login)

Users log in with their Google account. For this to work you need to create a Google
OAuth app and connect it to Supabase. Follow these parts in order:

#### Part A — Create a Google Cloud Project

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)** and sign in.
2. At the very top of the page, click the **project name dropdown** (next to the Google Cloud logo).
3. In the popup, click **"New Project"** (top right of the popup).
4. Enter a project name (e.g. `Restaurant Login`) and click **"Create"**.
5. Wait a few seconds, then make sure your new project is selected in the top dropdown.

#### Part B — Configure the OAuth Consent Screen

This is the screen Google shows users when they click "Sign in with Google".

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**.
2. Select **"External"** → click **"Create"**.
3. Fill in the required fields on the first screen:
   - **App name**: your restaurant name
   - **User support email**: your email address
   - **Developer contact information** (at the bottom): your email address again
4. Click **"Save and Continue"**.
5. On the **Scopes** screen — click **"Save and Continue"** without changing anything.
6. On the **Test users** screen — click **"Save and Continue"** without adding anyone.
7. On the **Summary** screen — click **"Back to Dashboard"**.

#### Part C — Create OAuth Credentials

1. In the left sidebar, go to **APIs & Services** → **Credentials**.
2. Click **"+ Create Credentials"** at the top → choose **"OAuth client ID"**.
3. For **Application type**, select **"Web application"**.
4. Give it a name (e.g. `Restaurant Web Client`).
5. Under **"Authorized redirect URIs"**, click **"+ Add URI"** and enter this URL exactly:
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```
   Replace `YOUR-PROJECT-ID` with your actual Supabase project ID. You can find this
   in your Supabase dashboard URL — it's the part before `.supabase.co`.
   For example, if your Supabase URL is `https://abcdefghij.supabase.co`, then enter:
   ```
   https://abcdefghij.supabase.co/auth/v1/callback
   ```
6. Click **"Create"**.
7. A popup will appear with your **Client ID** and **Client Secret**. Copy both values
   and save them somewhere — you'll paste them into Supabase next.

#### Part D — Connect Google to Supabase

1. Go back to your **Supabase Dashboard**.
2. In the left sidebar, go to **Authentication** → **Providers**.
3. Scroll down to find **"Google"** in the list and click on it.
4. Toggle the switch to **ON** (it will turn blue/green).
5. Paste your **Client ID** from Google into the "Client ID" field.
6. Paste your **Client Secret** from Google into the "Client Secret" field.
7. Click **"Save"**.

#### Part E — Allow Your Local Dev URL

This tells Supabase it's okay to redirect users back to your local computer after login.

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Under **"Redirect URLs"**, click **"Add URL"** and type:
   ```
   http://localhost:5173
   ```
3. Click **"Save"**.

> 📝 Later, when you deploy to a real domain, come back here and add that URL too
> (e.g. `https://yourrestaurant.com`).

---

### Step 6 — Create the Owner Account

The owner logs in with email and password (not Google). Here's how to set that up:

#### Part A — Create the User in Supabase Auth

1. In your Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **"Add user"** → **"Create new user"**.
3. Enter an email address for the owner (e.g. `owner@yourrestaurant.com`).
4. Enter a strong password (at least 12 characters).
5. Make sure **"Auto Confirm User"** is checked.
6. Click **"Create user"**.

#### Part B — Grant the Owner Role

Now you need to tell the database that this user is the owner (not a regular customer).

1. Go to **SQL Editor** in your Supabase dashboard.
2. Click **"New query"**.
3. Type **only this one line** — replace the email with the one you just created:

```sql
UPDATE profiles SET role = 'owner' WHERE email = 'owner@yourrestaurant.com';
```

4. Click **"Run"**.
5. You should see `Success. 1 rows affected` — this confirms it worked.

> ⚠️ Only run this single line here. Do NOT paste the entire `schema.sql` again.

---

### Step 7 — Enable Real-Time Updates

Real-time is what makes the order status update live on the user's screen the moment
the owner changes it — and what makes the owner hear the sound alert when a new order arrives.

You need to enable it for two tables. Do this via the Dashboard, not via SQL:

1. In your Supabase Dashboard, go to **Database** (left sidebar) → **Replication**.
2. You'll see a section called **"Source"** with a list of your tables.
3. Find the table called **`orders`** and click the toggle next to it to turn it ON.
4. Find the table called **`restaurant_settings`** and click its toggle to turn it ON.
5. Done — no SQL needed.

> ⚠️ Why not via SQL? Supabase uses a shared internal publication called `supabase_realtime`.
> Running `ALTER PUBLICATION` directly in SQL can interfere with it and cause errors.
> The Dashboard toggle is the correct and safe way to do this.

---

### Step 8 — Start the Dev Server

```bash
npm run dev
```

Open your browser and go to **[http://localhost:5173](http://localhost:5173)**.

Your restaurant website is running locally! 🎉

---

### Step 9 — Access the Owner Dashboard

The owner login is intentionally hidden from regular visitors.

1. Go to the **About Us** page on your website.
2. **Click on the restaurant name heading 5 times** (quickly, one after another).
3. A login popup will appear.
4. Enter the owner email and password from Step 6.
5. Click **"Login as Owner"**.
6. You will be taken to the Owner Dashboard at `/owner`.

From the dashboard you can:
- Add your real menu items (photos, prices, descriptions, categories)
- Set Today's Special with a special discounted price
- Update restaurant name, address, phone number, opening hours
- Create discount coupons for customers
- Toggle the restaurant open or closed
- View and manage all incoming orders in real time

---

### Step 10 — Personalise the Restaurant

1. Log in as owner and open the **Settings** tab.
2. Update every field — name, tagline, address, phone, email, opening hours, delivery charge, tax %.
3. Click **"Save Settings"**.

The restaurant name and all details update instantly across the entire website.

---

## 💳 Payment Integration

The checkout currently **simulates** a payment (2 second delay, then places the order).
This is intentional — the real payment gateway will be decided separately.

When you're ready, the only file to edit is **`src/pages/Checkout.jsx`**.
Find the comment `// Simulate payment processing` and replace that block with your
Razorpay / Stripe / PhonePe SDK code.

---

## 🏗 Tech Stack

| Area | Technology |
|------|-----------|
| Frontend | React 18 + Vite + React Router |
| Styling | Tailwind CSS + Playfair Display + DM Sans fonts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth (users) + Email/Password (owner) |
| Real-time | Supabase Realtime (WebSockets) |
| Sound alerts | Web Audio API — no external audio files needed |
| Notifications | react-hot-toast |

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/              Navbar.jsx, Footer.jsx
│   └── ui/                  MenuItemCard.jsx, OrderProgressBar.jsx
├── context/
│   ├── AuthContext.jsx       Login state, Google auth, owner auth
│   ├── CartContext.jsx       Cart items, quantities, coupons
│   └── RestaurantContext.jsx Settings, open/close state
├── lib/
│   ├── supabase.js           Supabase client setup
│   └── sounds.js             Web Audio notification sounds
├── pages/
│   ├── Home.jsx
│   ├── Menu.jsx
│   ├── TodaysSpecial.jsx
│   ├── Cart.jsx
│   ├── Checkout.jsx          ← Add payment gateway here
│   ├── TrackOrder.jsx
│   ├── Login.jsx
│   ├── Profile.jsx
│   ├── About.jsx             ← Contains hidden owner login
│   ├── Amenities.jsx
│   ├── Testimonials.jsx
│   └── OwnerDashboard.jsx
├── App.jsx
├── main.jsx
└── index.css
```

---

## 👨‍💻 Developer

- **Name**: Your Developer Name
- **Email**: developer@example.com
- **Phone**: +91 00000 00000
