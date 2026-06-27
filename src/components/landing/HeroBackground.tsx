export default function HeroBackground() {
  return (
    <div
      className='absolute inset-0 pointer-events-none'
      aria-hidden='true'
      style={{ background: 'linear-gradient(165deg, #fbfdff, #eef5fd 48%, #e6f1fc)' }}
    >
      <div
        className='blob-1 absolute rounded-full'
        style={{
          width: '620px', height: '520px',
          top: '-130px', right: '8%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.30) 0%, transparent 70%)',
          filter: 'blur(52px)',
        }}
      />
      <div
        className='blob-2 absolute rounded-full'
        style={{
          width: '520px', height: '440px',
          bottom: '-90px', left: '4%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.34) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className='blob-3 absolute rounded-full'
        style={{
          width: '420px', height: '360px',
          top: '28%', left: '32%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)',
          filter: 'blur(68px)',
        }}
      />
    </div>
  )
}
