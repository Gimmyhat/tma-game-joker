import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTournamentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
