const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (_, res) => res.json({ok:true, time:Date.now()}));

app.get("/api/price", async (req, res) => {
  const symbol = String(req.query.symbol || "EUR/USD").toUpperCase();
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(503).json({error:"TWELVE_DATA_API_KEY is not configured"});
  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok || data.status === "error") return res.status(502).json({error:data.message || "Market data error"});
    res.json({symbol, price:Number(data.price), time:Date.now(), source:"Twelve Data"});
  } catch(e) {
    res.status(502).json({error:"Unable to reach market-data provider"});
  }
});

app.get("/api/candles", async (req, res) => {
  const symbol = String(req.query.symbol || "EUR/USD").toUpperCase();
  const interval = String(req.query.interval || "1min");
  const outputsize = Math.min(Number(req.query.outputsize || 120), 500);
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(503).json({error:"TWELVE_DATA_API_KEY is not configured"});
  try {
    const u = new URL("https://api.twelvedata.com/time_series");
    u.searchParams.set("symbol", symbol);
    u.searchParams.set("interval", interval);
    u.searchParams.set("outputsize", outputsize);
    u.searchParams.set("apikey", key);
    const r = await fetch(u);
    const data = await r.json();
    if (!r.ok || data.status === "error") return res.status(502).json({error:data.message || "Market data error"});
    const values=(data.values||[]).reverse().map(x=>({time:x.datetime,o:Number(x.open),h:Number(x.high),l:Number(x.low),c:Number(x.close)}));
    res.json({symbol,interval,values,source:"Twelve Data",meta:data.meta||{}});
  } catch(e) {
    res.status(502).json({error:"Unable to reach market-data provider"});
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Realtime analyzer running on ${PORT}`));