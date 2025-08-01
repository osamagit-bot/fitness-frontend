import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const PaymentSuccess = ({ transactionId, onClose, isSimulation = false }) => {
  const { classes } = useTheme();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`${classes.bg.card} rounded-lg shadow-xl w-full max-w-md p-6 text-center`}>
        <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h3 className={`text-xl font-bold ${classes.text.primary} mb-1`}>Payment Successful!</h3>
        <p className={`${classes.text.secondary} mb-4`}>Your order has been placed successfully.</p>
        
        <div className={`${classes.bg.tertiary} p-3 rounded-md text-left mb-4`}>
          <p className={`text-sm ${classes.text.secondary}`}>
            <span className="font-medium">Transaction ID:</span> {transactionId}
          </p>
          <p className={`text-sm ${classes.text.secondary} mt-1`}>
            <span className="font-medium">Status:</span>{' '}
            <span className="text-green-500 font-medium">Completed</span>
          </p>
        </div>
        
        {isSimulation ? (
          <div className={`mb-4 px-3 py-2 ${classes.bg.tertiary} text-blue-400 text-sm rounded-md border border-blue-500/20`}>
            <p>
              <span className="font-medium">Note:</span> This is a simulation. In production, a real confirmation message would be sent to your phone.
            </p>
          </div>
        ) : (
          <p className={`text-sm ${classes.text.tertiary} mb-4`}>
            A confirmation has been sent to your registered phone number.
          </p>
        )}
        
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
