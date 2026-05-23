"use client"

import { useSettings } from "@/hooks/useSettings"
import { translations, LanguageCode } from "@/lib/i18n"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage, LoadingSpinner,
  inputCls, selectCls
} from "@/components/admin/SettingsUI"

export default function OptionsGeneralPage() {
  const { settings, setSettings, isLoading, isSaving, message, saveSettings } = useSettings()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        title="Configurações Gerais"
        subtitle="Defina as informações básicas do seu site NodePress."
      />

      {message && <StatusMessage type={message.type} text={message.text} />}

      <form onSubmit={async (e) => { e.preventDefault(); await saveSettings(settings) }} className="flex flex-col gap-6">
        <SettingsSection title="Identidade do Site" icon="🌐">
          <FieldRow label="Título do Site" required>
            <input
              className={inputCls}
              type="text"
              value={settings.blogname}
              onChange={e => setSettings({ ...settings, blogname: e.target.value })}
              placeholder="Meu Blog Incrível"
            />
          </FieldRow>

          <FieldRow label="Slogan" hint="Em poucas palavras, explique o que é este site.">
            <input
              className={inputCls}
              type="text"
              value={settings.blogdescription}
              onChange={e => setSettings({ ...settings, blogdescription: e.target.value })}
              placeholder="Notícias, tutoriais e muito mais"
            />
          </FieldRow>

          <FieldRow label="URL do Site" required>
            <input
              className={inputCls}
              type="text"
              value={settings.siteurl}
              onChange={e => setSettings({ ...settings, siteurl: e.target.value })}
              placeholder="https://seusite.com"
            />
          </FieldRow>

          <FieldRow label="E-mail do Admin" hint="Este endereço é usado para fins administrativos." required>
            <input
              className={inputCls}
              type="email"
              value={settings.admin_email}
              onChange={e => setSettings({ ...settings, admin_email: e.target.value })}
              placeholder="admin@seusite.com"
            />
          </FieldRow>

          <FieldRow label="Idioma do Site">
            <select
              className={selectCls}
              value={settings.site_language}
              onChange={e => setSettings({ ...settings, site_language: e.target.value })}
            >
              {Object.keys(translations).map(langCode => (
                <option key={langCode} value={langCode}>
                  {translations[langCode as LanguageCode].languageName}
                </option>
              ))}
            </select>
          </FieldRow>
        </SettingsSection>

        <SaveButton isSaving={isSaving} />
      </form>
    </div>
  )
}
