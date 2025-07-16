
export interface User {
  id: string;
  name: string;
  email: string;
  // Missing: age, isActive
  // Extra: createdAt
  createdAt: Date;
}

export default User;
