interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatarUrl?: string;
    preferences?: Record<string, any>;
  }