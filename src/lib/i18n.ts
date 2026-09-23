export const translations = {
  en: {
    languageName: "English (United States)",
    continue: "Continue",
    setupConfigTitle: "Database Setup",
    setupConfigDesc: "Below you should enter your database connection details. If you're not sure about these, contact your host.",
    dbName: "Database Name",
    dbNameDesc: "The name of the database you want to run NodePress in.",
    username: "Username",
    usernameDesc: "Your PostgreSQL username.",
    password: "Password",
    passwordDesc: "Your PostgreSQL password.",
    dbHost: "Database Host",
    dbHostDesc: "You should be able to get this info from your web host, if `localhost` does not work.",
    dbPort: "Port",
    dbPortDesc: "Default PostgreSQL port is 5432.",
    submitDb: "Submit",
    submittingDb: "Configuring and creating tables...",
    dbErrorPrefix: "Error establishing a database connection:",
    
    installTitle: "Welcome",
    installDesc: "Complete the initial site setup. You can use local accounts, Keycloak, or both.",
    infoNeeded: "Information needed",
    infoDesc: "Provide the site details and the credentials for the first administrator account.",
    siteTitle: "Site Title",
    adminUsername: "Username",
    adminUsernameDesc: "This identifier is used for local sign in and can be linked to Keycloak later.",
    adminPassword: "Password",
    adminPasswordDesc: "Use this password when local authentication is enabled.",
    adminEmail: "Your Email",
    adminEmailDesc: "Double-check your email address before continuing.",
    installBtn: "Install NodePress",
    installingBtn: "Installing...",
    success: "Success!",
    successDesc: "NodePress has been installed. Thank you, and enjoy!",
    loginBtn: "Log In"
  },
  pt_BR: {
    languageName: "Português do Brasil",
    continue: "Continuar",
    setupConfigTitle: "Configuração do Banco de Dados",
    setupConfigDesc: "Abaixo você deve inserir os detalhes de conexão do seu banco de dados. Se você não tem certeza sobre isso, contate sua hospedagem.",
    dbName: "Nome do Banco de Dados",
    dbNameDesc: "O nome do banco de dados no qual você deseja instalar o NodePress.",
    username: "Nome de Usuário",
    usernameDesc: "Seu nome de usuário do PostgreSQL.",
    password: "Senha",
    passwordDesc: "Sua senha do PostgreSQL.",
    dbHost: "Servidor do Banco de Dados",
    dbHostDesc: "Você deve obter esta informação com a sua hospedagem, caso `localhost` não funcione.",
    dbPort: "Porta",
    dbPortDesc: "A porta padrão do PostgreSQL é 5432.",
    submitDb: "Enviar",
    submittingDb: "Configurando e criando tabelas...",
    dbErrorPrefix: "Erro ao estabelecer conexão com o banco de dados:",
    
    installTitle: "Bem-vindo",
    installDesc: "Complete a configuração inicial do site. Você pode usar contas locais, Keycloak ou ambos.",
    infoNeeded: "Informações necessárias",
    infoDesc: "Informe os dados do site e as credenciais da primeira conta administradora.",
    siteTitle: "Título do Site",
    adminUsername: "Nome de Usuário",
    adminUsernameDesc: "Este identificador será usado no login local e pode ser vinculado ao Keycloak depois.",
    adminPassword: "Senha",
    adminPasswordDesc: "Use esta senha quando a autenticação local estiver habilitada.",
    adminEmail: "Seu E-mail",
    adminEmailDesc: "Verifique seu endereço de e-mail antes de continuar.",
    installBtn: "Instalar NodePress",
    installingBtn: "Instalando...",
    success: "Sucesso!",
    successDesc: "O NodePress foi instalado. Obrigado e divirta-se!",
    loginBtn: "Acessar"
  }
}

export type LanguageCode = keyof typeof translations;

export function getTranslation(langCode: string | null) {
  if (!langCode || !(langCode in translations)) {
    return translations['en'];
  }
  return translations[langCode as LanguageCode];
}
