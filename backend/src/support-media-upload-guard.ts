import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

export function supportMediaEnabledForEnvironment(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

@Injectable()
export class SupportMediaUploadGuard implements CanActivate {
  constructor(
    private readonly requireUploadRole: (request: unknown) => void,
    private readonly requireStorage: () => unknown,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    this.requireUploadRole(context.switchToHttp().getRequest());
    this.requireStorage();
    return true;
  }
}
