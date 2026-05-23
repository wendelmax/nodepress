"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ProfileForm({ user }: { user: any }) {
  const router = useRouter()
  
  const userRole = user.meta?.find((m: any) => m.metaKey === 'capabilities')?.metaValue || 'administrator'

  const [formData, setFormData] = useState({
    email: user.userEmail || '',
    displayName: user.displayName || '',
    url: user.userUrl || '',
    role: userRole,
    newPassword: ''
  })

  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatus(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to update profile')
      }

      setStatus({ type: 'success', message: 'Profile updated.' })
      
      // If password changed, they might need to login again, but NextAuth session doesn't strictly check password on every request if JWT is valid. 
      // We will just clear the password field.
      setFormData(prev => ({ ...prev, newPassword: '' }))
      
      router.refresh()
    } catch (error) {
      setStatus({ type: 'error', message: 'An error occurred while updating profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        Profile
      </h1>

      {status && (
        <div style={{ 
          borderLeft: `4px solid ${status.type === 'success' ? '#00a32a' : '#d63638'}`, 
          backgroundColor: '#fff', 
          padding: '12px', 
          marginBottom: '20px', 
          boxShadow: '0 1px 1px rgba(0,0,0,.04)' 
        }}>
          <p style={{ margin: 0 }}>{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 10px 0', padding: 0 }}>Name</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '30px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', width: '200px', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Username</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="text" 
                  value={user.userLogin}
                  disabled
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px', backgroundColor: '#f0f0f1', color: '#646970' }}
                />
                <p style={{ fontSize: '13px', color: '#646970', margin: '4px 0 0 0' }}>Usernames cannot be changed.</p>
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Display Name Publicly As</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="text" 
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Role</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px', fontSize: '13px' }}
                >
                  <option value="administrator">Administrator</option>
                  <option value="editor">Editor</option>
                  <option value="author">Author</option>
                  <option value="contributor">Contributor</option>
                  <option value="subscriber">Subscriber</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 10px 0', padding: 0 }}>Contact Info</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '30px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', width: '200px', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Email <span style={{ color: '#d63638' }}>(required)</span></label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Website</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="url" 
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 10px 0', padding: 0 }}>Account Management</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '30px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', width: '200px', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>New Password</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="password" 
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
                <p style={{ fontSize: '13px', color: '#646970', margin: '4px 0 0 0' }}>If you would like to change the password type a new one. Otherwise leave this blank.</p>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '20px' }}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{ 
              backgroundColor: '#2271b1', 
              color: 'white', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '3px', 
              cursor: isSaving ? 'not-allowed' : 'pointer', 
              fontSize: '13px' 
            }}
          >
            {isSaving ? 'Updating Profile...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
