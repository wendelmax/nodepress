import prisma from "../lib/prisma"

function option(name: string) {
  const prefix = `${name}=`
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return argument?.slice(prefix.length)
}

function report(summary: {
  scanned: number
  linked: number
  alreadyLinked: number
  missing: number
  conflicts: number
}) {
  console.log(JSON.stringify(summary, null, 2))
}

async function main() {
  const email = option("--email")?.trim().toLowerCase()
  const keycloakSub = option("--sub")?.trim()
  const dryRun = process.argv.includes("--dry-run")
  const listOnly = process.argv.includes("--list")

  if (listOnly) {
    const users = await prisma.user.findMany({
      where: { keycloakSub: null },
      select: { id: true, userLogin: true, userEmail: true, displayName: true },
      orderBy: { id: "asc" },
    })
    console.table(users)
    report({
      scanned: users.length,
      linked: 0,
      alreadyLinked: 0,
      missing: users.length,
      conflicts: 0,
    })
    return
  }

  if (!email || !keycloakSub) {
    throw new Error("Use --list ou informe --email=... --sub=... [--dry-run]")
  }

  const user = await prisma.user.findUnique({ where: { userEmail: email } })
  if (!user) {
    report({ scanned: 1, linked: 0, alreadyLinked: 0, missing: 1, conflicts: 0 })
    throw new Error(`Nenhum usuário encontrado para ${email}`)
  }

  const linkedUser = await prisma.user.findUnique({ where: { keycloakSub } })
  if (linkedUser && linkedUser.id !== user.id) {
    report({ scanned: 1, linked: 0, alreadyLinked: 0, missing: 0, conflicts: 1 })
    throw new Error("Este keycloakSub já está vinculado a outro usuário")
  }

  if (user.keycloakSub === keycloakSub) {
    console.log(`Usuário ${user.id} já está vinculado a ${keycloakSub}.`)
    report({ scanned: 1, linked: 0, alreadyLinked: 1, missing: 0, conflicts: 0 })
    return
  }

  if (dryRun) {
    console.log(`[dry-run] Vincularia ${email} (id ${user.id}) a ${keycloakSub}.`)
    report({ scanned: 1, linked: 0, alreadyLinked: 0, missing: 0, conflicts: 0 })
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { keycloakSub } })
  console.log(`Usuário ${email} vinculado ao Keycloak (${keycloakSub}).`)
  report({ scanned: 1, linked: 1, alreadyLinked: 0, missing: 0, conflicts: 0 })
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
