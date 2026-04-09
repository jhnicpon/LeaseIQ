export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      {/* Stats grid skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-800 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-800/60 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-800 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-28 bg-gray-800 rounded" />
              <div className="h-9 w-9 bg-gray-800 rounded-lg" />
            </div>
            <div className="h-9 w-16 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-5 w-36 bg-gray-800 rounded" />
              <div className="h-4 w-16 bg-gray-800/60 rounded" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40">
                  <div className="h-5 w-5 bg-gray-700 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-700 rounded mb-1.5" />
                    <div className="h-3 w-1/2 bg-gray-800 rounded" />
                  </div>
                  <div className="h-5 w-12 bg-gray-700 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
