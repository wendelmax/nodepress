"use client"

import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"

type AuthConfig = {
  mode: "local" | "keycloak" | "hybrid"
  local: boolean
  keycloak: boolean
  keycloakMissing: string[]
}

const defaultConfig: AuthConfig = {
  mode: "local",
  local: true,
  keycloak: false,
  keycloakMissing: [],
}

export default function LoginPage() {
  const [config, setConfig] = useState<AuthConfig>(defaultConfig)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/auth/config")
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => undefined)
  }, [])

  const completeSignIn = async (provider: "credentials" | "keycloak", values = {}) => {
    setError("")
    setLoading(true)

    try {
      const result = await signIn(provider, {
        ...values,
        callbackUrl: "/admin",
        redirect: false,
      })

      if (result?.error) {
        setError(provider === "credentials"
          ? "Usuário/e-mail ou senha inválidos."
          : "Não foi possível iniciar o login com Navant ID.")
        setLoading(false)
        return
      }

      if (result?.url) window.location.href = result.url
    } catch {
      setError("Não foi possível concluir o login. Tente novamente.")
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await completeSignIn("credentials", { identifier, password })
  }

  const handleKeycloak = async () => completeSignIn("keycloak")

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d0f16 0%, #131520 50%, #0d0f16 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "rgba(24,27,42,0.85)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="NodePress Logo" style={{ height: "70px", width: "auto", marginBottom: "16px" }} />
          <p style={{ fontSize: 13.5, color: "#9aa3c7", marginTop: 6 }}>
            Entre com sua conta NodePress
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", padding: "10px 14px", borderRadius: 8,
            fontSize: 13.5, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {config.local && (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ color: "#cbd2ea", fontSize: 13 }} htmlFor="identifier">Usuário ou e-mail</label>
            <input
              id="identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
              style={{ background: "#111421", color: "#fff", border: "1px solid #303752", borderRadius: 8, padding: "11px 12px" }}
            />
            <label style={{ color: "#cbd2ea", fontSize: 13 }} htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              style={{ background: "#111421", color: "#fff", border: "1px solid #303752", borderRadius: 8, padding: "11px 12px" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px", marginTop: 6, background: loading ? "#3d4d9e" : "linear-gradient(135deg, #5b6af0, #7c3aed)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}

        {config.local && config.keycloak && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#555d7a", fontSize: 12, margin: "22px 0" }}>
            <span style={{ height: 1, background: "#303752", flex: 1 }} /> ou <span style={{ height: 1, background: "#303752", flex: 1 }} />
          </div>
        )}

        {config.keycloak && (
          <button
            type="button"
            onClick={handleKeycloak}
            disabled={loading}
            style={{ width: "100%", padding: "11px", background: "transparent", color: "#cbd2ea", border: "1px solid #4a557d", borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Redirecionando..." : "Entrar com Navant ID"}
          </button>
        )}

        {!config.local && !config.keycloak && (
        <p style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>
            {config.keycloakMissing.length > 0
              ? `Keycloak incompleto. Configure: ${config.keycloakMissing.join(", ")}.`
              : "Nenhum provedor de autenticação está configurado."}
          </p>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: "#555d7a", marginTop: 24 }}>
          NodePress CMS · modo {config.mode}
        </p>
      </div>
    </div>
  )
}
