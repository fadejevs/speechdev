//@type
import { Plans } from '@/sections/account/type';

export const accountListData = [
  {
    id: '1',
    profile: {
      fullName: 'Stacy Reichel',
      firstName: 'Stacy',
      lastName: 'Reichel',
      username: 'stacy_reichel.890'
    },
    plan: Plans.BASIC,
    features: ['Dashboard Access', 'User Management'],
    email: 'stacy.reichel@saasable.io',
    dialCode: '+1',
    contact: '212-555-0199',
    price: '$199.00 USD',
    date: '15 Sep 2023',
    status: 'Scheduled',
    timePeriod: 'monthly',
    isBlocked: false
  },
  {
    id: '2',
    profile: {
      fullName: 'Morris VonRueden',
      firstName: 'Morris',
      lastName: 'VonRueden',
      username: 'morris.vonrueden'
    },
    plan: Plans.STARTER,
    features: ['Project Management', 'Analytics', 'Notifications', 'Team Management'],
    email: 'morris.vonrueden@yahoo.com',
    dialCode: '+1',
    contact: '310-555-0147',
    price: '$267.00 USD',
    date: '25 Aug 2023',
    status: 'Paid',
    timePeriod: 'yearly',
    isBlocked: false
  },
  {
    id: '3',
    profile: {
      fullName: 'Terri Howe',
      firstName: 'Terri',
      lastName: 'Howe',
      username: 'terri_howe'
    },
    plan: Plans.ENTERPRISE,
    features: ['Analytics', 'Notifications'],
    email: 'terri.howe@outlook.com',
    dialCode: '+1',
    contact: '718-555-0193',
    price: '$389.00 USD',
    date: '30 Sep 2023',
    status: 'Paid',
    timePeriod: 'yearly',
    isBlocked: false
  },
  {
    id: '4',
    profile: {
      fullName: 'Blake Adams',
      firstName: 'Blake',
      lastName: 'Adams',
      username: 'blake_adams'
    },
    plan: Plans.BASIC,
    features: ['Team Management', 'Project Oversight'],
    email: 'blake.adams@saasable.io',
    dialCode: '+1',
    contact: '415-555-0138',
    price: '$199.00 USD',
    date: '10 Aug 2023',
    status: 'Paid',
    timePeriod: 'monthly',
    isBlocked: true
  },
  {
    id: '5',
    profile: {
      fullName: 'Joel Stroman',
      firstName: 'Joel',
      lastName: 'Stroman',
      username: 'joel_stroman'
    },
    plan: Plans.STARTER,
    features: ['Full Access', 'Analytics', 'Notifications', 'Team Management', 'Project Oversight'],
    email: 'joel.stroman@company.com',
    dialCode: '+1',
    contact: '602-555-0176',
    price: '$267.00 USD',
    date: '01 Jul 2023',
    status: 'Scheduled',
    timePeriod: 'monthly',
    isBlocked: false
  },
  {
    id: '6',
    profile: {
      fullName: 'Eva Reilly',
      firstName: 'Eva',
      lastName: 'Reilly',
      username: 'eva_reilly'
    },
    plan: Plans.ENTERPRISE,
    features: ['Project Management', 'Reports'],
    email: 'eva.reilly@domain.com',
    dialCode: '+91',
    contact: '997-555-0127',
    price: '$389.00 USD',
    date: '20 Jun 2023',
    status: 'Paid',
    timePeriod: 'yearly',
    isBlocked: false
  },
  {
    id: '7',
    profile: {
      fullName: 'Lila Kuhic',
      firstName: 'Lila',
      lastName: 'Kuhic',
      username: 'lila_kuhic'
    },
    plan: Plans.BASIC,
    features: ['Analytics'],
    email: 'lila.kuhic@hotmail.com',
    dialCode: '+1',
    contact: '312-555-0164',
    price: '$199.00 USD',
    date: '05 May 2023',
    status: 'Paid',
    timePeriod: 'monthly',
    isBlocked: false
  },
  {
    id: '8',
    profile: {
      fullName: 'Osvaldo Conn',
      firstName: 'Osvaldo',
      lastName: 'Conn',
      username: 'osvaldo_conn'
    },
    plan: Plans.STARTER,
    features: ['Full Access', 'Team Management'],
    email: 'osvaldo.conn@business.com',
    dialCode: '+1',
    contact: '213-555-0192',
    price: '$267.00 USD',
    date: '15 Apr 2023',
    status: 'Scheduled',
    timePeriod: 'yearly',
    isBlocked: true
  },
  {
    id: '9',
    profile: {
      fullName: 'Dora Heidenreich',
      firstName: 'Dora',
      lastName: 'Heidenreich',
      username: 'dora_heidenreich'
    },
    plan: Plans.ENTERPRISE,
    features: ['Project Management', 'Notifications', 'Team Management', 'Reports'],
    email: 'dora.heidenreich@company.com',
    dialCode: '+1',
    contact: '718-555-0185',
    price: '$389.00 USD',
    date: '10 Mar 2023',
    status: 'Paid',
    timePeriod: 'monthly',
    isBlocked: false
  }
];
