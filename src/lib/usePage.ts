import { useEffect } from 'react';
import { useOS } from '../state/os';
import { useBrowserStatus } from '../state/status';

/** Sets the document title, the IYS INTERNET window title and the status line. */
export function usePage(title: string, status?: string) {
  useEffect(() => {
    document.title = `${title} - IYS INTERNET 2006 (unofficial concept)`;
    useOS.getState().setTitle('internet', `${title} - IYS INTERNET`);
  }, [title]);
  useEffect(() => {
    if (status) useBrowserStatus.getState().set(status);
  }, [status]);
}
