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
    installDesc: "Welcome to the famous five-minute NodePress installation process! Just fill in the information below and you'll be on your way to using the most extendable and powerful personal publishing platform in the world.",
    infoNeeded: "Information needed",
    infoDesc: "Please provide the following information. Don't worry, you can always change these settings later.",
    siteTitle: "Site Title",
    adminUsername: "Username",
    adminUsernameDesc: "Usernames can have only alphanumeric characters, spaces, underscores, hyphens, periods, and the @ symbol.",
    adminPassword: "Password",
    adminPasswordDesc: "Important: You will need this password to log in. Please store it in a secure location.",
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
    installDesc: "Bem-vindo ao famoso processo de instalação de cinco minutos do NodePress! Apenas preencha as informações abaixo e você estará no caminho para usar a plataforma de publicação pessoal mais extensível e poderosa do mundo.",
    infoNeeded: "Informações necessárias",
    infoDesc: "Por favor, forneça as seguintes informações. Não se preocupe, você pode alterá-las mais tarde.",
    siteTitle: "Título do Site",
    adminUsername: "Nome de Usuário",
    adminUsernameDesc: "Nomes de usuário podem ter apenas caracteres alfanuméricos, espaços, sublinhados, hifens, pontos e o símbolo @.",
    adminPassword: "Senha",
    adminPasswordDesc: "Importante: Você precisará desta senha para fazer login. Guarde-a em um local seguro.",
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
