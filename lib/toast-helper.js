// Toast helper dengan warna yang lebih jelas dan icon
import { toast } from '@/hooks/use-toast';

export const showToast = {
  success: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-green-50 dark:bg-green-900 text-green-900 dark:text-green-50 border-2 border-green-500 shadow-lg',
      duration: 3000,
    });
  },
  
  error: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-red-50 dark:bg-red-900 text-red-900 dark:text-red-50 border-2 border-red-500 shadow-lg',
      duration: 4000,
    });
  },
  
  warning: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-50 border-2 border-yellow-500 shadow-lg',
      duration: 3500,
    });
  },
  
  info: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-50 border-2 border-blue-500 shadow-lg',
      duration: 3000,
    });
  }
};
