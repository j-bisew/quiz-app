export default function QuizzesLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen bg-slate-900 mt-4">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    )
  }