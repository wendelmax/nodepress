import { PawPrint } from "lucide-react"
import { notFound } from "next/navigation"
import { contentTypeRegistry } from "@/modules/content"
import { ContentService } from "@/modules/content/content.service"
import { PrismaContentRepository } from "@/modules/content/prisma-repository"
import { ensureActivePluginsLoaded } from "@/services/plugin-factory"

export const dynamic = "force-dynamic"

export default async function AnimalsPublicPage() {
  await ensureActivePluginsLoaded()
  if (!contentTypeRegistry.get("animal")) notFound()

  const service = new ContentService(contentTypeRegistry, new PrismaContentRepository())
  const animals = (await service.list("animal")).filter((record) => record.status === "publish")

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="mb-10 flex items-center gap-3">
        <PawPrint className="text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-text">Animais para adoção</h1>
          <p className="mt-1 text-text-secondary">Conheça nossos animais e encontre um novo companheiro.</p>
        </div>
      </div>
      {animals.length === 0 ? <p className="text-text-secondary">Nenhum animal publicado no momento.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{animals.map((animal) => <article key={animal.id} className="rounded-2xl border border-border bg-surface/40 p-5"><h2 className="text-xl font-semibold text-text">{String(animal.data.name || animal.title)}</h2><p className="mt-2 text-sm text-text-secondary">{String(animal.data.species || "Animal")}</p><span className="mt-5 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{String(animal.data.status || "available")}</span></article>)}</div>}
    </main>
  )
}
