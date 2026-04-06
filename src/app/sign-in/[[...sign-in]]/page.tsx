import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9f4]">
      <div className="w-full max-w-[440px] px-4">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#4a7c59] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M20 38C20 38 20 28 20 22C20 16 16 12 12 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
              <path d="M20 22C20 22 24 18 28 14" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
              <path d="M8 4C8 4 2 12 6 20C10 28 20 22 20 22C20 22 12 22 8 16C4 10 8 4 8 4Z" fill="white" opacity="0.9" />
              <path d="M28 10C28 10 34 14 32 20C30 26 22 24 22 24C22 24 28 22 30 18C32 14 28 10 28 10Z" fill="white" opacity="0.6" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-[#1a2316] mb-1">Welcome back to Vyne</h1>
          <p className="text-[13px] text-[#4d5a45]">Sign in to continue building agent workflows</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-[#dde3d5] rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "rounded-xl border-[#dde3d5]",
              formButtonPrimary: "bg-[#4a7c59] hover:bg-[#3d6b4a] rounded-xl",
              footerActionLink: "text-[#4a7c59] hover:text-[#3d6b4a]",
              formFieldInput: "rounded-xl border-[#dde3d5] focus:border-[#4a7c59] focus:ring-[#4a7c5930]",
            },
          }}
        />
      </div>
    </div>
  );
}
