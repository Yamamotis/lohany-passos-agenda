import { Component } from 'react'
import { Button } from './ui'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

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
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">Algo deu errado</h1>
          <p className="mt-2 text-stone-500">
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
