# Multi-Timeframe Real-Time Market Signal Analyzer

This version contains **no demo/generated candles**.

## Real data
The app uses Twelve Data for real-time forex prices and real intraday OHLC candles. Twelve Data documents real-time forex data and intraday intervals from 1 minute upward, plus a WebSocket price stream. citeturn0search0turn0search2

## Render setup
- Build command: `npm install`
- Start command: `npm start`
- Add Render environment variable:
  `TWELVE_DATA_API_KEY=YOUR_KEY`

Do NOT put the API key in the HTML or JavaScript.

## Important
This is real external market data, not a direct Quotex quote stream. Therefore it must not be described as tick-for-tick Quotex synchronization. Quotex may use its own quoted rate.

The analyzer does not automatically place real-money trades.
