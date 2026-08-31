import { permanentRedirect } from 'next/navigation';

export default function BlindTestRedirect(): never {
  permanentRedirect('/blindtest');
}
