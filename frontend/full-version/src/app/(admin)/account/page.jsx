// @next
import dynamic from 'next/dynamic';

// @project
const Account = dynamic(() => import('@/views/admin/account'));

/***************************  ACCOUNT  ***************************/

export default function Accounts() {
  return <Account />;
}
