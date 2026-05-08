export interface SystemSetting {
  key: string;
  value: string | null;
  category: string;
  secret: boolean;
  label: string | null;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SystemSettingUpdate {
  key: string;
  value: string | null;
}
