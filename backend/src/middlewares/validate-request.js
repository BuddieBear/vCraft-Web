export function validate({ body, params, query } = {}) {
    return (request, _response, next) => {
        if (body) request.validatedBody = body.parse(request.body);
        if (params) request.validatedParams = params.parse(request.params);
        if (query) request.validatedQuery = query.parse(request.query);
        next();
    };
}
