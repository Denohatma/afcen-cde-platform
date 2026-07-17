from __future__ import annotations
from fastapi import APIRouter

router = APIRouter(tags=["auth"])

ROLES = {
    "developer": {
        "label": "Developer",
        "description": "Project developer — create projects, upload deliverables, track progress",
        "permissions": ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "versions.read", "flags.read", "dataroom.read"],
    },
    "consultant": {
        "label": "Consultant",
        "description": "External consultant — upload deliverables, respond to review flags",
        "permissions": ["projects.read", "deliverables.read", "deliverables.upload", "deliverables.transition", "versions.read", "flags.read", "flags.respond", "extractions.read"],
    },
    "afcen_lead": {
        "label": "AfCEN Lead",
        "description": "AfCEN project manager — full platform access, review and publish deliverables",
        "permissions": ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "deliverables.transition", "deliverables.publish", "versions.read", "flags.read", "flags.resolve", "extractions.read", "extractions.confirm", "benchmarks.read", "benchmarks.manage", "dataroom.read", "dataroom.manage", "intelligence.read", "export.read", "audit.read"],
    },
    "investor": {
        "label": "Investor",
        "description": "Investor / stakeholder — read-only data room and published deliverable access",
        "permissions": ["projects.read", "deliverables.read", "dataroom.read", "intelligence.read"],
    },
}


@router.get("/auth/roles")
async def list_roles():
    return [{"key": k, **v} for k, v in ROLES.items()]


@router.get("/auth/roles/{role_key}")
async def get_role(role_key: str):
    role = ROLES.get(role_key)
    if not role:
        return {"error": "Unknown role"}
    return {"key": role_key, **role}
