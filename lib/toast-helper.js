// Toast helper dengan warna yang proper untuk dark mode
import { toast } from '@/hooks/use-toast';

export const showToast = {
  success: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100 border-2 border-green-600 dark:border-green-500 shadow-lg',
      duration: 3000,
    });
  },
  
  error: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border-2 border-red-600 dark:border-red-500 shadow-lg',
      duration: 4000,
    });
  },
  
  warning: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 border-2 border-yellow-600 dark:border-yellow-500 shadow-lg',
      duration: 3500,
    });
  },
  
  info: (title, description) => {
    toast({
      title: title,
      description: description,
      className: 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-2 border-blue-600 dark:border-blue-500 shadow-lg',
      duration: 3000,
    });
  }
};
