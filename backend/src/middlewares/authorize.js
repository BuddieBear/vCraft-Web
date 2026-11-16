import { ApiError } from "./api-error.js";
export function authorize(...roles) {
    return (request, _response, next) => {
        if (!request.user || !roles.includes(request.user.role)) throw new ApiError(403, "FORBIDDEN", "Không có quyền thực hiện thao tác.");
        next();
    };
}
