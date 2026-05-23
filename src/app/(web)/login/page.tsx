"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Usuário ou senha inválidos.")
      setLoading(false)
    } else {
      router.push("/admin")
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0f16 0%, #131520 50%, #0d0f16 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(91,106,240,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(24,27,42,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #5b6af0, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
          }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f1f5', margin: 0 }}>
            NodePress
          </h1>
          <p style={{ fontSize: 13.5, color: '#555d7a', marginTop: 6 }}>
            Entre no painel administrativo
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13.5,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', marginBottom: 8,
              fontSize: 13, fontWeight: 500, color: '#8b91a8',
            }}>
              Usuário ou E-mail
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(13,15,22,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: '#f0f1f5', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#5b6af0'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', marginBottom: 8,
              fontSize: 13, fontWeight: 500, color: '#8b91a8',
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(13,15,22,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: '#f0f1f5', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#5b6af0'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#3d4d9e' : 'linear-gradient(135deg, #5b6af0, #7c3aed)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s, transform 0.1s',
              transform: loading ? 'none' : undefined,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#555d7a', marginTop: 24 }}>
          NodePress CMS · v1.0
        </p>
      </div>
    </div>
  )
}
