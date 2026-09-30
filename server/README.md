# Portfolio Tracker — Backend

Express + MongoDB API for the portfolio tracker. Email/password auth (JWT in an
httpOnly cookie). All data is scoped to the logged-in user (`userId`), so the two
accounts never see each other's data.

## Collections

`users`, `portfolios`, `creditcards`, `cardmonthlies`, `snapshots`,
`billpayments`, `trackerentries`, `vitalsreports`.

## Setup

1. Have MongoDB available — either local (`mongod`) or a free MongoDB Atlas cluster.
2. Copy env and fill it in:
   ```
   cp .env.example .env
   # set MONGODB_URI and a long random JWT_SECRET
   ```
3. Install + run:
   ```
   npm install
   npm run dev      # nodemon, http://localhost:4000
   ```

## API

Auth (public): `POST /api/auth/signup`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`.

Data (require auth cookie). Each write changes one item and nothing else:

- `GET /api/portfolio`, `PATCH /api/portfolio` (only the changed fields)
- `GET /api/cards`, `POST /api/cards`, `PATCH|DELETE /api/cards/:cardId`,
  `PUT /api/cards/:cardId/months` (one month's cashback or spend)
- `GET /api/bills`, `PUT|DELETE /api/bills/:kind/:key` (mark paid / unpaid)
- `GET /api/trackers`, `PUT|DELETE /api/trackers/:key/:date` (mark / unmark a day)
- `GET /api/snapshots`, `POST /api/snapshots`
- `GET /api/vitals`, `PUT|DELETE /api/vitals/:date`
- `POST /api/data/reset`

## Test

```
node test/smoke.mjs   # boots the server against an in-memory MongoDB and exercises every route
```
