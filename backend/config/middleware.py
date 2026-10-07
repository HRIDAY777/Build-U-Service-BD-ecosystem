import uuid
from rest_framework.views import exception_handler as drf_handler


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = str(uuid.uuid4())
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response


def exception_handler(exc, context):
    response = drf_handler(exc, context)
    if response is not None:
        response.data = {
            "error": response.data,
            "request_id": getattr(context["request"], "request_id", None),
        }
    return response
