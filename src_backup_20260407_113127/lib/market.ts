import axios from 'axios';

export async function getMarketData() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/price');
    return res.data.slice(0, 20);
  } catch {
    return [
      { symbol: 'BTCUSDT', price: '68500.00' },
      { symbol: 'ETHUSDT', price: '3520.00' },
      { symbol: 'BNBUSDT', price: '598.00' },
      { symbol: 'SOLUSDT', price: '182.00' },
      { symbol: 'XRPUSDT', price: '0.62' }
    ];
  }
}
