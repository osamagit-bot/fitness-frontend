// components/ConfirmationPrompt.js
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';

const ConfirmationPrompt = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success' 
}) => {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <FiCheckCircle className="h-6 w-6 text-green-500" />,
      title: 'text-green-800',
      message: 'text-green-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <FiAlertCircle className="h-6 w-6 text-red-500" />,
      title: 'text-red-800',
      message: 'text-red-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <FiAlertCircle className="h-6 w-6 text-yellow-500" />,
      title: 'text-yellow-800',
      message: 'text-yellow-600'
    }
  };

  const currentColor = colors[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className={`${currentColor.bg} ${currentColor.border} border-l-4 p-4`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {currentColor.icon}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <h3 className={`text-lg font-medium ${currentColor.title}`}>
                  {title}
                </h3>
                <div className={`mt-1 text-sm ${currentColor.message}`}>
                  <p>{message}</p>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={onClose}
                  className={`${currentColor.bg} rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  <span className="sr-only">Close</span>
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPrompt;