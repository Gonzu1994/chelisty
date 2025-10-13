export default function Home() {
  const tiles = [
    { name: 'Hotel', href: '/area/Hotel' },
    { name: 'Restauracja', href: '/area/Restauracja' },
    { name: 'Budki', href: '/area/Budki' },
    { name: 'Dashboard', href: '/dashboard' }
  ]
  return (
    <main className="grid-tiles">
      {tiles.map(t => (
        <a key={t.name} href={t.href} className="card text-center">
          <div className="text-xl font-semibold">{t.name}</div>
        </a>
      ))}
    </main>
  )
}
