export const UserNameLength = { Min: 1, Max: 15 } as const;
export const UserPasswordLength = { Min: 6, Max: 12 } as const;

export const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const AVATAR_REGEXP = /(\.(jpg|png)$)|(^data:image\/(jpeg|png);base64,[a-z0-9+/]+=*$)/i;
