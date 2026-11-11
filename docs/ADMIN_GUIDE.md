# Admin guide

Open **https://your-domain/admin** and sign in with an account that has the _admin_ or _staff_ role ([SETUP §6](SETUP.md#6-create-the-first-admin-user)). Everything you save appears on the store straight away; there's no "publish site" button.

- **Staff** can do everything below except **Settings** (store details, shipping, roles).
- **Admins** can do everything.
- The left sidebar shows little number badges for things waiting on you: orders to ship, low stock, open returns, failed payments, reviews to approve, unread messages and abandoned carts.
- The search bar at the top finds orders (by number, name, email or phone), products (by name or SKU) and customers.
- The moon icon switches the admin to dark mode. It works on phones and tablets too (use the ☰ menu).

> Screenshots: the storefront screenshots are in `docs/screenshots/`. The admin panel needs your own Supabase login to display, so take your own screenshots once it's set up.

---

## 1. Add a product

**Products → Add product.**

1. **Basics**: type the name. The web address (`/product/the-tulip-tote`) fills in by itself. Add a one-line short description (shown near the price) and the full description (bold, headings, lists and links are available in the toolbar).
2. **Photos**: drag photos into the box, or click to choose them. They're shrunk and compressed automatically, so you can upload straight from your camera.
   - Drag photos (or use the ← → arrows) to change the order.
   - ★ marks the **primary** photo, the one shown on product cards.
   - Use the **colour** dropdown under each photo to tag it to a colour. When a shopper picks _Olive_, only the olive photos (and any "All colours" photos) are shown.
   - Fill in **alt text**, a short description of each photo. It helps blind shoppers and Google.
   - **360° sequence** (optional): upload 24–36 photos taken while turning the bag on a turntable, named `01.jpg`, `02.jpg`… The product page then shows a drag-to-rotate viewer.
3. **Colours & stock**: click a _Quick add_ colour or **Add colour**. For each colour, set the swatch colour, **SKU** (filled in for you), **stock**, and an optional different price. Choose which colour is shown first with **Default**.
4. **Details & dimensions**: material, width, height, depth, strap drop, weight and care instructions.
5. **Pricing** (right side): price including GST, an optional compare-at price (shown crossed out, with a "Sale" badge), and **cost price**, which stays private and is used for profit reports. Also set the GST % and the low-stock alert level.
6. **Organisation**: category, collection and styles (Work Ready, Everyday Chic…).
7. **Status**: _Draft_ is hidden and _Published_ is live. To launch at a set time, choose _Published_ and fill in **Schedule publish**. Tick _Trending_ to show the product on the home page, and _New In_ for the New In page.
8. Click **Save**.

**Other actions**

- **Duplicate** (the copy icon next to Save) makes a draft copy. It's handy for a similar product.
- In the product list, tick several products and use **Publish / Move to draft / Feature / Archive / Delete**. _Archive_ hides a product but keeps its order history; prefer it over Delete.
- **Change stock quickly**: type the new number in the stock box next to a colour in the list and click **Save**.
- **CSV**: use **Export CSV** to download everything. **Import CSV** creates or updates products in bulk. Download the template from the import window: one row per colour, matched by `slug` and `sku`.

## 2. Inventory

**Inventory** lists every colour with its stock. _Low_ means the stock is at or below the product's alert level.

- **Adjust**: add a restock (`+20`), record a damaged item (`-1`, type _Manual adjustment_) or a customer return. A reason is always required.
- **Recent stock movements** shows every change: sales, cancellations, returns and edits, with who made them and when.
- Stock is taken **when an order is placed**. If an online payment isn't completed within 45 minutes, that stock comes back automatically.
- A low-stock summary email is sent each morning (you can turn it off in Settings → Notifications).

## 3. Manage orders

**Orders** has two views: **List** (filter by status, payment or date, and search) and **Board**, a column per stage that's great for packing. Red cards on the board are orders waiting more than 3 days to ship.

Open an order to:

1. **Update status**, which follows the flow _Placed → Confirmed → Shipped → Out for delivery → Delivered_.
   - When you choose **Shipped**, enter the courier, tracking number and tracking link. The customer gets a "Your order has shipped" email with the link.
   - Keep **Email the customer** ticked to send the matching email automatically.
   - Marking a **COD** order _Delivered_ also marks it paid.
2. **Cancel**: choose _Cancelled_. Stock is returned, and an online payment is refunded through Razorpay automatically.
3. **Refund**: full or partial. Online payments are refunded through Razorpay (it takes 5–7 days to reach the customer). For COD orders, pay the customer by UPI or bank transfer; the button records it.
4. **Invoice** downloads a GST invoice PDF. **Packing slip** opens a printable list for the parcel.
5. **Internal notes** are seen by staff only.

"Awaiting payment" orders are online checkouts that haven't been paid yet. They're hidden from the main list (use the status filter to see them) and are released after 45 minutes.

## 4. Returns & exchanges

Customers request returns from **My Orders** within 15 days of delivery. In **Returns**, click **Manage**:

- **Approved** → arrange a pickup with your courier.
- **Received** → the item is back. Tick _Put the items back into stock_.
- **Refunded** → enter the amount. Razorpay refunds automatically, and the order becomes _Returned_.
- **Exchanged** or **Rejected** → add a note explaining why.

Every change can email the customer.

## 5. Coupons

**Coupons → Create coupon.**

- **Percentage** (for example 10%, with an optional maximum like ₹1,000) or **Flat** (for example ₹500 off).
- **Minimum order**, **total usage limit**, **uses per customer**, and start and end dates.
- **Apply automatically** means no code is needed: the best eligible automatic coupon is applied at checkout. Use it for site-wide sales.
- The **Used** column shows how many times each coupon has been redeemed. The _Coupon usage_ report in Analytics shows discount cost and revenue.

The sample data includes `WELCOME10` (10% off over ₹1,500, once per customer, as mentioned in the welcome email) and `FESTIVE500`.

## 6. Edit the home page and content

**Homepage & banners**

- **Hero slides**: add up to about 5. Use a landscape image (1920×1080) and, optionally, a portrait mobile image (900×1200). Set the headline, subtext, button text and link, and the order. Untick _Show this slide_ to hide one.
- **Announcement bar**: the strip at the very top, with up to 4 messages and an optional link.
- **Homepage sections**: tick or untick to show or hide sections, and use the arrows to reorder them.
- **Trust strip**: the five promises under the hero.
- **Banners**: the _Crafted with Care_ text and image, the **process video** (paste a YouTube link or an `.mp4` link; it loads only when someone presses play), the _More Than a Bag_ banner and the newsletter text.

**Journal**: write posts with a cover image and tags. _Published_ shows the post at `/journal`; a future publish date schedules it.

**Pages & FAQs**

- Edit Our Story, Care Guide, Shipping Policy, Returns & Exchanges, Privacy Policy and Terms. The **slug** is the web address. Keep the built-in slugs as they are.
- **FAQs** power the Help Centre. Tick _Show in Popular Questions_ for the top ones.

**Categories & styles**: rename them, change their images and order, or hide them. **Charms**: the "Make It Yours" add-ons, with price, stock and image.

## 7. Customers, reviews, messages and newsletter

- **Customers**: order count, lifetime value and last order. Open a customer to see their orders, addresses and wishlist, add private notes, or **block** them (blocked customers can't place orders).
- **Reviews**: only customers whose order was _Delivered_ can review. New reviews wait under **Pending**. **Approve** to publish, **Hide** to remove, or **Reply** publicly.
- **Messages**: contact-form inbox. **Reply** sends an email from the store, and the message is marked replied.
- **Newsletter**: subscribers list. **Export CSV** to import into Mailchimp, Brevo or similar.

## 8. Payments and abandoned carts

- **Payments**: every Razorpay and COD payment, with status (successful, pending, failed, refunded) and the error reason for failures. At the bottom, the **webhook log** shows each message Razorpay sent. "Invalid signature" means the webhook secret doesn't match Vercel's.
- **Abandoned carts**: shoppers who were signed in, or who typed their email at checkout, added items and left for over an hour. A reminder email goes out automatically each morning (once per cart), or click **Send reminder**. Carts that later become orders show as _Recovered_.

## 9. Reading the analytics

Pick a date range at the top (7, 30 or 90 days, 12 months, or custom). Every number is compared with the **previous period of the same length**: ↑ green is better, ↓ red is worse.

| Number              | Meaning                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Revenue             | Total of placed orders (not cancelled), including shipping and GST                         |
| Orders / AOV        | Number of orders and average order value                                                   |
| Conversion rate     | Orders ÷ visits (sessions). 1–3% is typical for fashion                                    |
| Visitors / sessions | Unique people, and their visits (a session ends after 30 minutes of inactivity)            |
| New vs returning    | First-time buyers vs people who had bought before                                          |
| Gross profit        | Revenue − shipping − cost price of the items (fill in cost prices for this to be accurate) |
| Refund rate         | Share of orders that were returned or refunded                                             |

- **Funnel**: how many visits reached a product, the bag, checkout and purchase. A big drop between _Checkout_ and _Purchase_ usually means a payment or shipping-cost problem.
- **Top products**: the _View → purchase_ column shows which products persuade best.
- **Traffic sources / UTM campaigns**: add `?utm_source=instagram&utm_medium=social&utm_campaign=diwali` to links in your posts and ads to see exactly which ones sell.
- **Searches with no results**: words customers expect to find. Consider adding them to product names or descriptions.
- **Cohorts**: of the customers who first bought in a given month, how many came back in later months.
- **Real-time** (on the Dashboard): visitors in the last 5 minutes and the latest orders, refreshing every 15 seconds.

Every report has a **CSV** link. City and state figures appear once the site is on Vercel, which provides location from the visitor's network.

## 10. Settings (admins only)

- **Store information**: printed on invoices, emails and the contact page. Add your **GSTIN**.
- **Shipping, COD & returns**: the free-shipping threshold, flat rate, COD on/off, COD fee and maximum, and delivery days. These rules are enforced at checkout.
- **Integrations status**: a green tick means a service is connected correctly.
- **Email templates**: send yourself a test of each email.
- **Team & roles**: give _staff_ or _admin_ access to an existing account by email, or set it back to _customer_ to remove access.

## 11. Audit log

Every admin action (price change, status update, refund, role change…) is recorded with who did it and when. Use the search box to filter.
