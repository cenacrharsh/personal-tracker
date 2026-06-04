# Portfolio Tracker — Backend

Express + MongoDB API for the portfolio tracker. Email/password auth (JWT in an
httpOnly cookie). All data is scoped to the logged-in user (`userId`), so the two
accounts never see each other's data.

## Collections

`users`, `portfolios`, `creditcards`, `cardmonthlies`, `snapshots`,
`billpayments`, `trackerdefs`, `trackerentries`.

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

Data (require auth cookie): `GET|PUT /api/portfolio`, `GET|PUT /api/cards`,
`GET /api/snapshots` + `POST /api/snapshots`, `GET|PUT /api/bills`,
`GET|PUT /api/trackers`, `POST /api/data/reset`.

## Test

```
node test/smoke.mjs   # boots the server against an in-memory MongoDB and exercises every route
```
