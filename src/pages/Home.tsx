export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Welcome to Terp Storage</h1>
      <p className="text-lg text-gray-600 mb-8">Your personal file storage solution</p>
      <a
        href="/signup"
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Get Started
      </a>
    </div>
  )
}