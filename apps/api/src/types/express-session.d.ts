import 'express-session';

declare module 'express-session' {
  interface SessionData {
    selectedRepo?: {
      owner: string;
      name: string;
      fullName: string;
    };
  }
}
