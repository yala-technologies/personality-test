import { Check, Sparkles } from 'lucide-react';

export function Complete() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yala-cream px-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-yala-green/5 p-12 max-w-md text-center animate-fade-in">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 bg-yala-lime rounded-3xl flex items-center justify-center transform rotate-3 animate-pulse">
            <Check className="w-12 h-12 text-yala-green" strokeWidth={3} />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yala-green animate-bounce" />
        </div>
        
        <h1 className="text-3xl font-bold text-yala-green mb-4">
          All Done! 🎉
        </h1>
        
        <p className="text-lg text-yala-green/80 mb-6 leading-relaxed">
          Thank you for completing the personality assessment. Your responses have been submitted
          successfully.
        </p>
        
        <div className="bg-yala-lime-soft rounded-2xl p-4 mb-6">
          <p className="text-sm text-yala-green font-medium">
            You may now close this window.
          </p>
        </div>

        <p className="text-xs text-yala-green/50">
          We'll be in touch soon!
        </p>
      </div>
    </div>
  );
}
