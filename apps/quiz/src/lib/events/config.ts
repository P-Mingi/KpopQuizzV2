// Audit 04 section 4 (P1-6): the settings of the award quiz engine. The Team account is a PLACEHOLDER until the owner names the award
// account (question 1 of the lane report): the import refuses a name that is not an active Team account (bad_account), so a wrong
// value files nothing. The engine never likes, replies or votes; it only files drafts for the owner to approve.

import { AWARD_TEAM_HANDLE } from '@/lib/editorial/team-handles';

export const AWARD_ACCOUNT = AWARD_TEAM_HANDLE;
export const AWARD_GROUP_SLUG = 'general-kpop';
