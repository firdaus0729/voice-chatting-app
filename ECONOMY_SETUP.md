# Economy System – Wallet & Gifting

Wallet and gifting are **server-validated** via Firebase Cloud Functions. All balance changes are **atomic** and **race-condition safe**.

---

## 1. Wallet system

- **Coins:** Spendable (gifts).
- **Diamonds:** Income (received from gifts at 60% of coin value).
- **Updates:** Only via Cloud Function `sendGift`. Client **never** writes wallet balances directly.
- **Audit:** Server sets `updatedAt` and `lastTransactionId` on wallet docs; each gift is stored in `transactions` with `transactionId`, `createdAt`, `source: 'gift'`.

---

## 2. Gifting system

### Gift catalog (must match client and server)

| ID      | Name    | Price (coins) |
|--------|---------|----------------|
| rose   | Rose    | 10             |
| heart  | Heart   | 50             |
| crown  | Crown   | 100            |
| diamond| Diamond | 200            |
| rocket | Rocket  | 500            |

- **Flow:** Sender coins decrease by gift price; receiver diamonds increase by `floor(price * 0.6)`.
- **Guards:**
  - **Double spend:** Single Firestore transaction: read both wallets, validate balance, debit/credit, write transaction doc.
  - **Spam:** Max 10 gifts per sender per minute (rate limit in Cloud Function).

### Gifting animation

- On successful send, client shows a Lottie overlay (from gift `animationUrl`) for ~2s, then a success toast.

---

## 3. Firestore hardening

- **Wallet:** `wallet/{userId}` – `userId`, `coins`, `diamonds`, `updatedAt`, `lastTransactionId`. Writes only from Cloud Functions.
- **Transactions:** `transactions/{transactionId}` – `transactionId`, `senderId`, `receiverId`, `giftId`, `coinAmount`, `diamondAmount`, `createdAt`, `source: 'gift'`. Writes only from Cloud Functions.
- **Rules:** `wallet` and `transactions` are read-only for clients; only Functions (admin) can write.

---

## 4. Cloud Functions

- **createWallet(userId):** Creates wallet with 1000 coins, 0 diamonds only if the doc doesn’t exist. Called from the client after signup.
- **sendGift({ senderId, receiverId, giftId }):** Atomic gift: debits sender coins, credits receiver diamonds (60% rate), writes transaction, rate-limited (10/min per sender).

### Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Ensure `firebase.json` and Firebase project are set (`firebase use <project>`).  
First run: `firebase login` and `firebase init` if needed.

---

## 5. Testing

- **Insufficient balance:** Send gift with coins &lt; price → "Insufficient coins", balance unchanged.
- **Rate limit:** Send &gt;10 gifts in 1 minute → "Too many gifts. Try again in a minute."
- **Concurrent gifts:** Two clients send at once → transaction retries; balances never go negative.
- **Receiver missing:** Send to new userId → receiver wallet doc is created with credited diamonds.

---

## 6. APK safety

- No new native dependencies; only Firebase (client + callable HTTPS).
- Rebuild: `npx expo prebuild` then `npx expo run:android`, or `eas build -p android --profile preview`.
- Verify: open Wallet → select gift → Send (to self or another userId) → balance updates after success; insufficient balance and rate limit show correct toasts.

---

## 7. UI/UX summary

- **Balance:** Coins and diamonds with loading state.
- **Gift grid:** Catalog with icon, name, price; disabled when balance &lt; price or during send.
- **Receiver:** Text input (blank = send to self).
- **Send:** Button disabled when no selection, insufficient balance, or processing; label shows "Sending…" / "Insufficient coins" / "Select a gift" as appropriate.
- **Success:** Lottie overlay then toast; balance updates via real-time listener.
