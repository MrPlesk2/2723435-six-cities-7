import { CreateUserDto } from './create-user.dto.js';

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>>;
