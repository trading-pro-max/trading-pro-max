export default function CancelPage() {
  return (
    <main style={{
      minHeight:'100vh',
      display:'flex',
      justifyContent:'center',
      alignItems:'center',
      background:'#0b0f19',
      color:'white',
      fontFamily:'Arial'
    }}>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:42,marginBottom:16}}>Payment Cancelled</h1>
        <a href="/" style={{
          display:'inline-block',
          marginTop:20,
          padding:'14px 24px',
          borderRadius:12,
          background:'#111827',
          border:'1px solid #374151',
          color:'white',
          textDecoration:'none',
          fontWeight:700
        }}>
          Back Home
        </a>
      </div>
    </main>
  );
}
