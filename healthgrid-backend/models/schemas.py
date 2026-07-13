"""
models/schemas.py — Pydantic request and response models for the HealthGrid API.

These schemas serve two purposes:
1. Input validation — FastAPI automatically validates incoming JSON against these models
   and returns a clear 422 error if the shape is wrong. This saves us from writing
   manual validation logic.
2. Documentation — FastAPI generates OpenAPI docs (/docs) directly from these models,
   so the API is self-documenting with zero extra work.
"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """
    The body shape expected by POST /api/chat.

    conversation_id: a client-generated or hardcoded string that groups messages
        into a single thread. Today it's hardcoded on the frontend ("conv-001"),
        but in v2 it will be a UUID generated per session after auth is added.

    message: the raw text the user typed. Anthropic expects this as a 'user' role
        message in the messages array.
    """

    conversation_id: str = Field(
        ...,
        description="Unique ID grouping all messages in this conversation thread.",
        examples=["conv-001"],
    )
    message: str = Field(
        ...,
        min_length=1,
        description="The user's message text.",
        examples=["What are the biggest cost drivers in our ICU unit?"],
    )


class ChatResponse(BaseModel):
    """
    Shape of a non-streaming response (used for error cases and health checks).
    The actual chat route streams SSE, so this model is used primarily for
    documenting the logical shape and for error responses.
    """

    conversation_id: str
    role: str  # will always be "assistant" in normal responses
    content: str
