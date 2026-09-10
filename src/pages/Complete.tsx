import { Check } from 'lucide-react';

export function Complete() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary-600" />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Assessment Complete
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for completing the personality assessment. Your responses have been submitted
          successfully.
        </p>
        
        <p className="text-sm text-gray-500">
          You may now close this window.
        </p>
      </div>
    </div>
  );
}
