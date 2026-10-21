import { BiasTag } from '@/components/ux-v1/person-name';

/**
 * The oshi tag (Run O1, lot b, P1): the shared name tag of the passport with the registry's pick icon, a star on anime where
 * kpop shows a heart. Server-safe; renders nothing for an empty name.
 */
export function OshiTag({ name, accent }: { name: string | null | undefined; accent?: string | null | undefined }): React.ReactElement | null {
  return <BiasTag bias={name} accent={accent} tagIcon="star" />;
}
