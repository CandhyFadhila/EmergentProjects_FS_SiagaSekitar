// Toast helper untuk memudahkan penggunaan toast dengan berbagai variant
import { toast } from '@/hooks/use-toast';

export const showToast = {
  success: (title, description) => {
    toast({
      title,
      description,
      className: 'bg-green-600 text-white border-green-600',
      duration: 3000,
    });
  },
  
  error: (title, description) => {
    toast({
      title,
      description,
      className: 'bg-red-600 text-white border-red-600',
      duration: 4000,
    });
  },
  
  warning: (title, description) => {
    toast({
      title,
      description,
      className: 'bg-orange-500 text-white border-orange-500',
      duration: 3500,
    });
  },
  
  info: (title, description) => {
    toast({
      title,
      description,
      duration: 3000,
    });
  }
};
