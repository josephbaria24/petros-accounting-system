// app/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="h-9 w-48 bg-slate-200 animate-pulse rounded"></div>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-64 bg-slate-200 animate-pulse rounded"></div>
            <div className="h-10 w-36 bg-slate-200 animate-pulse rounded"></div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="h-10 w-64 bg-slate-200 animate-pulse rounded"></div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-6 space-y-3">
                <div className="h-4 w-32 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-8 w-28 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-3 w-40 bg-slate-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-4 w-64 bg-slate-200 animate-pulse rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-slate-200 animate-pulse rounded"></div>
                ))}
              </div>
            </div>
            
            <div className="col-span-3 border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-6 w-40 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-4 w-56 bg-slate-200 animate-pulse rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-200 animate-pulse rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}