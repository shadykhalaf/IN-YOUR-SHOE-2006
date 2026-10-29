import { Window } from '../../components/os/Window';
import { concept } from '../../data/copy';
import type { Win } from '../../state/os';

export default function Readme({ win }: { win: Win }) {
  return (
    <Window win={win} icon="txt" menubar={['File', 'Edit', 'Format', 'View', 'Help']}>
      <textarea className="notepad" readOnly value={concept.readme.join('\n')} aria-label="README.TXT contents" data-autofocus />
    </Window>
  );
}
