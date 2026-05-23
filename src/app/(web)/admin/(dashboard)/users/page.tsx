import Link from "next/link"
import { UserService } from "@/services/user.service"

export default async function UsersListPage() {
  const users = await UserService.getAll()

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text leading-none">Usuários</h1>
          <p className="text-xs text-text-secondary mt-1.5">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}.</p>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 bg-primary-gradient text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200"
        >
          + Novo Usuário
        </Link>
      </div>

      {/* Table */}
      <div className="bg-surface/40 border border-border rounded-2xl overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <span className="text-4xl opacity-30">👤</span>
            <p className="text-sm text-text-muted">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-5 py-3 text-text-secondary font-semibold">Usuário</th>
                <th className="text-left px-5 py-3 text-text-secondary font-semibold hidden md:table-cell">Nome</th>
                <th className="text-left px-5 py-3 text-text-secondary font-semibold hidden lg:table-cell">E-mail</th>
                <th className="text-left px-5 py-3 text-text-secondary font-semibold hidden sm:table-cell">Papel</th>
                <th className="text-center px-5 py-3 text-text-secondary font-semibold">Posts</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const role = user.meta?.find((m: any) => m.metaKey === 'capabilities')?.metaValue || 'Administrator'
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-border/30 hover:bg-white/[0.02] transition-colors group ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-light">
                          {user.userLogin.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-semibold text-text hover:text-primary transition-colors"
                          >
                            {user.userLogin}
                          </Link>
                          <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="text-primary-light hover:underline"
                            >
                              Editar
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-secondary hidden md:table-cell">{user.displayName || '—'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <a href={`mailto:${user.userEmail}`} className="text-primary-light hover:underline">{user.userEmail}</a>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent-purple/10 text-accent-purple border border-accent-purple/20 capitalize">
                        {role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Link
                        href={`/admin/edit?author=${user.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary-light font-bold hover:bg-primary/20 transition-colors"
                      >
                        {user._count.posts}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
