import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppToastContainer = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      toastClassName="toast-custom"
      bodyClassName="toast-body"
      progressClassName="toast-progress"
    />
  );
};

export default AppToastContainer;
