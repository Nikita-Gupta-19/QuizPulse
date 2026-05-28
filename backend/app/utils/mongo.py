from bson import ObjectId
from typing import Annotated
from pydantic import BeforeValidator, PlainSerializer, WithJsonSchema

def validate_object_id(v: any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")

# Fully compliant Pydantic v2 type representing ObjectId as a string schema
PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
    PlainSerializer(lambda v: str(v), return_type=str),
    WithJsonSchema({"type": "string"}, mode="serialization")
]

def parse_id(id_str: str) -> ObjectId:
    if not ObjectId.is_valid(id_str):
        raise ValueError(f"Invalid ObjectId format: {id_str}")
    return ObjectId(id_str)
