# Painel de Escala - Igreja Rasgando os Céus Bauru
### Ministério de Louvor (51 Integrantes)

Aplicativo completo para gestão e escala mensal inteligente do Ministério de Louvor.

## Como Publicar no GitHub Pages sem Tela Branca

A tela branca no GitHub Pages acontecia porque o GitHub estava tentando servir o código-fonte TypeScript (`main.tsx`) sem compilar. Existem **duas maneiras simples e definitivas** para o GitHub Pages abrir perfeitamente:

### Opção 1: Pelo GitHub Actions (Recomendada - 100% Automática)
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment > Source**, selecione **GitHub Actions**.
4. Pronto! O arquivo `.github/workflows/deploy.yml` já está pronto no projeto. Toda vez que você fizer push, o GitHub compilará e publicará o site automaticamente.

---

### Opção 2: Pela Pasta `/docs` (Imediata)
1. No seu repositório no GitHub, clique na aba **Settings**.
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment > Source**, mantenha **Deploy from a branch**.
4. Selecione a branch `main` (ou `master`) e na pasta selecione **/docs** (em vez de `/root`).
5. Clique em **Save**. O aplicativo já está compilado dentro da pasta `/docs` com todos os scripts e imagens prontos para uso.

---

## Recursos Implementados
- **Tela Inicial Direta**: Lista completa dos 51 integrantes com campo de input do PIN logo abaixo de cada nome.
- **Senha Padrão 1234**: Todos os 51 integrantes possuem a senha padrão inicial `1234`.
- **Criação de PIN Individual no Primeiro Acesso**: Ao digitar `1234` pela primeira vez, o integrante é direcionado para criar sua senha individual de 4 a 6 dígitos, com confirmação.
- **Reset de PIN pelo Administrador**: Caso algum integrante esqueça seu PIN, o líder/administrador pode resetar para `1234` a qualquer momento na aba *Integrantes*.
- **Multi-Função Ministerial**: Cada integrante pode marcar quantas funções desejar exercer (Ministro, Tecladista, Baterista, Baixista, Violonista, Guitarrista, Soprano, Contralto, Tenor).
- **Logo da Igreja**: Centralizada, sem bordas ou distorções, perfeitamente nítida em alta resolução.
- **PWA & Offline**: Funciona como aplicativo instalável no celular e armazena dados localmente.
