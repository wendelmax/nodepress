import Link from "next/link"
import { UserService } from "@/services/user.service"

export default async function UsersListPage() {
  const users = await UserService.getAll()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0' }}>Users</h1>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #c3c4c7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #c3c4c7', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', color: '#2c3338', fontWeight: 400, fontSize: '14px', borderRight: '1px solid #c3c4c7', width: '25%' }}>Username</th>
            <th style={{ padding: '8px 10px', color: '#2c3338', fontWeight: 400, fontSize: '14px', borderRight: '1px solid #c3c4c7', width: '25%' }}>Name</th>
            <th style={{ padding: '8px 10px', color: '#2c3338', fontWeight: 400, fontSize: '14px', borderRight: '1px solid #c3c4c7', width: '25%' }}>Email</th>
            <th style={{ padding: '8px 10px', color: '#2c3338', fontWeight: 400, fontSize: '14px', borderRight: '1px solid #c3c4c7', width: '15%' }}>Role</th>
            <th style={{ padding: '8px 10px', color: '#2c3338', fontWeight: 400, fontSize: '14px', width: '10%', textAlign: 'center' }}>Posts</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f1' }} className="table-row">
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top', fontWeight: 600 }}>
                <Link href={`/admin/users/${user.id}`} style={{ color: '#2271b1', textDecoration: 'none' }}>
                  {user.userLogin}
                </Link>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  <Link href={`/admin/users/${user.id}`} style={{ textDecoration: 'none', color: '#2271b1' }}>Edit</Link>
                </div>
              </td>
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top' }}>
                {user.displayName || '—'}
              </td>
              <td style={{ padding: '10px', color: '#2271b1', fontSize: '13px', verticalAlign: 'top' }}>
                <a href={`mailto:${user.userEmail}`} style={{ color: '#2271b1', textDecoration: 'none' }}>{user.userEmail}</a>
              </td>
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top', textTransform: 'capitalize' }}>
                {user.meta?.find((m: any) => m.metaKey === 'capabilities')?.metaValue || 'Administrator'}
              </td>
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top', textAlign: 'center' }}>
                <Link href={`/admin/edit?author=${user.id}`} style={{ color: '#2271b1', textDecoration: 'none' }}>
                  {user._count.posts}
                </Link>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '10px', textAlign: 'center', color: '#646970', fontSize: '13px' }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
