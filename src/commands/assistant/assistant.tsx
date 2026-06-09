import { homedir } from 'os'
import { join } from 'path'
import { useEffect } from 'react'

type Props = {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

export async function computeDefaultInstallDir(): Promise<string> {
  return join(homedir(), '.deepcli', 'assistant')
}

export function NewInstallWizard({ onCancel }: Props) {
  useEffect(() => {
    onCancel()
  }, [onCancel])

  return null
}
