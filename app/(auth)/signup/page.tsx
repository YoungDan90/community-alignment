export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070c12]">
      <div className="w-full max-w-sm px-6">
        <h1 className="mb-8 text-center font-serif text-3xl font-normal text-[#f0e8d4]">
          Join Community
        </h1>
        <p className="mb-6 text-center text-sm italic text-[#6a8aaa]">
          Alignment Church
        </p>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            className="w-full rounded border border-[#162030] bg-[#0b1118] px-4 py-3 text-sm text-[#ddd0b8] outline-none placeholder:text-[#3a5570]"
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded border border-[#162030] bg-[#0b1118] px-4 py-3 text-sm text-[#ddd0b8] outline-none placeholder:text-[#3a5570]"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded border border-[#162030] bg-[#0b1118] px-4 py-3 text-sm text-[#ddd0b8] outline-none placeholder:text-[#3a5570]"
          />
          <button
            type="submit"
            className="w-full rounded bg-[#c6a75e] py-3 text-sm font-bold text-[#070c12]"
          >
            Create Account
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#6a8aaa]">
          Already have an account?{' '}
          <a href="/login" className="text-[#c6a75e]">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
