export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.originalUrl} was not found.`
    }
  });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);

  const body = {
    error: {
      code: error.code ?? "INTERNAL_SERVER_ERROR",
      message:
        error.expose || (error.statusCode && error.statusCode < 500)
          ? error.message
          : "The server could not complete the request."
    }
  };

  if (
    error.details &&
    (error.expose || (error.statusCode && error.statusCode < 500))
  ) {
    body.error.details = error.details;
  }

  response.status(error.statusCode ?? 500).json(body);
}