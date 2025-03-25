//@type
import { Plans } from '@/sections/account/type';

export const plansData = [
  {
    title: 'Basic',
    plan: Plans.BASIC,
    monthlyPrice: 199,
    yearlyPrice: 699,
    icon: 'IconBox',
    features: ['Core', 'Lite', 'Starter', 'Essential', 'Standard', 'Basic']
  },
  {
    title: 'Starter',
    plan: Plans.STARTER,
    monthlyPrice: 267,
    yearlyPrice: 899,
    icon: 'IconActivityHeartbeat',
    features: ['Plus', 'Advanced', 'Pro', 'Premium', 'Enhanced', 'Professional']
  },
  {
    title: 'Enterprise',
    plan: Plans.ENTERPRISE,
    monthlyPrice: 389,
    yearlyPrice: 999,
    icon: 'IconBolt',
    features: ['Ultimate', 'Enterprise', 'Corporate', 'Business', 'Power', 'Supreme']
  }
];
