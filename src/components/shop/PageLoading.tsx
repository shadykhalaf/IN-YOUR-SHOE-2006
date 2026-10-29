import { Busy } from './Busy';

/** Page / section loading: the shared Busy look (see Busy.tsx). */
export function PageLoading({ label = 'Loading...' }: { label?: string }) {
  return <Busy label={label} />;
}
