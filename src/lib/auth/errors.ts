import type { Role } from "@/generated/prisma/enums";

export type Actor = { id: string; role: Role };

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
export class ValidationFailure extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ValidationFailure";
  }
}

export function assertAdmin(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor || actor.role !== "ADMIN") throw new ForbiddenError();
}
