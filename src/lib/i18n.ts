import { InstallLocaleCode, normalizeInstallLocale } from './install-locales'

export type InstallTranslation = {
  languageName: string
  continue: string
  back: string
  languageTitle: string
  languageDesc: string
  searchLanguages: string
  languageCount: string
  selectedLanguage: string
  setupStep: string
  databaseStep: string
  siteStep: string
  setupConfigTitle: string
  setupConfigDesc: string
  dbName: string
  dbNameDesc: string
  username: string
  usernameDesc: string
  password: string
  passwordDesc: string
  dbHost: string
  dbHostDesc: string
  dbPort: string
  dbPortDesc: string
  submitDb: string
  submittingDb: string
  dbErrorPrefix: string
  installTitle: string
  installDesc: string
  infoNeeded: string
  infoDesc: string
  siteTitle: string
  adminUsername: string
  adminUsernameDesc: string
  adminPassword: string
  adminPasswordDesc: string
  adminEmail: string
  adminEmailDesc: string
  installBtn: string
  installingBtn: string
  localAuth: string
  keycloakAuth: string
  enabled: string
  configuredLater: string
  secureInstall: string
  secureInstallDesc: string
  success: string
  successDesc: string
  loginBtn: string
}

const english: InstallTranslation = {
  languageName: 'English (United States)', continue: 'Continue', back: 'Back',
  languageTitle: 'Choose your language', languageDesc: 'NodePress will use this language throughout the setup and for your new site.',
  searchLanguages: 'Search languages', languageCount: 'languages available', selectedLanguage: 'Selected language',
  setupStep: 'Language', databaseStep: 'Database', siteStep: 'Site & admin',
  setupConfigTitle: 'Connect your database', setupConfigDesc: 'Enter the PostgreSQL connection details for the database where NodePress will store your content.',
  dbName: 'Database name', dbNameDesc: 'The database that NodePress should use.', username: 'Username', usernameDesc: 'Your PostgreSQL username.',
  password: 'Password', passwordDesc: 'Your PostgreSQL password.', dbHost: 'Database host', dbHostDesc: 'Usually localhost, or the hostname provided by your host.',
  dbPort: 'Port', dbPortDesc: 'The default PostgreSQL port is 5432.', submitDb: 'Continue to site setup', submittingDb: 'Connecting and preparing NodePress...',
  dbErrorPrefix: 'We could not connect to the database:', installTitle: 'Set up your new site', installDesc: 'A few details are all we need to create your site and the first administrator account.',
  infoNeeded: 'Site details', infoDesc: 'You can change these settings later from the NodePress dashboard.', siteTitle: 'Site title',
  adminUsername: 'Administrator username', adminUsernameDesc: 'Use this username to sign in to the local administrator account.', adminPassword: 'Administrator password',
  adminPasswordDesc: 'Use at least 8 characters for a secure local account.', adminEmail: 'Administrator email', adminEmailDesc: 'We use this address for account recovery and important notifications.',
  installBtn: 'Install NodePress', installingBtn: 'Installing NodePress...', localAuth: 'Local sign-in', keycloakAuth: 'Keycloak SSO', enabled: 'Enabled',
  configuredLater: 'Configure later', secureInstall: 'A secure start', secureInstallDesc: 'Your credentials are stored in your database and never shown in the dashboard.', success: 'Success!',
  successDesc: 'NodePress has been installed. Thank you, and enjoy!', loginBtn: 'Log in',
}

const portuguese: InstallTranslation = {
  ...english, languageName: 'Português do Brasil', continue: 'Continuar', back: 'Voltar', languageTitle: 'Escolha seu idioma',
  languageDesc: 'O NodePress usará este idioma durante a instalação e no seu novo site.', searchLanguages: 'Buscar idiomas', languageCount: 'idiomas disponíveis',
  selectedLanguage: 'Idioma selecionado', setupStep: 'Idioma', databaseStep: 'Banco de dados', siteStep: 'Site e admin', setupConfigTitle: 'Conecte seu banco de dados',
  setupConfigDesc: 'Informe os dados de conexão do PostgreSQL onde o NodePress armazenará seu conteúdo.', dbName: 'Nome do banco', dbNameDesc: 'O banco que o NodePress deve utilizar.',
  username: 'Usuário', usernameDesc: 'Seu usuário do PostgreSQL.', password: 'Senha', passwordDesc: 'Sua senha do PostgreSQL.', dbHost: 'Servidor do banco', dbHostDesc: 'Geralmente localhost ou o host informado pela hospedagem.',
  dbPort: 'Porta', dbPortDesc: 'A porta padrão do PostgreSQL é 5432.', submitDb: 'Continuar para o site', submittingDb: 'Conectando e preparando o NodePress...', dbErrorPrefix: 'Não foi possível conectar ao banco:',
  installTitle: 'Configure seu novo site', installDesc: 'Precisamos de poucos dados para criar o site e a primeira conta administradora.', infoNeeded: 'Dados do site', infoDesc: 'Você poderá alterar estas configurações depois no painel do NodePress.',
  siteTitle: 'Título do site', adminUsername: 'Usuário administrador', adminUsernameDesc: 'Use este usuário para acessar a conta administrativa local.', adminPassword: 'Senha do administrador',
  adminPasswordDesc: 'Use pelo menos 8 caracteres para uma conta local segura.', adminEmail: 'E-mail do administrador', adminEmailDesc: 'Usaremos este endereço para recuperação e avisos importantes.', installBtn: 'Instalar NodePress', installingBtn: 'Instalando o NodePress...',
  localAuth: 'Login local', keycloakAuth: 'SSO Keycloak', enabled: 'Ativado', configuredLater: 'Configurar depois', secureInstall: 'Um começo seguro', secureInstallDesc: 'Suas credenciais ficam no banco de dados e nunca são exibidas no painel.', loginBtn: 'Acessar',
}

const spanish: InstallTranslation = {
  ...english, languageName: 'Español', continue: 'Continuar', back: 'Atrás', languageTitle: 'Elige tu idioma', languageDesc: 'NodePress usará este idioma durante la instalación y en tu nuevo sitio.',
  searchLanguages: 'Buscar idiomas', languageCount: 'idiomas disponibles', selectedLanguage: 'Idioma seleccionado', setupStep: 'Idioma', databaseStep: 'Base de datos', siteStep: 'Sitio y admin',
  setupConfigTitle: 'Conecta tu base de datos', setupConfigDesc: 'Introduce los datos de conexión de PostgreSQL donde NodePress guardará tu contenido.', dbName: 'Nombre de la base de datos', dbNameDesc: 'La base de datos que debe usar NodePress.',
  username: 'Usuario', usernameDesc: 'Tu usuario de PostgreSQL.', password: 'Contraseña', passwordDesc: 'Tu contraseña de PostgreSQL.', dbHost: 'Servidor de la base de datos', dbHostDesc: 'Normalmente localhost o el host de tu proveedor.',
  dbPort: 'Puerto', dbPortDesc: 'El puerto predeterminado de PostgreSQL es 5432.', submitDb: 'Continuar al sitio', submittingDb: 'Conectando y preparando NodePress...', dbErrorPrefix: 'No pudimos conectar con la base de datos:',
  installTitle: 'Configura tu nuevo sitio', installDesc: 'Solo necesitamos algunos datos para crear tu sitio y la primera cuenta administradora.', infoNeeded: 'Datos del sitio', infoDesc: 'Podrás cambiar estos ajustes después desde el panel de NodePress.', siteTitle: 'Título del sitio',
  adminUsername: 'Usuario administrador', adminUsernameDesc: 'Usa este usuario para acceder a la cuenta administrativa local.', adminPassword: 'Contraseña del administrador', adminPasswordDesc: 'Usa al menos 8 caracteres para una cuenta local segura.', adminEmail: 'Correo del administrador', adminEmailDesc: 'Usaremos este correo para recuperar la cuenta y enviar avisos importantes.',
  installBtn: 'Instalar NodePress', installingBtn: 'Instalando NodePress...', localAuth: 'Inicio de sesión local', keycloakAuth: 'SSO de Keycloak', enabled: 'Activo', configuredLater: 'Configurar después', secureInstall: 'Un comienzo seguro', secureInstallDesc: 'Tus credenciales se guardan en la base de datos y nunca se muestran en el panel.', loginBtn: 'Iniciar sesión',
}

const french: InstallTranslation = {
  ...english, languageName: 'Français', continue: 'Continuer', back: 'Retour', languageTitle: 'Choisissez votre langue', languageDesc: 'NodePress utilisera cette langue pendant l’installation et sur votre nouveau site.',
  searchLanguages: 'Rechercher une langue', languageCount: 'langues disponibles', selectedLanguage: 'Langue sélectionnée', setupStep: 'Langue', databaseStep: 'Base de données', siteStep: 'Site et admin',
  setupConfigTitle: 'Connectez votre base de données', setupConfigDesc: 'Saisissez les informations PostgreSQL où NodePress stockera votre contenu.', dbName: 'Nom de la base de données', dbNameDesc: 'La base de données que NodePress doit utiliser.', username: 'Nom d’utilisateur', usernameDesc: 'Votre nom d’utilisateur PostgreSQL.',
  password: 'Mot de passe', passwordDesc: 'Votre mot de passe PostgreSQL.', dbHost: 'Hôte de la base de données', dbHostDesc: 'Généralement localhost ou l’hôte fourni par votre hébergeur.', dbPort: 'Port', dbPortDesc: 'Le port PostgreSQL par défaut est 5432.',
  submitDb: 'Continuer vers le site', submittingDb: 'Connexion et préparation de NodePress...', dbErrorPrefix: 'Impossible de se connecter à la base de données :', installTitle: 'Configurez votre nouveau site', installDesc: 'Quelques informations suffisent pour créer votre site et le premier compte administrateur.',
  infoNeeded: 'Informations du site', infoDesc: 'Vous pourrez modifier ces réglages plus tard dans le tableau de bord NodePress.', siteTitle: 'Titre du site', adminUsername: 'Nom d’utilisateur administrateur', adminUsernameDesc: 'Utilisez ce nom pour accéder au compte administrateur local.',
  adminPassword: 'Mot de passe administrateur', adminPasswordDesc: 'Utilisez au moins 8 caractères pour un compte local sécurisé.', adminEmail: 'E-mail administrateur', adminEmailDesc: 'Cette adresse servira à la récupération et aux notifications importantes.', installBtn: 'Installer NodePress', installingBtn: 'Installation de NodePress...',
  localAuth: 'Connexion locale', keycloakAuth: 'SSO Keycloak', enabled: 'Activé', configuredLater: 'Configurer plus tard', secureInstall: 'Un démarrage sécurisé', secureInstallDesc: 'Vos identifiants sont stockés dans la base de données et ne sont jamais affichés dans le tableau de bord.', loginBtn: 'Se connecter',
}

const german: InstallTranslation = {
  ...english, languageName: 'Deutsch', continue: 'Weiter', back: 'Zurück', languageTitle: 'Sprache auswählen', languageDesc: 'NodePress verwendet diese Sprache während der Einrichtung und für Ihre neue Website.',
  searchLanguages: 'Sprachen suchen', languageCount: 'Sprachen verfügbar', selectedLanguage: 'Ausgewählte Sprache', setupStep: 'Sprache', databaseStep: 'Datenbank', siteStep: 'Website & Admin',
  setupConfigTitle: 'Datenbank verbinden', setupConfigDesc: 'Geben Sie die PostgreSQL-Verbindungsdaten für Ihre NodePress-Datenbank ein.', dbName: 'Datenbankname', dbNameDesc: 'Die Datenbank, die NodePress verwenden soll.', username: 'Benutzername', usernameDesc: 'Ihr PostgreSQL-Benutzername.',
  password: 'Passwort', passwordDesc: 'Ihr PostgreSQL-Passwort.', dbHost: 'Datenbank-Host', dbHostDesc: 'Meist localhost oder der Hostname Ihres Anbieters.', dbPort: 'Port', dbPortDesc: 'Der Standardport von PostgreSQL ist 5432.', submitDb: 'Mit Einrichtung fortfahren', submittingDb: 'Verbindung wird hergestellt und NodePress vorbereitet...',
  dbErrorPrefix: 'Die Datenbankverbindung konnte nicht hergestellt werden:', installTitle: 'Neue Website einrichten', installDesc: 'Ein paar Angaben genügen, um Ihre Website und das erste Administratorkonto zu erstellen.', infoNeeded: 'Website-Details', infoDesc: 'Diese Einstellungen können Sie später im NodePress-Dashboard ändern.', siteTitle: 'Website-Titel',
  adminUsername: 'Administrator-Benutzername', adminUsernameDesc: 'Mit diesem Benutzernamen melden Sie sich lokal an.', adminPassword: 'Administrator-Passwort', adminPasswordDesc: 'Verwenden Sie mindestens 8 Zeichen für ein sicheres Konto.', adminEmail: 'Administrator-E-Mail', adminEmailDesc: 'Diese Adresse wird für Wiederherstellung und wichtige Hinweise verwendet.', installBtn: 'NodePress installieren', installingBtn: 'NodePress wird installiert...',
  localAuth: 'Lokale Anmeldung', keycloakAuth: 'Keycloak SSO', enabled: 'Aktiviert', configuredLater: 'Später konfigurieren', secureInstall: 'Sicherer Start', secureInstallDesc: 'Ihre Zugangsdaten werden in der Datenbank gespeichert und nie im Dashboard angezeigt.', loginBtn: 'Anmelden',
}

const italian: InstallTranslation = {
  ...english, languageName: 'Italiano', continue: 'Continua', back: 'Indietro', languageTitle: 'Scegli la tua lingua', languageDesc: 'NodePress userà questa lingua durante la configurazione e per il tuo nuovo sito.',
  searchLanguages: 'Cerca lingue', languageCount: 'lingue disponibili', selectedLanguage: 'Lingua selezionata', setupStep: 'Lingua', databaseStep: 'Database', siteStep: 'Sito e admin', setupConfigTitle: 'Collega il database', setupConfigDesc: 'Inserisci i dati di connessione PostgreSQL per il database in cui NodePress salverà i contenuti.',
  dbName: 'Nome database', dbNameDesc: 'Il database che NodePress deve usare.', username: 'Nome utente', usernameDesc: 'Il tuo nome utente PostgreSQL.', password: 'Password', passwordDesc: 'La tua password PostgreSQL.', dbHost: 'Host database', dbHostDesc: 'Di solito localhost o l’host indicato dal tuo provider.', dbPort: 'Porta', dbPortDesc: 'La porta PostgreSQL predefinita è 5432.',
  submitDb: 'Continua alla configurazione', submittingDb: 'Connessione e preparazione di NodePress...', dbErrorPrefix: 'Impossibile connettersi al database:', installTitle: 'Configura il tuo nuovo sito', installDesc: 'Bastano pochi dettagli per creare il sito e il primo account amministratore.', infoNeeded: 'Dettagli del sito', infoDesc: 'Potrai modificare queste impostazioni in seguito dal pannello NodePress.', siteTitle: 'Titolo del sito',
  adminUsername: 'Nome utente amministratore', adminUsernameDesc: 'Usa questo nome per accedere all’account amministratore locale.', adminPassword: 'Password amministratore', adminPasswordDesc: 'Usa almeno 8 caratteri per un account locale sicuro.', adminEmail: 'E-mail amministratore', adminEmailDesc: 'Useremo questo indirizzo per il recupero e le notifiche importanti.', installBtn: 'Installa NodePress', installingBtn: 'Installazione di NodePress...',
  localAuth: 'Accesso locale', keycloakAuth: 'SSO Keycloak', enabled: 'Attivo', configuredLater: 'Configura più tardi', secureInstall: 'Un inizio sicuro', secureInstallDesc: 'Le tue credenziali sono salvate nel database e non vengono mai mostrate nel pannello.', loginBtn: 'Accedi',
}

export const translations: Record<InstallLocaleCode, InstallTranslation> = {
  'pt-BR': portuguese, 'en-US': english, 'es-ES': spanish, 'fr-FR': french, 'de-DE': german, 'it-IT': italian,
}

export type LanguageCode = InstallLocaleCode
export type AdminDictionary = InstallTranslation

export function getTranslation(langCode: string | null) {
  return translations[normalizeInstallLocale(langCode)]
}
