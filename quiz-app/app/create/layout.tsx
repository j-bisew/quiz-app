export default function CreateLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen bg-slate-900 mt-4">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-100">Create Quiz</h1>
            <p className="text-slate-400 mt-2">
              Create your own quiz by filling out the form below
            </p>
          </div>
          {children}
        </div>
      </div>
    )
  }