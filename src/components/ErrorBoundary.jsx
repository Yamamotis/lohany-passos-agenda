// Captura erros inesperados de renderização em qualquer componente filho e
// mostra uma tela amigável em vez de deixar a página em branco. Precisa ser
// um componente de classe: React só suporta error boundary dessa forma.
import { Component } from 'react'
import { Button } from './ui'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  // Chamado pelo React quando um erro é lançado durante a renderização.
  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // Ponto para registrar o erro (aqui só no console; poderia enviar a um serviço de log).
  componentDidCatch(error, info) {
    console.error('Erro não tratado na aplicação:', error, info)
  }

  handleReload = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-medium text-rose-600">Ops</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">Algo deu errado</h1>
          <p className="mt-2 text-stone-500 dark:text-stone-400">
            Ocorreu um erro inesperado. Tente recarregar a página; se o problema continuar, avise o suporte.
          </p>
          <Button onClick={this.handleReload} className="mt-6">
            Recarregar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
