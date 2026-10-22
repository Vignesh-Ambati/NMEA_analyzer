import React from 'react';

export type UtilityId = 'timediff' | 'utc_ist' | 'linecopy';

export interface UtilityConfig {
  id: UtilityId;
  title: string;
  shortTitle: string;
  categoryLabel: string;
  tagLine: string; // Exactly 1-line tag below utility name
  detailedInfo: string; // Displayed on hover of the 'i' button
  inputFormat: string;
  outputSpec: string;
  icon: React.ComponentType<{ className?: string }>;
}
