/** Props for the panel of a button tab of <UxTabs idPrefix="p">:
 *  <div {...tabPanelProps('p', 'overview')} hidden={tab !== 'overview'}>. Plain
 *  module (no 'use client') so server and client components can both call it. */
export function tabPanelProps(idPrefix: string, id: string): { id: string; role: 'tabpanel'; 'aria-labelledby': string; tabIndex: 0 } {
  return { id: `${idPrefix}-panel-${id}`, role: 'tabpanel', 'aria-labelledby': `${idPrefix}-tab-${id}`, tabIndex: 0 };
}
