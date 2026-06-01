// Shared types matching the backend Pydantic schemas

export type UserPublic = {
  id: number;
  email: string;
  role: "admin" | "user";
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: UserPublic;
};
