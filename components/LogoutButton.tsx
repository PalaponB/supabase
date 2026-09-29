import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { logout } from '@/app/login/actions';

/**
 * Logout is a server action rather than a link, so the request that clears the
 * session cookie is a POST. A GET link could be triggered by any third party
 * page with an <img> tag and log the user out.
 */
export default async function LogoutButton() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <form action={logout}>
      <button type="submit" className="link-button">
        ออกจากระบบ
      </button>
    </form>
  );
}
