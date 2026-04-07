'use client';

import { useEffect, useState } from 'react';

export default function LiveMarket() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/market')
      .then(res => res.json())
      .then(d => setData(d.data || []));
  }, []);

  return (
    <div style={{
      marginTop:20,
      background:'#0b1220',
      padding:20,
      borderRadius:20,
      border:'1px solid #1f2937'
    }}>
      <h3 style={{marginBottom:15}}>Live Market Feed</h3>
      <div style={{maxHeight:300,overflow:'auto'}}>
        {data.map((item, i) => (
          <div key={i} style={{
            display:'flex',
            justifyContent:'space-between',
            padding:'8px 0',
            borderBottom:'1px solid #1f2937'
          }}>
            <span>{item.symbol}</span>
            <span>{item.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
