export class BuilderServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'BuilderServiceError'
  }
}

export class BuilderUnauthorizedError extends BuilderServiceError {
  constructor() {
    super('builder_unauthorized', 401, 'Authentication is required')
  }
}

export class BuilderForbiddenError extends BuilderServiceError {
  constructor(code = 'builder_forbidden', message = 'Builder operation is not allowed') {
    super(code, 403, message)
  }
}

export class BuilderConflictError extends BuilderServiceError {
  constructor() {
    super('builder_version_conflict', 409, 'Builder target has changed; reload before saving')
  }
}

export class BuilderNotFoundError extends BuilderServiceError {
  constructor(message = 'Builder target or revision was not found') {
    super('builder_not_found', 404, message)
  }
}

export class BuilderInvalidDocumentError extends BuilderServiceError {
  constructor(message = 'Builder document is invalid') {
    super('builder_invalid_document', 400, message)
  }
}
